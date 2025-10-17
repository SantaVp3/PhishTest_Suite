use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;
use crate::database::{DbPool, models::User};
use crate::utils::{hash_password, verify_password, generate_token};
use crate::middleware::auth::get_current_user;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

/// 验证密码强度
fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("密码长度至少为8位".to_string());
    }
    
    if password.len() > 128 {
        return Err("密码长度不能超过128位".to_string());
    }
    
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());
    
    if !has_uppercase {
        return Err("密码必须包含至少一个大写字母".to_string());
    }
    
    if !has_lowercase {
        return Err("密码必须包含至少一个小写字母".to_string());
    }
    
    if !has_digit {
        return Err("密码必须包含至少一个数字".to_string());
    }
    
    // 检查常见弱密码
    let weak_passwords = [
        "password", "12345678", "qwerty123", "admin123", 
        "Password1", "Pass1234", "Test1234"
    ];
    
    for weak in &weak_passwords {
        if password.to_lowercase().contains(&weak.to_lowercase()) {
            return Err("密码过于简单，请使用更强的密码".to_string());
        }
    }
    
    Ok(())
}

pub async fn login(
    pool: web::Data<DbPool>,
    req: web::Json<LoginRequest>
) -> Result<HttpResponse> {
    // 查询用户
    let user = match sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ?"
    )
    .bind(&req.email)
    .fetch_optional(pool.get_ref()).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "error": "邮箱或密码错误"
            })));
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "登录失败，请稍后重试"
            })));
        }
    };

    // 验证密码
    match verify_password(&req.password, &user.password_hash) {
        Ok(true) => {
            // 生成JWT token
            match generate_token(
                user.id.clone(),
                user.email.clone(),
                user.name.clone(),
                user.role.clone(),
            ) {
                Ok(token) => {
                    let response = AuthResponse {
                        token,
                        user: UserResponse {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                        },
                    };
                    Ok(HttpResponse::Ok().json(response))
                }
                Err(e) => {
                    eprintln!("生成token失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "登录失败"
                    })))
                }
            }
        }
        Ok(false) => {
            Ok(HttpResponse::Unauthorized().json(json!({
                "error": "邮箱或密码错误"
            })))
        }
        Err(e) => {
            eprintln!("密码验证错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "登录失败"
            })))
        }
    }
}

pub async fn register(
    pool: web::Data<DbPool>,
    req: web::Json<RegisterRequest>
) -> Result<HttpResponse> {
    // 验证密码强度
    if let Err(error_msg) = validate_password_strength(&req.password) {
        return Ok(HttpResponse::BadRequest().json(json!({
            "error": error_msg
        })));
    }
    
    // 检查邮箱是否已存在
    let existing_user = sqlx::query!(
        "SELECT id FROM users WHERE email = ?",
        req.email
    ).fetch_optional(pool.get_ref()).await;

    if let Ok(Some(_)) = existing_user {
        return Ok(HttpResponse::BadRequest().json(json!({
            "error": "该邮箱已被注册"
        })));
    }

    // 哈希密码
    let password_hash = match hash_password(&req.password) {
        Ok(hash) => hash,
        Err(e) => {
            eprintln!("密码哈希失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "注册失败"
            })));
        }
    };

    let user_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    // 创建用户
    match sqlx::query!(
        "INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'user', ?, ?)",
        user_id,
        req.email,
        password_hash,
        req.name,
        now,
        now
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 生成JWT token
            match generate_token(
                user_id.clone(),
                req.email.clone(),
                req.name.clone(),
                "user".to_string(),
            ) {
                Ok(token) => {
                    let response = AuthResponse {
                        token,
                        user: UserResponse {
                            id: user_id,
                            email: req.email.clone(),
                            name: req.name.clone(),
                            role: "user".to_string(),
                        },
                    };
                    Ok(HttpResponse::Created().json(response))
                }
                Err(e) => {
                    eprintln!("生成token失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "注册失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("创建用户失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "注册失败"
            })))
        }
    }
}

pub async fn refresh_token(req: HttpRequest) -> Result<HttpResponse> {
    // 从middleware获取当前用户
    if let Some(user) = get_current_user(&req) {
        // 生成新token
        match generate_token(user.id, user.email, user.name, user.role) {
            Ok(token) => {
                Ok(HttpResponse::Ok().json(json!({
                    "token": token
                })))
            }
            Err(e) => {
                eprintln!("生成token失败: {}", e);
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "刷新token失败"
                })))
            }
        }
    } else {
        Ok(HttpResponse::Unauthorized().json(json!({
            "error": "未授权"
        })))
    }
}

pub async fn get_profile(req: HttpRequest) -> Result<HttpResponse> {
    if let Some(user) = get_current_user(&req) {
        Ok(HttpResponse::Ok().json(UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        }))
    } else {
        Ok(HttpResponse::Unauthorized().json(json!({
            "error": "未授权"
        })))
    }
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub password: Option<String>,
}

pub async fn update_profile(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    update_req: web::Json<UpdateProfileRequest>
) -> Result<HttpResponse> {
    if let Some(user) = get_current_user(&req) {
        let mut updates = Vec::new();
        let mut values: Vec<String> = Vec::new();

        if let Some(name) = &update_req.name {
            updates.push("name = ?");
            values.push(name.clone());
        }

        if let Some(password) = &update_req.password {
            match hash_password(password) {
                Ok(hash) => {
                    updates.push("password_hash = ?");
                    values.push(hash);
                }
                Err(e) => {
                    eprintln!("密码哈希失败: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "更新失败"
                    })));
                }
            }
        }

        if updates.is_empty() {
            return Ok(HttpResponse::BadRequest().json(json!({
                "error": "没有提供要更新的字段"
            })));
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(user.id.clone());

        let query = format!(
            "UPDATE users SET {} WHERE id = ?",
            updates.join(", ")
        );

        // 构建动态查询
        let mut query_builder = sqlx::query(&query);
        for value in &values {
            query_builder = query_builder.bind(value);
        }

        match query_builder.execute(pool.get_ref()).await {
            Ok(_) => {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "更新成功"
                })))
            }
            Err(e) => {
                eprintln!("更新用户失败: {}", e);
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "更新失败"
                })))
            }
        }
    } else {
        Ok(HttpResponse::Unauthorized().json(json!({
            "error": "未授权"
        })))
    }
}