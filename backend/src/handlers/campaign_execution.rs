use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::database::{DbPool, models::*};
use crate::utils::email::EmailSender;
use crate::utils::tracking::process_email_template;
use chrono::Utc;

#[derive(Deserialize)]
pub struct LaunchCampaignRequest {
    pub recipient_ids: Vec<String>,
    pub phishing_target_url: Option<String>,
}

/// 启动活动并发送邮件
pub async fn launch_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
    req: web::Json<LaunchCampaignRequest>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    // 获取活动信息
    let campaign = match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "活动不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询活动失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "启动活动失败"
            })));
        }
    };
    
    // 检查是否有模板
    let template_id = match &campaign.template_id {
        Some(id) if !id.is_empty() => id,
        _ => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "error": "活动未关联邮件模板"
            })));
        }
    };
    
    // 获取模板
    let template = match sqlx::query_as!(
        Template,
        "SELECT * FROM templates WHERE id = ?",
        template_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(t)) => t,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "邮件模板不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询模板失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "启动活动失败"
            })));
        }
    };
    
    // 添加收件人到活动
    for recipient_id in &req.recipient_ids {
        let _ = sqlx::query!(
            "INSERT IGNORE INTO campaign_recipients (campaign_id, recipient_id, email_sent, email_opened, link_clicked, reported) VALUES (?, ?, FALSE, FALSE, FALSE, FALSE)",
            campaign_id,
            recipient_id
        ).execute(pool.get_ref()).await;
    }
    
    // 获取收件人列表
    let recipients = match sqlx::query_as!(
        Recipient,
        "SELECT r.* FROM recipients r INNER JOIN campaign_recipients cr ON r.id = cr.recipient_id WHERE cr.campaign_id = ? AND cr.email_sent = FALSE",
        campaign_id
    ).fetch_all(pool.get_ref()).await {
        Ok(recipients) => recipients,
        Err(e) => {
            eprintln!("查询收件人失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取收件人列表失败"
            })));
        }
    };
    
    if recipients.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "error": "没有待发送的收件人"
        })));
    }
    
    // 更新活动状态为active
    let _ = sqlx::query!(
        "UPDATE campaigns SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        campaign_id
    ).execute(pool.get_ref()).await;
    
    // 在后台异步发送邮件
    let pool_clone = pool.clone();
    let campaign_id_clone = campaign_id.clone();
    let template_clone = template.clone();
    let target_url = req.phishing_target_url.clone()
        .unwrap_or_else(|| "https://example.com/phishing-test".to_string());
    
    tokio::spawn(async move {
        send_campaign_emails(
            pool_clone,
            campaign_id_clone,
            template_clone,
            recipients,
            target_url,
        ).await;
    });
    
    Ok(HttpResponse::Ok().json(json!({
        "message": "活动已启动，正在后台发送邮件",
        "campaign_id": campaign_id,
        "total_recipients": req.recipient_ids.len()
    })))
}

/// 后台邮件发送任务
async fn send_campaign_emails(
    pool: web::Data<DbPool>,
    campaign_id: String,
    template: Template,
    recipients: Vec<Recipient>,
    phishing_target_url: String,
) {
    log::info!("开始发送活动 {} 的邮件，共 {} 个收件人", campaign_id, recipients.len());
    
    // 创建邮件发送器
    let sender = match EmailSender::from_env() {
        Ok(s) => s,
        Err(e) => {
            log::error!("创建邮件发送器失败: {}", e);
            return;
        }
    };
    
    let mut success_count = 0;
    let mut failed_count = 0;
    
    for recipient in recipients {
        // 处理邮件模板
        let personalized_content = process_email_template(
            &template.content,
            &campaign_id,
            &recipient.id,
            &recipient.name,
            &recipient.email,
            &phishing_target_url,
        );
        
        // 发送邮件
        match sender.send_html_email(
            &recipient.email,
            &recipient.name,
            &template.subject,
            &personalized_content,
            None,
        ).await {
            Ok(_) => {
                // 更新发送状态
                let now = Utc::now();
                let _ = sqlx::query!(
                    "UPDATE campaign_recipients SET email_sent = TRUE, sent_at = ? WHERE campaign_id = ? AND recipient_id = ?",
                    now,
                    campaign_id,
                    recipient.id
                ).execute(pool.get_ref()).await;
                
                success_count += 1;
                log::info!("✓ 已发送邮件到 {} ({})", recipient.name, recipient.email);
            }
            Err(e) => {
                failed_count += 1;
                log::error!("✗ 发送邮件失败 {} ({}): {}", recipient.name, recipient.email, e);
            }
        }
        
        // 发送间隔（防止被识别为垃圾邮件）
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }
    
    log::info!("活动 {} 邮件发送完成: 成功 {}, 失败 {}", campaign_id, success_count, failed_count);
    
    // 如果全部发送完成，更新活动状态
    if failed_count == 0 {
        let _ = sqlx::query!(
            "UPDATE campaigns SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            campaign_id
        ).execute(pool.get_ref()).await;
    }
}

/// 测试邮件发送
#[derive(Deserialize)]
pub struct TestEmailRequest {
    pub test_email: String,
    pub test_name: String,
}

pub async fn test_email(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
    req: web::Json<TestEmailRequest>,
) -> Result<HttpResponse> {
    let template_id = path.into_inner();
    
    // 获取模板
    let template = match sqlx::query_as!(
        Template,
        "SELECT * FROM templates WHERE id = ?",
        template_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(t)) => t,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "模板不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询模板失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询模板失败"
            })));
        }
    };
    
    // 创建测试邮件内容（不包含追踪）
    let mut test_content = template.content.clone();
    test_content = test_content.replace("{{recipient_name}}", &req.test_name);
    test_content = test_content.replace("{{name}}", &req.test_name);
    test_content = test_content.replace("{{recipient_email}}", &req.test_email);
    test_content = test_content.replace("{{email}}", &req.test_email);
    test_content = test_content.replace("{{phishing_link}}", "https://example.com/test-link");
    
    // 创建邮件发送器
    let sender = match EmailSender::from_env() {
        Ok(s) => s,
        Err(e) => {
            log::error!("创建邮件发送器失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "邮件服务配置错误"
            })));
        }
    };
    
    // 发送测试邮件
    match sender.send_html_email(
        &req.test_email,
        &req.test_name,
        &format!("[测试] {}", template.subject),
        &test_content,
        None,
    ).await {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(json!({
                "message": "测试邮件发送成功"
            })))
        }
        Err(e) => {
            log::error!("发送测试邮件失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "测试邮件发送失败",
                "details": format!("{}", e)
            })))
        }
    }
}

/// 暂停活动
pub async fn pause_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query!(
        "UPDATE campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "活动已暂停"
                })))
            } else {
                Ok(HttpResponse::BadRequest().json(json!({
                    "error": "活动不存在或未在运行中"
                })))
            }
        }
        Err(e) => {
            eprintln!("暂停活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "暂停活动失败"
            })))
        }
    }
}

/// 停止活动
pub async fn stop_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query!(
        "UPDATE campaigns SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(json!({
                "message": "活动已停止"
            })))
        }
        Err(e) => {
            eprintln!("停止活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "停止活动失败"
            })))
        }
    }
}

