use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // user id
    pub email: String,
    pub name: String,
    pub role: String,
    pub exp: i64,     // expiration time
    pub iat: i64,     // issued at
}

impl Claims {
    pub fn new(user_id: String, email: String, name: String, role: String) -> Self {
        let now = Utc::now();
        let exp = now + Duration::hours(24); // Token有效期24小时
        
        Self {
            sub: user_id,
            email,
            name,
            role,
            exp: exp.timestamp(),
            iat: now.timestamp(),
        }
    }
}

pub fn generate_token(user_id: String, email: String, name: String, role: String) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims::new(user_id, email, name, role);
    let secret = get_jwt_secret();
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = get_jwt_secret();
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )?;
    
    Ok(token_data.claims)
}

fn get_jwt_secret() -> String {
    match env::var("JWT_SECRET") {
        Ok(secret) => {
            if secret.len() < 32 {
                log::warn!("⚠️  JWT_SECRET is too short (< 32 characters). For production, use a longer secret!");
            }
            secret
        }
        Err(_) => {
            // 检查是否是生产环境
            let is_production = env::var("RUST_ENV")
                .or_else(|_| env::var("ENVIRONMENT"))
                .map(|e| e.to_lowercase() == "production" || e.to_lowercase() == "prod")
                .unwrap_or(false);
            
            if is_production {
                panic!("🚨 FATAL: JWT_SECRET must be set in production environment! Please set it in your .env file.");
            }
            
            log::warn!("⚠️  JWT_SECRET not set, using default value (NOT SECURE FOR PRODUCTION!)");
            log::warn!("⚠️  Please set JWT_SECRET in your .env file before deploying to production.");
            "phishtest_jwt_secret_key_change_in_production".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation_and_verification() {
        let user_id = "test-user-id".to_string();
        let email = "test@example.com".to_string();
        let name = "Test User".to_string();
        let role = "user".to_string();
        
        let token = generate_token(user_id.clone(), email.clone(), name.clone(), role.clone())
            .expect("Failed to generate token");
        
        let claims = verify_token(&token).expect("Failed to verify token");
        
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.email, email);
        assert_eq!(claims.name, name);
        assert_eq!(claims.role, role);
    }
}

