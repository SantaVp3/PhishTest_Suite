use actix_web::{web, HttpResponse, Result};
use sqlx::MySqlPool;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailSettings {
    #[serde(rename = "smtpHost")]
    pub smtp_host: String,
    #[serde(rename = "smtpPort")]
    pub smtp_port: String,
    #[serde(rename = "smtpUser")]
    pub smtp_user: String,
    #[serde(rename = "smtpPassword")]
    pub smtp_password: String,
    #[serde(rename = "sslEnabled")]
    pub ssl_enabled: bool,
    #[serde(rename = "sendRate")]
    pub send_rate: String,
    #[serde(rename = "batchSize")]
    pub batch_size: String,
    #[serde(rename = "senderName")]
    pub sender_name: String,
    #[serde(rename = "senderEmail")]
    pub sender_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    #[serde(rename = "dataEncryption")]
    pub data_encryption: bool,
    #[serde(rename = "transportEncryption")]
    pub transport_encryption: bool,
    #[serde(rename = "sessionTimeout")]
    pub session_timeout: String,
    #[serde(rename = "maxLoginAttempts")]
    pub max_login_attempts: String,
    #[serde(rename = "twoFactorAuth")]
    pub two_factor_auth: bool,
    #[serde(rename = "ipWhitelist")]
    pub ip_whitelist: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    #[serde(rename = "campaignComplete")]
    pub campaign_complete: bool,
    #[serde(rename = "highRiskUser")]
    pub high_risk_user: bool,
    #[serde(rename = "systemError")]
    pub system_error: bool,
    #[serde(rename = "adminEmail")]
    pub admin_email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemSettings {
    pub email: EmailSettings,
    pub security: SecuritySettings,
    pub notifications: NotificationSettings,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub email: EmailSettings,
    pub security: SecuritySettings,
    pub notifications: NotificationSettings,
}

/// 获取系统设置
pub async fn get_settings(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query!(
        "SELECT settings FROM system_settings WHERE id = 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(row)) => {
            // 解析JSON值为SystemSettings
            match serde_json::from_value::<SystemSettings>(row.settings) {
                Ok(settings) => Ok(HttpResponse::Ok().json(settings)),
                Err(e) => {
                    eprintln!("解析设置JSON失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "解析设置失败"
                    })))
                }
            }
        }
        Ok(None) => {
            // 如果没有设置，返回默认设置
            let default_settings = SystemSettings {
                email: EmailSettings {
                    smtp_host: String::new(),
                    smtp_port: "587".to_string(),
                    smtp_user: String::new(),
                    smtp_password: String::new(),
                    ssl_enabled: true,
                    send_rate: "60".to_string(),
                    batch_size: "100".to_string(),
                    sender_name: "PhishTest Suite".to_string(),
                    sender_email: String::new(),
                },
                security: SecuritySettings {
                    data_encryption: true,
                    transport_encryption: true,
                    session_timeout: "30".to_string(),
                    max_login_attempts: "5".to_string(),
                    two_factor_auth: false,
                    ip_whitelist: false,
                },
                notifications: NotificationSettings {
                    campaign_complete: true,
                    high_risk_user: true,
                    system_error: true,
                    admin_email: String::new(),
                },
            };
            Ok(HttpResponse::Ok().json(default_settings))
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取设置失败"
            })))
        }
    }
}

/// 更新系统设置
pub async fn update_settings(
    pool: web::Data<MySqlPool>,
    req: web::Json<UpdateSettingsRequest>,
) -> Result<HttpResponse> {
    let settings = SystemSettings {
        email: req.email.clone(),
        security: req.security.clone(),
        notifications: req.notifications.clone(),
    };

    // 将设置序列化为JSON字符串
    let settings_json = match serde_json::to_string(&settings) {
        Ok(json) => json,
        Err(e) => {
            eprintln!("序列化设置失败: {}", e);
            return Ok(HttpResponse::BadRequest().json(json!({
                "error": "设置格式错误"
            })));
        }
    };

    match sqlx::query!(
        "INSERT INTO system_settings (id, settings) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings = ?, updated_at = CURRENT_TIMESTAMP",
        settings_json,
        settings_json
    )
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({
            "message": "设置保存成功",
            "settings": settings
        }))),
        Err(e) => {
            eprintln!("数据库更新错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "保存设置失败"
            })))
        }
    }
}

/// 重置系统设置到默认值
pub async fn reset_settings(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    let default_settings = SystemSettings {
        email: EmailSettings {
            smtp_host: String::new(),
            smtp_port: "587".to_string(),
            smtp_user: String::new(),
            smtp_password: String::new(),
            ssl_enabled: true,
            send_rate: "60".to_string(),
            batch_size: "100".to_string(),
            sender_name: "PhishTest Suite".to_string(),
            sender_email: String::new(),
        },
        security: SecuritySettings {
            data_encryption: true,
            transport_encryption: true,
            session_timeout: "30".to_string(),
            max_login_attempts: "5".to_string(),
            two_factor_auth: false,
            ip_whitelist: false,
        },
        notifications: NotificationSettings {
            campaign_complete: true,
            high_risk_user: true,
            system_error: true,
            admin_email: String::new(),
        },
    };

    let settings_json = match serde_json::to_string(&default_settings) {
        Ok(json) => json,
        Err(e) => {
            eprintln!("序列化默认设置失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "重置设置失败"
            })));
        }
    };

    match sqlx::query!(
        "UPDATE system_settings SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        settings_json
    )
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({
            "message": "设置已重置到默认值",
            "settings": default_settings
        }))),
        Err(e) => {
            eprintln!("数据库更新错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "重置设置失败"
            })))
        }
    }
}

