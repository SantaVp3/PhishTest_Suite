use actix_web::{web, HttpResponse, Result};
use serde::Deserialize;
use serde_json::json;
use chrono::{DateTime, Utc};
use crate::database::{DbPool, models::*};

pub async fn get_analytics(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    // 获取基本统计数据
    let total_campaigns = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaigns"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let active_campaigns = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let total_recipients = match sqlx::query!(
        "SELECT COUNT(*) as count FROM recipients"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    // 获取活动统计数据 - 简化查询
    let sent_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE email_sent = 1"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let opened_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE email_opened = 1"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let clicked_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE link_clicked = 1"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let overall_success_rate = if sent_count > 0 {
        (clicked_count as f64 / sent_count as f64) * 100.0
    } else {
        0.0
    };
    
    // 获取部门统计
    let department_stats = match sqlx::query!(
        "SELECT department, COUNT(*) as count FROM recipients GROUP BY department"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                json!({
                    "department": row.department,
                    "recipients": row.count,
                    "sent": 0,
                    "opened": 0,
                    "clicked": 0,
                    "success_rate": 0.0
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    // 获取真实的月度统计数据
    let monthly_stats = match sqlx::query!(
        r#"
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as campaigns
        FROM campaigns 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
        "#
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                json!({
                    "month": row.month,
                    "campaigns": row.campaigns,
                    "emails_sent": 0,
                    "emails_opened": 0,
                    "links_clicked": 0,
                    "success_rate": 0.0
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    let dashboard = json!({
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "total_recipients": total_recipients,
        "total_emails_sent": sent_count,
        "total_emails_opened": opened_count,
        "total_links_clicked": clicked_count,
        "overall_success_rate": overall_success_rate,
        "monthly_stats": monthly_stats,
        "department_stats": department_stats
    });
    
    Ok(HttpResponse::Ok().json(json!({
        "dashboard": dashboard
    })))
}

pub async fn get_campaign_analytics(
    path: web::Path<String>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    
    // 获取活动信息
    let campaign = match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns WHERE id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(campaign) => campaign,
        Err(_) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "活动不存在"
            })));
        }
    };
    
    // 获取活动统计
    let sent_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND email_sent = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let opened_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND email_opened = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let clicked_count = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND link_clicked = 1",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let total_recipients = match sqlx::query!(
        "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ?",
        campaign_id
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    let success_rate = if sent_count > 0 {
        (clicked_count as f64 / sent_count as f64) * 100.0
    } else {
        0.0
    };
    
    // 获取部门分解数据
    let department_breakdown = match sqlx::query!(
        r#"
        SELECT 
            r.department,
            COUNT(r.id) as recipients,
            COUNT(CASE WHEN cr.email_sent = 1 THEN 1 END) as sent,
            COUNT(CASE WHEN cr.email_opened = 1 THEN 1 END) as opened,
            COUNT(CASE WHEN cr.link_clicked = 1 THEN 1 END) as clicked
        FROM recipients r
        LEFT JOIN campaign_recipients cr ON r.id = cr.recipient_id AND cr.campaign_id = ?
        GROUP BY r.department
        "#,
        campaign_id
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                let dept_success_rate = if row.sent > 0 {
                    (row.clicked as f64 / row.sent as f64) * 100.0
                } else {
                    0.0
                };
                json!({
                    "department": row.department,
                    "recipients": row.recipients,
                    "sent": row.sent,
                    "opened": row.opened,
                    "clicked": row.clicked,
                    "success_rate": dept_success_rate
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    // 获取真实的时间线数据 - 使用活动创建时间作为基准
    let timeline = match sqlx::query!(
        r#"
        SELECT 
            DATE(c.created_at) as date,
            COUNT(CASE WHEN cr.email_sent = 1 THEN 1 END) as emails_sent,
            COUNT(CASE WHEN cr.email_opened = 1 THEN 1 END) as emails_opened,
            COUNT(CASE WHEN cr.link_clicked = 1 THEN 1 END) as links_clicked
        FROM campaigns c
        LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
        WHERE c.id = ?
        GROUP BY DATE(c.created_at)
        ORDER BY date DESC
        LIMIT 30
        "#,
        campaign_id
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                json!({
                    "date": row.date,
                    "emails_sent": row.emails_sent,
                    "emails_opened": row.emails_opened,
                    "links_clicked": row.links_clicked
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    let analytics = json!({
        "campaign_id": campaign.id,
        "name": campaign.name,
        "total_recipients": total_recipients,
        "emails_sent": sent_count,
        "emails_opened": opened_count,
        "links_clicked": clicked_count,
        "success_rate": success_rate,
        "department_breakdown": department_breakdown,
        "timeline": timeline
    });
    
    Ok(HttpResponse::Ok().json(analytics))
}

pub async fn get_department_analytics(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let department_stats = match sqlx::query!(
        r#"
        SELECT 
            r.department,
            COUNT(r.id) as recipients,
            COUNT(CASE WHEN cr.email_sent = 1 THEN 1 END) as sent,
            COUNT(CASE WHEN cr.email_opened = 1 THEN 1 END) as opened,
            COUNT(CASE WHEN cr.link_clicked = 1 THEN 1 END) as clicked
        FROM recipients r
        LEFT JOIN campaign_recipients cr ON r.id = cr.recipient_id
        GROUP BY r.department
        "#
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                let success_rate = if row.sent > 0 {
                    (row.clicked as f64 / row.sent as f64) * 100.0
                } else {
                    0.0
                };
                json!({
                    "department": row.department,
                    "recipients": row.recipients,
                    "sent": row.sent,
                    "opened": row.opened,
                    "clicked": row.clicked,
                    "success_rate": success_rate
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    Ok(HttpResponse::Ok().json(json!({
        "department_stats": department_stats
    })))
}

pub async fn get_risk_analytics(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let risk_stats = match sqlx::query!(
        "SELECT risk_level, COUNT(*) as count FROM recipients GROUP BY risk_level"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            let total_recipients: i64 = rows.iter().map(|r| r.count).sum();
            rows.into_iter().map(|row| {
                let percentage = if total_recipients > 0 {
                    (row.count as f64 / total_recipients as f64) * 100.0
                } else {
                    0.0
                };
                json!({
                    "risk_level": row.risk_level,
                    "count": row.count,
                    "percentage": percentage
                })
            }).collect::<Vec<_>>()
        }
        Err(_) => Vec::new()
    };
    
    let total_recipients = match sqlx::query!(
        "SELECT COUNT(*) as count FROM recipients"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(_) => 0
    };
    
    Ok(HttpResponse::Ok().json(json!({
        "risk_stats": risk_stats,
        "total_recipients": total_recipients
    })))
}

#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub department: Option<String>,
    pub campaign_id: Option<String>,
}

pub async fn export_analytics_report(
    query: web::Query<AnalyticsQuery>,
    pool: web::Data<DbPool>
) -> Result<HttpResponse> {
    let campaigns = match sqlx::query_as!(
        Campaign,
        "SELECT * FROM campaigns ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(campaigns) => campaigns,
        Err(_) => Vec::new()
    };
    
    let recipients = match sqlx::query_as!(
        Recipient,
        "SELECT * FROM recipients ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(recipients) => recipients,
        Err(_) => Vec::new()
    };
    
    let templates = match sqlx::query_as!(
        Template,
        "SELECT * FROM templates ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(templates) => templates,
        Err(_) => Vec::new()
    };
    
    let active_campaigns_count = campaigns.iter()
        .filter(|c| c.status.as_ref().map_or(false, |s| s == "active"))
        .count();
    
    let report = json!({
        "report_generated_at": Utc::now(),
        "filters": {
            "start_date": query.start_date,
            "end_date": query.end_date,
            "department": query.department,
            "campaign_id": query.campaign_id
        },
        "summary": {
            "total_campaigns": campaigns.len(),
            "total_recipients": recipients.len(),
            "total_templates": templates.len(),
            "active_campaigns": active_campaigns_count
        },
        "campaigns": campaigns,
        "recipients": recipients
    });
    
    Ok(HttpResponse::Ok()
        .insert_header(("Content-Type", "application/json"))
        .insert_header(("Content-Disposition", "attachment; filename=\"phishing_analytics_report.json\""))
        .json(report))
}