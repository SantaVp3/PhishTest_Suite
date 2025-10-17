use actix_web::{web, HttpResponse, Result};
use serde_json::json;
use uuid::Uuid;
use crate::database::{DbPool, models::*};

pub async fn get_campaigns(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(campaigns) => {
            Ok(HttpResponse::Ok().json(json!({
                "campaigns": campaigns,
                "total": campaigns.len()
            })))
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取活动列表失败"
            })))
        }
    }
}

pub async fn create_campaign(
    pool: web::Data<DbPool>,
    req: web::Json<CreateCampaignRequest>
) -> Result<HttpResponse> {
    let campaign_id = Uuid::new_v4().to_string();
    
    // 如果提供了template_id且不为空，验证它是否存在
    if let Some(template_id) = &req.template_id {
        if !template_id.is_empty() {
            let template_exists = sqlx::query!(
                "SELECT id FROM templates WHERE id = ?",
                template_id
            ).fetch_optional(pool.get_ref()).await;
            
            match template_exists {
                Ok(Some(_)) => {
                    // 模板存在，继续
                }
                Ok(None) => {
                    return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                        "error": "指定的模板不存在"
                    })));
                }
                Err(e) => {
                    eprintln!("验证模板时出错: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "验证模板时出错"
                    })));
                }
            }
        }
    }
    
    // 如果template_id为空字符串，设置为NULL
    let template_id = req.template_id.as_ref()
        .filter(|id| !id.is_empty())
        .map(|id| id.as_str());
    
    match sqlx::query!(
        "INSERT INTO campaigns (id, name, description, template_id, status) VALUES (?, ?, ?, ?, ?)",
        campaign_id,
        req.name,
        req.description,
        template_id,
        "draft"
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取刚创建的活动
            match sqlx::query_as!(
                Campaign,
                "SELECT * FROM campaigns WHERE id = ?",
                campaign_id
            ).fetch_one(pool.get_ref()).await {
                Ok(campaign) => {
                    Ok(HttpResponse::Created().json(json!({
                        "message": "活动创建成功",
                        "campaign": campaign
                    })))
                }
                Err(e) => {
                    eprintln!("获取新创建活动失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "活动创建失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("创建活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "活动创建失败"
            })))
        }
    }
}

pub async fn get_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(campaign) => Ok(HttpResponse::Ok().json(campaign)),
        Err(sqlx::Error::RowNotFound) => Ok(HttpResponse::NotFound().json(json!({
            "error": "活动不存在"
        }))),
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取活动失败"
            })))
        }
    }
}

pub async fn update_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
    req: web::Json<UpdateCampaignRequest>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    // 检查活动是否存在
    let existing_campaign = match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(campaign)) => campaign,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "活动不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询活动失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询活动失败"
            })));
        }
    };
    
    // 使用现有值或新值
    let default_name = existing_campaign.name.unwrap_or_default();
    let name = req.name.as_ref().unwrap_or(&default_name);
    let description = req.description.as_ref().or(existing_campaign.description.as_ref());
    let template_id = req.template_id.as_ref().or(existing_campaign.template_id.as_ref());
    let default_status = existing_campaign.status.unwrap_or_else(|| "draft".to_string());
    let status = req.status.as_ref().unwrap_or(&default_status);
    
    // 执行更新
    match sqlx::query!(
        "UPDATE campaigns SET name = ?, description = ?, template_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        name,
        description,
        template_id,
        status,
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取更新后的活动
            match sqlx::query_as!(
                Campaign,
                "SELECT * FROM campaigns WHERE id = ?",
                campaign_id
            ).fetch_one(pool.get_ref()).await {
                Ok(campaign) => {
                    Ok(HttpResponse::Ok().json(json!({
                        "message": "活动更新成功",
                        "campaign": campaign
                    })))
                }
                Err(e) => {
                    eprintln!("获取更新后活动失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "活动更新失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("更新活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "活动更新失败"
            })))
        }
    }
}

pub async fn delete_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query!(
        "DELETE FROM campaigns WHERE id = ?",
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": "活动不存在"
                })))
            } else {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "活动删除成功"
                })))
            }
        }
        Err(e) => {
            eprintln!("删除活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "活动删除失败"
            })))
        }
    }
}

pub async fn get_campaign_stats(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    // 检查活动是否存在
    match sqlx::query!(
        "SELECT id FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(_) => {},
        Err(sqlx::Error::RowNotFound) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "活动不存在"
            })));
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取活动统计失败"
            })));
        }
    }
    
    // 获取统计数据
    let total_recipients = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let emails_sent = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND email_sent = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let emails_opened = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND email_opened = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let links_clicked = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND link_clicked = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let success_rate = if emails_sent > 0 {
        (links_clicked as f64 / emails_sent as f64) * 100.0
    } else {
        0.0
    };
    
    let stats = json!({
        "total_recipients": total_recipients,
        "emails_sent": emails_sent,
        "emails_opened": emails_opened,
        "links_clicked": links_clicked,
        "success_rate": success_rate
    });
    
    Ok(HttpResponse::Ok().json(json!({
        "campaign_id": campaign_id,
        "stats": stats
    })))
}

pub async fn start_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query!(
        "UPDATE campaigns SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'",
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Ok(HttpResponse::BadRequest().json(json!({
                    "error": "活动不存在或已经启动"
                })))
            } else {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "活动启动成功"
                })))
            }
        }
        Err(e) => {
            eprintln!("启动活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "活动启动失败"
            })))
        }
    }
}

pub async fn pause_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    match sqlx::query!(
        "UPDATE campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
        campaign_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Ok(HttpResponse::BadRequest().json(json!({
                    "error": "活动不存在或未在运行中"
                })))
            } else {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "活动暂停成功"
                })))
            }
        }
        Err(e) => {
            eprintln!("暂停活动失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "活动暂停失败"
            })))
        }
    }
}

pub async fn add_recipients_to_campaign(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
    req: web::Json<AddRecipientsRequest>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    // 检查活动是否存在
    match sqlx::query!(
        "SELECT id FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(_) => {},
        Err(sqlx::Error::RowNotFound) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "活动不存在"
            })));
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "添加收件人失败"
            })));
        }
    }
    
    let mut added_count = 0;
    let mut errors = Vec::new();
    
    for recipient_id in &req.recipient_ids {
        // 检查收件人是否存在
        let recipient_exists = match sqlx::query!(
            "SELECT id FROM recipients WHERE id = ?",
            recipient_id
        ).fetch_one(pool.get_ref()).await {
            Ok(_) => true,
            Err(_) => false
        };
        
        if !recipient_exists {
            errors.push(format!("收件人 {} 不存在", recipient_id));
            continue;
        }
        
        // 添加到活动
        match sqlx::query!(
            "INSERT IGNORE INTO campaign_recipients (campaign_id, recipient_id) VALUES (?, ?)",
            campaign_id,
            recipient_id
        ).execute(pool.get_ref()).await {
            Ok(_) => {
                added_count += 1;
            }
            Err(e) => {
                eprintln!("添加收件人 {} 失败: {}", recipient_id, e);
                errors.push(format!("添加收件人 {} 失败", recipient_id));
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(json!({
        "message": format!("成功添加 {} 个收件人到活动", added_count),
        "added_count": added_count,
        "errors": errors
    })))
}