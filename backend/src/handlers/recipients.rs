use actix_web::{web, HttpResponse, Result};
use sqlx::MySqlPool;
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;
use crate::database::models::{Recipient, CreateRecipientRequest, UpdateRecipientRequest, BulkImportRequest, RecipientGroup, CreateGroupRequest};

pub async fn get_recipients(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query_as!(
        Recipient,
        "SELECT * FROM recipients ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(recipients) => {
            Ok(HttpResponse::Ok().json(json!({
                "recipients": recipients,
                "total": recipients.len()
            })))
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取收件人列表失败"
            })))
        }
    }
}

pub async fn create_recipient(
    pool: web::Data<MySqlPool>,
    req: web::Json<CreateRecipientRequest>
) -> Result<HttpResponse> {
    let recipient_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // 提供默认值
    let department = req.department.as_deref().unwrap_or("");
    let position = req.position.as_deref().unwrap_or("");
    
    match sqlx::query!(
        "INSERT INTO recipients (id, name, email, department, position, phone, risk_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'low', ?, ?)",
        recipient_id,
        req.name,
        req.email,
        department,
        position,
        req.phone,
        now,
        now
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取刚创建的收件人
            match sqlx::query_as!(
                Recipient,
                "SELECT * FROM recipients WHERE id = ?",
                recipient_id
            ).fetch_one(pool.get_ref()).await {
                Ok(recipient) => {
                    Ok(HttpResponse::Created().json(json!({
                        "message": "收件人创建成功",
                        "recipient": recipient
                    })))
                }
                Err(e) => {
                    eprintln!("获取新创建收件人失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "收件人创建失败"
                    })))
                }
            }
        }
        Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => {
            Ok(HttpResponse::BadRequest().json(json!({
                "error": "邮箱地址已存在"
            })))
        }
        Err(e) => {
            eprintln!("创建收件人失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "收件人创建失败"
            })))
        }
    }
}

pub async fn get_recipient(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let recipient_id = path.into_inner();
    
    match sqlx::query_as!(
        Recipient,
        "SELECT * FROM recipients WHERE id = ?",
        recipient_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(recipient)) => Ok(HttpResponse::Ok().json(recipient)),
        Ok(None) => Ok(HttpResponse::NotFound().json(json!({
            "error": "收件人不存在"
        }))),
        Err(e) => {
            eprintln!("查询收件人失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询收件人失败"
            })))
        }
    }
}

pub async fn update_recipient(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>,
    req: web::Json<UpdateRecipientRequest>
) -> Result<HttpResponse> {
    let recipient_id = path.into_inner();
    let now = Utc::now();
    
    // 先检查收件人是否存在
    let existing_recipient = match sqlx::query_as!(
        Recipient,
        "SELECT * FROM recipients WHERE id = ?",
        recipient_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(recipient)) => recipient,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "收件人不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询收件人失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询收件人失败"
            })));
        }
    };
    
    // 如果要更新邮箱，先检查邮箱是否已被其他人使用
    if let Some(email) = &req.email {
        if email != &existing_recipient.email {
            let email_exists = match sqlx::query!(
                "SELECT COUNT(*) as count FROM recipients WHERE email = ? AND id != ?",
                email,
                recipient_id
            ).fetch_one(pool.get_ref()).await {
                Ok(row) => row.count > 0,
                Err(e) => {
                    eprintln!("检查邮箱重复失败: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "检查邮箱重复失败"
                    })));
                }
            };
            
            if email_exists {
                return Ok(HttpResponse::BadRequest().json(json!({
                    "error": "邮箱地址已被其他收件人使用"
                })));
            }
        }
    }
    
    // 更新收件人信息
    let name = req.name.as_ref().unwrap_or(&existing_recipient.name);
    let email = req.email.as_ref().unwrap_or(&existing_recipient.email);
    let default_dept = "".to_string();
        let department = req.department.as_ref().unwrap_or(&existing_recipient.department.as_ref().unwrap_or(&default_dept));
    let position = req.position.as_ref().or(existing_recipient.position.as_ref());
    let phone = req.phone.as_ref().or(existing_recipient.phone.as_ref());
    
    match sqlx::query!(
        "UPDATE recipients SET name = ?, email = ?, department = ?, position = ?, phone = ?, updated_at = ? WHERE id = ?",
        name,
        email,
        department,
        position,
        phone,
        now,
        recipient_id
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取更新后的收件人
            match sqlx::query_as!(
                Recipient,
                "SELECT * FROM recipients WHERE id = ?",
                recipient_id
            ).fetch_one(pool.get_ref()).await {
                Ok(recipient) => {
                    Ok(HttpResponse::Ok().json(json!({
                        "message": "收件人更新成功",
                        "recipient": recipient
                    })))
                }
                Err(e) => {
                    eprintln!("获取更新后收件人失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "收件人更新失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("更新收件人失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "收件人更新失败"
            })))
        }
    }
}

