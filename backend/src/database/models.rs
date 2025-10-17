use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub role: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub subject: String,
    pub content: String,
    pub usage_count: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Recipient {
    pub id: String,
    pub name: String,
    pub email: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub phone: Option<String>,
    pub risk_level: Option<String>,
    pub last_test_date: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RecipientGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub recipient_ids: Vec<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Campaign {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_id: Option<String>,
    pub status: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CampaignRecipient {
    pub campaign_id: String,
    pub recipient_id: String,
    pub email_sent: bool,
    pub sent_at: Option<DateTime<Utc>>,
    
    // 打开追踪
    pub email_opened: bool,
    pub opened_at: Option<DateTime<Utc>>,
    pub opened_ip: Option<String>,
    pub opened_user_agent: Option<String>,
    pub opened_device_type: Option<String>,
    pub opened_os: Option<String>,
    pub opened_browser: Option<String>,
    
    // 点击追踪
    pub link_clicked: bool,
    pub clicked_at: Option<DateTime<Utc>>,
    pub clicked_ip: Option<String>,
    pub clicked_user_agent: Option<String>,
    pub clicked_device_type: Option<String>,
    pub clicked_os: Option<String>,
    pub clicked_browser: Option<String>,
    pub clicked_location: Option<String>,
    
    // 报告追踪
    pub reported: bool,
    pub reported_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TestHistory {
    pub id: String,
    pub campaign_id: String,
    pub recipient_id: String,
    pub email_opened: bool,
    pub link_clicked: bool,
    pub reported: bool,
    pub test_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignStats {
    pub total_recipients: i64,
    pub emails_sent: i64,
    pub emails_opened: i64,
    pub links_clicked: i64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_campaigns: i64,
    pub active_campaigns: i64,
    pub total_recipients: i64,
    pub total_emails_sent: i64,
    pub total_emails_opened: i64,
    pub total_links_clicked: i64,
    pub overall_success_rate: f64,
}

// 请求结构体
#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub subject: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecipientRequest {
    pub name: String,
    pub email: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRecipientRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignRequest {
    pub name: String,
    pub description: Option<String>,
    pub template_id: Option<String>,
    #[serde(default)]
    pub recipient_groups: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCampaignRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub template_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddRecipientsRequest {
    pub recipient_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkImportRequest {
    pub recipients: Vec<CreateRecipientRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: Option<String>,
    pub recipient_ids: Vec<String>,
}