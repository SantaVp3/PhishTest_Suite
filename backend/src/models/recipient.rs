use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipient {
    pub id: i32,
    pub email: String,
    pub name: Option<String>,
    pub department: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRecipient {
    pub email: String,
    pub name: Option<String>,
    pub department: Option<String>,
}