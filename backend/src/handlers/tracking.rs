use actix_web::{web, HttpResponse, HttpRequest, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use chrono::Utc;
use crate::database::DbPool;
use crate::utils::tracking::{parse_tracking_id, TRACKING_PIXEL_GIF};
use crate::utils::user_agent::extract_client_info;

/// 追踪邮件打开（tracking pixel - 增强版）
pub async fn track_pixel(
    path: web::Path<String>,
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let tracking_id = path.into_inner();
    
    // 提取客户端信息
    let client_info = extract_client_info(&req);
    
    // 解析tracking_id
    if let Some((campaign_id, recipient_id)) = parse_tracking_id(&tracking_id) {
        let now = Utc::now();
        
        // 更新数据库 - 记录详细信息（只在首次打开时记录）
        let _ = sqlx::query!(
            r#"UPDATE campaign_recipients 
               SET email_opened = TRUE, 
                   opened_at = ?,
                   opened_ip = ?,
                   opened_user_agent = ?,
                   opened_device_type = ?,
                   opened_os = ?,
                   opened_browser = ?
               WHERE campaign_id = ? AND recipient_id = ? AND email_opened = FALSE"#,
            now,
            client_info.ip,
            client_info.user_agent,
            client_info.device_type,
            client_info.os,
            client_info.browser,
            campaign_id,
            recipient_id
        ).execute(pool.get_ref()).await;
        
        log::info!(
            "📧 Email opened - Campaign: {}, Recipient: {}, IP: {}, Device: {} {}, Browser: {}",
            campaign_id, recipient_id, client_info.ip, 
            client_info.device_type, client_info.os, client_info.browser
        );
    }
    
    // 返回1x1透明GIF
    Ok(HttpResponse::Ok()
        .content_type("image/gif")
        .insert_header(("Cache-Control", "no-cache, no-store, must-revalidate"))
        .insert_header(("Pragma", "no-cache"))
        .insert_header(("Expires", "0"))
        .body(TRACKING_PIXEL_GIF))
}

#[derive(Deserialize)]
pub struct ClickQuery {
    pub redirect: Option<String>,
}

/// 追踪链接点击（增强版）
pub async fn track_click(
    path: web::Path<String>,
    query: web::Query<ClickQuery>,
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let tracking_id = path.into_inner();
    
    // 提取客户端信息
    let client_info = extract_client_info(&req);
    
    // 解析tracking_id
    if let Some((campaign_id, recipient_id)) = parse_tracking_id(&tracking_id) {
        let now = Utc::now();
        
        // 更新数据库 - 记录详细信息
        let _ = sqlx::query!(
            r#"UPDATE campaign_recipients 
               SET link_clicked = TRUE, 
                   clicked_at = ?, 
                   clicked_ip = ?,
                   clicked_user_agent = ?,
                   clicked_device_type = ?,
                   clicked_os = ?,
                   clicked_browser = ?,
                   clicked_location = ?,
                   email_opened = TRUE 
               WHERE campaign_id = ? AND recipient_id = ?"#,
            now,
            client_info.ip,
            client_info.user_agent,
            client_info.device_type,
            client_info.os,
            client_info.browser,
            client_info.location,
            campaign_id,
            recipient_id
        ).execute(pool.get_ref()).await;
        
        log::info!(
            "🔗 Link clicked - Campaign: {}, Recipient: {}, IP: {}, Device: {} {}, Browser: {}, Location: {:?}",
            campaign_id, recipient_id, client_info.ip, 
            client_info.device_type, client_info.os, client_info.browser, client_info.location
        );
    }
    
    // 重定向到目标URL或显示警告页面
    if let Some(redirect_url) = &query.redirect {
        Ok(HttpResponse::Found()
            .insert_header(("Location", redirect_url.as_str()))
            .finish())
    } else {
        // 显示钓鱼测试警告页面
        Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(WARNING_PAGE_HTML))
    }
}

/// 追踪用户主动报告钓鱼邮件
pub async fn track_report(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let tracking_id = path.into_inner();
    
    if let Some((campaign_id, recipient_id)) = parse_tracking_id(&tracking_id) {
        let now = Utc::now();
        let result = sqlx::query!(
            "UPDATE campaign_recipients SET reported = TRUE, reported_at = ? WHERE campaign_id = ? AND recipient_id = ?",
            now,
            campaign_id,
            recipient_id
        ).execute(pool.get_ref()).await;
        
        match result {
            Ok(_) => {
                log::info!("🚨 Phishing reported - Campaign: {}, Recipient: {}", campaign_id, recipient_id);
                Ok(HttpResponse::Ok().json(json!({
                    "message": "感谢您的报告！这是一次安全意识测试。"
                })))
            }
            Err(e) => {
                eprintln!("更新报告状态失败: {}", e);
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "记录报告失败"
                })))
            }
        }
    } else {
        Ok(HttpResponse::BadRequest().json(json!({
            "error": "无效的追踪ID"
        })))
    }
}