pub async fn delete_recipient(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let recipient_id = path.into_inner();
    
    match sqlx::query!(
        "DELETE FROM recipients WHERE id = ?",
        recipient_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "收件人删除成功"
                })))
            } else {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": "收件人不存在"
                })))
            }
        }
        Err(e) => {
            eprintln!("删除收件人失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "删除收件人失败"
            })))
        }
    }
}

pub async fn bulk_import_recipients(
    pool: web::Data<MySqlPool>,
    req: web::Json<BulkImportRequest>
) -> Result<HttpResponse> {
    let mut created_count = 0;
    let mut errors = Vec::new();
    let now = Utc::now();
    
    for (index, recipient_req) in req.recipients.iter().enumerate() {
        let recipient_id = Uuid::new_v4().to_string();
        
        match sqlx::query!(
            "INSERT INTO recipients (id, name, email, department, position, phone, risk_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'low', ?, ?)",
            recipient_id,
            recipient_req.name,
            recipient_req.email,
            recipient_req.department,
            recipient_req.position,
            recipient_req.phone,
            now,
            now
        ).execute(pool.get_ref()).await {
            Ok(_) => {
                created_count += 1;
            }
            Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => {
                errors.push(format!("第{}行: 邮箱 {} 已存在", index + 1, recipient_req.email));
            }
            Err(e) => {
                eprintln!("批量导入第{}行失败: {}", index + 1, e);
                errors.push(format!("第{}行: 导入失败", index + 1));
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(json!({
        "message": format!("批量导入完成，成功创建 {} 个收件人", created_count),
        "created_count": created_count,
        "errors": errors
    })))
}

pub async fn get_departments(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query!(
        "SELECT DISTINCT department FROM recipients ORDER BY department"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            let departments: Vec<String> = rows.into_iter()
                .map(|row| row.department)
                .collect();
            
            Ok(HttpResponse::Ok().json(json!({
                "departments": departments
            })))
        }
        Err(e) => {
            eprintln!("获取部门列表失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取部门列表失败"
            })))
        }
    }
}

pub async fn get_recipient_stats(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    // 获取总收件人数
    let total_recipients = match sqlx::query!(
        "SELECT COUNT(*) as count FROM recipients"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(e) => {
            eprintln!("获取收件人总数失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取统计数据失败"
            })));
        }
    };
    
    // 获取部门统计
    let department_stats = match sqlx::query!(
        "SELECT department, COUNT(*) as count FROM recipients GROUP BY department"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter()
                .map(|row| json!({
                    "department": row.department,
                    "count": row.count
                }))
                .collect::<Vec<_>>()
        }
        Err(e) => {
            eprintln!("获取部门统计失败: {}", e);
            Vec::new()
        }
    };
    
    // 获取风险等级统计
    let risk_stats = match sqlx::query!(
        "SELECT risk_level, COUNT(*) as count FROM recipients GROUP BY risk_level"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter()
                .map(|row| json!({
                    "risk_level": row.risk_level,
                    "count": row.count
                }))
                .collect::<Vec<_>>()
        }
        Err(e) => {
            eprintln!("获取风险统计失败: {}", e);
            Vec::new()
        }
    };
    
    Ok(HttpResponse::Ok().json(json!({
        "total_recipients": total_recipients,
        "department_stats": department_stats,
        "risk_stats": risk_stats
    })))
}

// 分组相关功能暂时使用内存存储，后续可以扩展到数据库
use std::collections::HashMap;
use std::sync::Mutex;
// 分组管理
pub async fn get_groups(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query!(
        "SELECT id, name, description, created_at, updated_at FROM recipient_groups ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(groups) => {
            let mut result = Vec::new();
            
            for group in groups {
                // 获取该分组的成员数量
                let member_count = sqlx::query!(
                    "SELECT COUNT(*) as count FROM group_members WHERE group_id = ?",
                    group.id
                ).fetch_one(pool.get_ref()).await
                    .map(|r| r.count)
                    .unwrap_or(0);
                
                result.push(json!({
                    "id": group.id,
                    "name": group.name,
                    "description": group.description,
                    "member_count": member_count,
                    "created_at": group.created_at,
                    "updated_at": group.updated_at
                }));
            }
            
            Ok(HttpResponse::Ok().json(json!({
                "groups": result,
                "total": result.len()
            })))
        }
        Err(e) => {
            eprintln!("获取分组列表失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取分组列表失败"
            })))
        }
    }
}

