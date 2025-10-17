use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub id: i32,
    pub name: String,
    pub subject: String,
    pub content: String,
    pub category: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplate {
    pub name: String,
    pub subject: String,
    pub content: String,
    pub category: String,
}