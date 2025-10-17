use sqlx::MySqlPool;
use anyhow::Result;

pub async fn run_migrations(pool: &MySqlPool) -> Result<()> {
    println!("🔄 开始运行数据库迁移...");
    
    // 创建用户表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    "#).execute(pool).await?;
    
    // 创建邮件模板表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS templates (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            subject VARCHAR(500) NOT NULL,
            content LONGTEXT NOT NULL,
            usage_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_category (category),
            INDEX idx_created_at (created_at)
        )
    "#).execute(pool).await?;
    
    // 创建收件人表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS recipients (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            department VARCHAR(255) NOT NULL,
            position VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
            last_test_date TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_department (department),
            INDEX idx_risk_level (risk_level),
            INDEX idx_email (email)
        )
    "#).execute(pool).await?;
    
    // 创建收件人分组表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS recipient_groups (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    "#).execute(pool).await?;
    
    // 创建分组成员关联表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS group_members (
            group_id VARCHAR(36),
            recipient_id VARCHAR(36),
            PRIMARY KEY (group_id, recipient_id),
            FOREIGN KEY (group_id) REFERENCES recipient_groups(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE
        )
    "#).execute(pool).await?;
    
    // 创建钓鱼活动表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS campaigns (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            template_id VARCHAR(36),
            status ENUM('draft', 'scheduled', 'active', 'completed', 'paused') DEFAULT 'draft',
            scheduled_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        )
    "#).execute(pool).await?;
    
    // 创建活动收件人关联表（增强追踪功能）
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS campaign_recipients (
            campaign_id VARCHAR(36),
            recipient_id VARCHAR(36),
            email_sent BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP NULL,
            
            -- 打开追踪
            email_opened BOOLEAN DEFAULT FALSE,
            opened_at TIMESTAMP NULL,
            opened_ip VARCHAR(45),
            opened_user_agent TEXT,
            opened_device_type VARCHAR(50),
            opened_os VARCHAR(100),
            opened_browser VARCHAR(100),
            
            -- 点击追踪
            link_clicked BOOLEAN DEFAULT FALSE,
            clicked_at TIMESTAMP NULL,
            clicked_ip VARCHAR(45),
            clicked_user_agent TEXT,
            clicked_device_type VARCHAR(50),
            clicked_os VARCHAR(100),
            clicked_browser VARCHAR(100),
            clicked_location VARCHAR(255),
            
            -- 报告追踪
            reported BOOLEAN DEFAULT FALSE,
            reported_at TIMESTAMP NULL,
            
            PRIMARY KEY (campaign_id, recipient_id),
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE,
            INDEX idx_email_sent (email_sent),
            INDEX idx_email_opened (email_opened),
            INDEX idx_link_clicked (link_clicked)
        )
    "#).execute(pool).await?;
    
    // 创建测试历史表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS test_history (
            id VARCHAR(36) PRIMARY KEY,
            campaign_id VARCHAR(36) NOT NULL,
            recipient_id VARCHAR(36) NOT NULL,
            email_opened BOOLEAN DEFAULT FALSE,
            link_clicked BOOLEAN DEFAULT FALSE,
            reported BOOLEAN DEFAULT FALSE,
            test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE,
            INDEX idx_test_date (test_date),
            INDEX idx_campaign_id (campaign_id)
        )
    "#).execute(pool).await?;
    
    // 创建系统配置表
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS system_config (
            config_key VARCHAR(255) PRIMARY KEY,
            config_value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    "#).execute(pool).await?;
    
    // 创建系统设置表 (存储完整的设置JSON)
    sqlx::query!(r#"
        CREATE TABLE IF NOT EXISTS system_settings (
            id INT PRIMARY KEY DEFAULT 1,
            settings JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    "#).execute(pool).await?;
    
    // 插入默认设置
    let default_settings = r#"{
        "email": {
            "smtpHost": "",
            "smtpPort": "587",
            "smtpUser": "",
            "smtpPassword": "",
            "sslEnabled": true,
            "sendRate": "60",
            "batchSize": "100",
            "senderName": "PhishTest Suite",
            "senderEmail": ""
        },
        "security": {
            "dataEncryption": true,
            "transportEncryption": true,
            "sessionTimeout": "30",
            "maxLoginAttempts": "5",
            "twoFactorAuth": false,
            "ipWhitelist": false
        },
        "notifications": {
            "campaignComplete": true,
            "highRiskUser": true,
            "systemError": true,
            "adminEmail": ""
        }
    }"#;
    
    sqlx::query!(
        "INSERT IGNORE INTO system_settings (id, settings) VALUES (1, ?)",
        default_settings
    ).execute(pool).await?;
    
    // 插入默认配置（保留旧的配置表用于兼容）
    let configs = vec![
        ("smtp_host", "localhost", "SMTP服务器地址"),
        ("smtp_port", "587", "SMTP服务器端口"),
        ("smtp_username", "", "SMTP用户名"),
        ("smtp_password", "", "SMTP密码"),
        ("phishing_domain", "http://localhost:8080", "钓鱼链接域名"),
        ("max_recipients_per_campaign", "1000", "每个活动最大收件人数量"),
        ("email_send_rate_limit", "100", "每小时邮件发送限制"),
    ];
    
    for (key, value, description) in configs {
        sqlx::query!(
            "INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)",
            key, value, description
        ).execute(pool).await?;
    }
    
    println!("✅ 数据库迁移完成");
    Ok(())
}