/// 获取活动的追踪统计
pub async fn get_tracking_stats(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    let stats = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total,
            CAST(SUM(CASE WHEN email_sent = TRUE THEN 1 ELSE 0 END) AS SIGNED) as `sent!: i64`,
            CAST(SUM(CASE WHEN email_opened = TRUE THEN 1 ELSE 0 END) AS SIGNED) as `opened!: i64`,
            CAST(SUM(CASE WHEN link_clicked = TRUE THEN 1 ELSE 0 END) AS SIGNED) as `clicked!: i64`,
            CAST(SUM(CASE WHEN reported = TRUE THEN 1 ELSE 0 END) AS SIGNED) as `reported!: i64`
        FROM campaign_recipients
        WHERE campaign_id = ?
        "#,
        campaign_id
    ).fetch_one(pool.get_ref()).await;
    
    match stats {
        Ok(row) => {
            let total = row.total as f64;
            let sent = row.sent as f64;
            let opened = row.opened as f64;
            let clicked = row.clicked as f64;
            let reported = row.reported as f64;
            
            Ok(HttpResponse::Ok().json(json!({
                "campaign_id": campaign_id,
                "total_recipients": total,
                "emails_sent": sent,
                "emails_opened": opened,
                "links_clicked": clicked,
                "emails_reported": reported,
                "open_rate": if sent > 0.0 { (opened / sent) * 100.0 } else { 0.0 },
                "click_rate": if sent > 0.0 { (clicked / sent) * 100.0 } else { 0.0 },
                "report_rate": if sent > 0.0 { (reported / sent) * 100.0 } else { 0.0 }
            })))
        }
        Err(e) => {
            eprintln!("获取追踪统计失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取统计数据失败"
            })))
        }
    }
}

const WARNING_PAGE_HTML: &str = r#"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>安全意识测试提醒</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            padding: 50px;
            text-align: center;
        }
        .warning-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #e74c3c;
            font-size: 32px;
            margin-bottom: 20px;
        }
        p {
            color: #555;
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .highlight {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .tips {
            background: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .tips h3 {
            color: #0c5460;
            margin-bottom: 10px;
        }
        .tips ul {
            list-style-position: inside;
            color: #0c5460;
        }
        .tips li {
            margin: 5px 0;
        }
        .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="warning-icon">⚠️</div>
        <h1>这是一次钓鱼邮件测试！</h1>
        <p>恭喜您发现了这个可疑链接！但如果这是真实的钓鱼攻击，您可能已经处于危险之中。</p>
        
        <div class="highlight">
            <strong>📧 您刚才点击的是模拟钓鱼链接</strong><br>
            这是公司进行的安全意识培训的一部分，目的是帮助您识别和防范真实的钓鱼攻击。
        </div>

        <div class="tips">
            <h3>🛡️ 如何识别钓鱼邮件？</h3>
            <ul>
                <li>检查发件人邮箱地址是否可疑</li>
                <li>警惕要求紧急操作的邮件</li>
                <li>不要点击未知来源的链接</li>
                <li>鼠标悬停查看链接真实地址</li>
                <li>对索要敏感信息的邮件保持警惕</li>
                <li>发现可疑邮件及时向IT部门报告</li>
            </ul>
        </div>

        <p>记住：在网络安全中，<strong>警惕性</strong>是您最好的防护！</p>
    </div>
</body>
</html>
"#;

/// 获取活动的详细追踪信息（包含所有收件人的详细数据）
pub async fn get_detailed_tracking(
    path: web::Path<String>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    use crate::database::models::CampaignRecipient;
    
    let recipients_result = sqlx::query_as!(
        CampaignRecipient,
        r#"SELECT 
            campaign_id,
            recipient_id,
            COALESCE(email_sent, 0) as "email_sent: bool",
            sent_at,
            COALESCE(email_opened, 0) as "email_opened: bool",
            opened_at,
            opened_ip,
            opened_user_agent,
            opened_device_type,
            opened_os,
            opened_browser,
            COALESCE(link_clicked, 0) as "link_clicked: bool",
            clicked_at,
            clicked_ip,
            clicked_user_agent,
            clicked_device_type,
            clicked_os,
            clicked_browser,
            clicked_location,
            COALESCE(reported, 0) as "reported: bool",
            reported_at
        FROM campaign_recipients
        WHERE campaign_id = ?
        ORDER BY clicked_at DESC, opened_at DESC"#,
        campaign_id
    ).fetch_all(pool.get_ref()).await;
    
    match recipients_result {
        Ok(data) => {
            log::info!("📊 Retrieved detailed tracking for campaign: {}, {} recipients", campaign_id, data.len());
            Ok(HttpResponse::Ok().json(json!({
                "campaign_id": campaign_id,
                "total": data.len(),
                "recipients": data
            })))
        },
        Err(e) => {
            log::error!("获取详细追踪信息失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取追踪数据失败"
            })))
        }
    }
}

