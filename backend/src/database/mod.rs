use sqlx::{MySql, Pool, MySqlPool};
use anyhow::Result;
use std::env;

pub mod models;
pub mod migrations;

pub type DbPool = Pool<MySql>;

pub async fn create_connection_pool() -> Result<DbPool> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "mysql://root:@localhost:3306/phishtest_db".to_string());
    
    // 首先连接到MySQL服务器（不指定数据库）
    let server_url = database_url.rsplit_once('/').map(|(server, _)| server)
        .unwrap_or("mysql://root:@localhost:3306");
    
    // 创建临时连接来创建数据库
    let temp_pool = MySqlPool::connect(server_url).await?;
    
    // 创建数据库（如果不存在）
    sqlx::query("CREATE DATABASE IF NOT EXISTS phishtest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        .execute(&temp_pool)
        .await?;
    
    temp_pool.close().await;
    
    // 连接到具体的数据库
    let pool = MySqlPool::connect(&database_url).await?;
    
    // 运行迁移
    migrations::run_migrations(&pool).await?;
    
    Ok(pool)
}

pub async fn init_sample_data(pool: &DbPool) -> Result<()> {
    // 插入示例模板
    let templates = vec![
        (
            "银行安全验证",
            "钓鱼邮件",
            "模拟银行安全验证邮件",
            "【重要】您的账户需要安全验证",
            r#"<html><body>
                <h2>尊敬的客户：</h2>
                <p>我们检测到您的账户存在异常登录行为，为了保护您的资金安全，请立即点击下方链接进行身份验证：</p>
                <a href="{{phishing_link}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">立即验证</a>
                <p>如果您未进行此操作，请忽略此邮件。</p>
                <p>此邮件为系统自动发送，请勿回复。</p>
            </body></html>"#
        ),
        (
            "IT系统升级通知",
            "社会工程学",
            "模拟IT部门系统升级通知",
            "【IT通知】系统升级 - 需要您的配合",
            r#"<html><body>
                <h2>系统升级通知</h2>
                <p>亲爱的同事：</p>
                <p>我们将在今晚进行重要的系统升级，为确保您的数据安全，请点击以下链接更新您的登录凭据：</p>
                <a href="{{phishing_link}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">更新凭据</a>
                <p>升级完成后，旧的登录信息将失效。</p>
                <p>感谢您的配合！</p>
                <p>IT部门</p>
            </body></html>"#
        ),
        (
            "快递包裹通知",
            "钓鱼邮件",
            "模拟快递包裹投递通知",
            "您有一个包裹待取",
            r#"<html><body>
                <h2>包裹投递通知</h2>
                <p>尊敬的客户：</p>
                <p>您有一个包裹因地址不详无法投递，请点击以下链接确认收货地址：</p>
                <a href="{{phishing_link}}" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">确认地址</a>
                <p>包裹将在确认后24小时内重新投递。</p>
                <p>快递公司</p>
            </body></html>"#
        )
    ];
    
    for (name, category, description, subject, content) in templates {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT IGNORE INTO templates (id, name, category, description, subject, content) VALUES (?, ?, ?, ?, ?, ?)",
            id, name, category, description, subject, content
        ).execute(pool).await?;
    }
    
    // 插入示例收件人
    let recipients = vec![
        ("张三", "zhangsan@company.com", "IT部门", "软件工程师", Some("13800138001"), "low"),
        ("李四", "lisi@company.com", "财务部", "会计师", Some("13800138002"), "medium"),
        ("王五", "wangwu@company.com", "人事部", "HR专员", Some("13800138003"), "high"),
        ("赵六", "zhaoliu@company.com", "市场部", "市场专员", Some("13800138004"), "medium"),
        ("钱七", "qianqi@company.com", "销售部", "销售经理", Some("13800138005"), "low"),
    ];
    
    for (name, email, department, position, phone, risk_level) in recipients {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT IGNORE INTO recipients (id, name, email, department, position, phone, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
            id, name, email, department, position, phone, risk_level
        ).execute(pool).await?;
    }
    
    println!("✅ 示例数据初始化完成");
    Ok(())
}