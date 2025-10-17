use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Campaign {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub template_id: i32,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCampaign {
    pub name: String,
    pub description: Option<String>,
    pub template_id: i32,
}