pub async fn create_group(
    pool: web::Data<MySqlPool>,
    req: web::Json<CreateGroupRequest>
) -> Result<HttpResponse> {
    let group_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // 创建分组
    match sqlx::query!(
        "INSERT INTO recipient_groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        group_id,
        req.name,
        req.description,
        now,
        now
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 添加分组成员
            for recipient_id in &req.recipient_ids {
                let _ = sqlx::query!(
                    "INSERT IGNORE INTO group_members (group_id, recipient_id) VALUES (?, ?)",
                    group_id,
                    recipient_id
                ).execute(pool.get_ref()).await;
            }
            
            Ok(HttpResponse::Created().json(json!({
                "message": "分组创建成功",
                "group": {
                    "id": group_id,
                    "name": req.name,
                    "description": req.description,
                    "member_count": req.recipient_ids.len()
                }
            })))
        }
        Err(e) => {
            eprintln!("创建分组失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "创建分组失败"
            })))
        }
    }
}

pub async fn get_group(
    path: web::Path<String>,
    pool: web::Data<MySqlPool>
) -> Result<HttpResponse> {
    let group_id = path.into_inner();
    
    match sqlx::query!(
        "SELECT id, name, description, created_at, updated_at FROM recipient_groups WHERE id = ?",
        group_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(group)) => {
            // 获取分组成员
            let members = sqlx::query_as!(
                Recipient,
                "SELECT r.* FROM recipients r 
                 INNER JOIN group_members gm ON r.id = gm.recipient_id 
                 WHERE gm.group_id = ?",
                group_id
            ).fetch_all(pool.get_ref()).await.unwrap_or_default();
            
            Ok(HttpResponse::Ok().json(json!({
                "group": {
                    "id": group.id,
                    "name": group.name,
                    "description": group.description,
                    "member_count": members.len(),
                    "created_at": group.created_at,
                    "updated_at": group.updated_at
                },
                "members": members
            })))
        }
        Ok(None) => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "分组不存在"
            })))
        }
        Err(e) => {
            eprintln!("获取分组失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取分组失败"
            })))
        }
    }
}

pub async fn update_group(
    path: web::Path<String>,
    pool: web::Data<MySqlPool>,
    req: web::Json<CreateGroupRequest>
) -> Result<HttpResponse> {
    let group_id = path.into_inner();
    
    match sqlx::query!(
        "UPDATE recipient_groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        req.name,
        req.description,
        group_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return Ok(HttpResponse::NotFound().json(json!({
                    "error": "分组不存在"
                })));
            }
            
            // 更新分组成员：先删除所有，再添加新的
            let _ = sqlx::query!(
                "DELETE FROM group_members WHERE group_id = ?",
                group_id
            ).execute(pool.get_ref()).await;
            
            for recipient_id in &req.recipient_ids {
                let _ = sqlx::query!(
                    "INSERT IGNORE INTO group_members (group_id, recipient_id) VALUES (?, ?)",
                    group_id,
                    recipient_id
                ).execute(pool.get_ref()).await;
            }
            
            Ok(HttpResponse::Ok().json(json!({
                "message": "分组更新成功",
                "group": {
                    "id": group_id,
                    "name": req.name,
                    "description": req.description,
                    "member_count": req.recipient_ids.len()
                }
            })))
        }
        Err(e) => {
            eprintln!("更新分组失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "更新分组失败"
            })))
        }
    }
}

pub async fn delete_group(
    path: web::Path<String>,
    pool: web::Data<MySqlPool>
) -> Result<HttpResponse> {
    let group_id = path.into_inner();
    
    match sqlx::query!(
        "DELETE FROM recipient_groups WHERE id = ?",
        group_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": "分组不存在"
                })))
            } else {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "分组删除成功"
                })))
            }
        }
        Err(e) => {
            eprintln!("删除分组失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "删除分组失败"
            })))
        }
    }
}