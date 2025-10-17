use actix_web::{web, HttpResponse, Result};
use sqlx::MySqlPool;
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;
use crate::database::models::*;

pub async fn get_templates(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query_as!(
        Template,
        "SELECT * FROM templates ORDER BY created_at DESC"
    ).fetch_all(pool.get_ref()).await {
        Ok(templates) => {
            Ok(HttpResponse::Ok().json(json!({
                "templates": templates,
                "total": templates.len()
            })))
        }
        Err(e) => {
            eprintln!("数据库查询错误: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取模板列表失败"
            })))
        }
    }
}

pub async fn create_template(
    pool: web::Data<MySqlPool>,
    req: web::Json<CreateTemplateRequest>
) -> Result<HttpResponse> {
    let template_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    match sqlx::query!(
        "INSERT INTO templates (id, name, category, description, subject, content, usage_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
        template_id,
        req.name,
        req.category,
        req.description,
        req.subject,
        req.content,
        now,
        now
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取刚创建的模板
            match sqlx::query_as!(
                Template,
                "SELECT * FROM templates WHERE id = ?",
                template_id
            ).fetch_one(pool.get_ref()).await {
                Ok(template) => {
                    Ok(HttpResponse::Created().json(json!({
                        "message": "模板创建成功",
                        "template": template
                    })))
                }
                Err(e) => {
                    eprintln!("获取新创建模板失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "模板创建失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("创建模板失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "模板创建失败"
            })))
        }
    }
}

pub async fn get_template(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let template_id = path.into_inner();
    
    match sqlx::query_as!(
        Template,
        "SELECT * FROM templates WHERE id = ?",
        template_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(template)) => Ok(HttpResponse::Ok().json(template)),
        Ok(None) => Ok(HttpResponse::NotFound().json(json!({
            "error": "模板不存在"
        }))),
        Err(e) => {
            eprintln!("查询模板失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询模板失败"
            })))
        }
    }
}

pub async fn update_template(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>,
    req: web::Json<UpdateTemplateRequest>
) -> Result<HttpResponse> {
    let template_id = path.into_inner();
    let now = Utc::now();
    
    // 先检查模板是否存在
    let existing_template = match sqlx::query_as!(
        Template,
        "SELECT * FROM templates WHERE id = ?",
        template_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(template)) => template,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "模板不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询模板失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询模板失败"
            })));
        }
    };
    
    // 更新模板信息
    let name = req.name.as_ref().unwrap_or(&existing_template.name);
    let category = req.category.as_ref().unwrap_or(&existing_template.category);
    let description = req.description.as_ref().or(existing_template.description.as_ref());
    let subject = req.subject.as_ref().unwrap_or(&existing_template.subject);
    let content = req.content.as_ref().unwrap_or(&existing_template.content);
    
    match sqlx::query!(
        "UPDATE templates SET name = ?, category = ?, description = ?, subject = ?, content = ?, updated_at = ? WHERE id = ?",
        name,
        category,
        description,
        subject,
        content,
        now,
        template_id
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取更新后的模板
            match sqlx::query_as!(
                Template,
                "SELECT * FROM templates WHERE id = ?",
                template_id
            ).fetch_one(pool.get_ref()).await {
                Ok(template) => {
                    Ok(HttpResponse::Ok().json(json!({
                        "message": "模板更新成功",
                        "template": template
                    })))
                }
                Err(e) => {
                    eprintln!("获取更新后模板失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "模板更新失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("更新模板失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "模板更新失败"
            })))
        }
    }
}

pub async fn delete_template(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let template_id = path.into_inner();
    
    match sqlx::query!(
        "DELETE FROM templates WHERE id = ?",
        template_id
    ).execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(HttpResponse::Ok().json(json!({
                    "message": "模板删除成功"
                })))
            } else {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": "模板不存在"
                })))
            }
        }
        Err(e) => {
            eprintln!("删除模板失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "删除模板失败"
            })))
        }
    }
}

pub async fn duplicate_template(
    pool: web::Data<MySqlPool>,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let template_id = path.into_inner();
    
    // 获取原模板
    let original_template = match sqlx::query_as!(
        Template,
        "SELECT * FROM templates WHERE id = ?",
        template_id
    ).fetch_optional(pool.get_ref()).await {
        Ok(Some(template)) => template,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "模板不存在"
            })));
        }
        Err(e) => {
            eprintln!("查询原模板失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "查询原模板失败"
            })));
        }
    };
    
    // 创建新模板
    let new_template_id = Uuid::new_v4().to_string();
    let new_name = format!("{} (副本)", original_template.name);
    let now = Utc::now();
    
    match sqlx::query!(
        "INSERT INTO templates (id, name, category, description, subject, content, usage_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
        new_template_id,
        new_name,
        original_template.category,
        original_template.description,
        original_template.subject,
        original_template.content,
        now,
        now
    ).execute(pool.get_ref()).await {
        Ok(_) => {
            // 获取新创建的模板
            match sqlx::query_as!(
                Template,
                "SELECT * FROM templates WHERE id = ?",
                new_template_id
            ).fetch_one(pool.get_ref()).await {
                Ok(template) => {
                    Ok(HttpResponse::Created().json(json!({
                        "message": "模板复制成功",
                        "template": template
                    })))
                }
                Err(e) => {
                    eprintln!("获取新复制模板失败: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "模板复制失败"
                    })))
                }
            }
        }
        Err(e) => {
            eprintln!("复制模板失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "模板复制失败"
            })))
        }
    }
}

pub async fn get_template_categories(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    match sqlx::query!(
        "SELECT DISTINCT category FROM templates ORDER BY category"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            let categories: Vec<String> = rows.into_iter()
                .map(|row| row.category)
                .collect();
            
            Ok(HttpResponse::Ok().json(json!({
                "categories": categories
            })))
        }
        Err(e) => {
            eprintln!("获取模板分类失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取模板分类失败"
            })))
        }
    }
}

pub async fn get_template_stats(pool: web::Data<MySqlPool>) -> Result<HttpResponse> {
    // 获取总模板数
    let total_templates = match sqlx::query!(
        "SELECT COUNT(*) as count FROM templates"
    ).fetch_one(pool.get_ref()).await {
        Ok(row) => row.count,
        Err(e) => {
            eprintln!("获取模板总数失败: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "获取统计数据失败"
            })));
        }
    };
    
    // 获取分类统计
    let category_stats = match sqlx::query!(
        "SELECT category, COUNT(*) as count FROM templates GROUP BY category"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter()
                .map(|row| json!({
                    "category": row.category,
                    "count": row.count
                }))
                .collect::<Vec<_>>()
        }
        Err(e) => {
            eprintln!("获取分类统计失败: {}", e);
            Vec::new()
        }
    };
    
    // 获取使用频率统计
    let usage_stats = match sqlx::query!(
        "SELECT name, usage_count FROM templates ORDER BY usage_count DESC LIMIT 10"
    ).fetch_all(pool.get_ref()).await {
        Ok(rows) => {
            rows.into_iter()
                .map(|row| json!({
                    "name": row.name,
                    "usage_count": row.usage_count
                }))
                .collect::<Vec<_>>()
        }
        Err(e) => {
            eprintln!("获取使用统计失败: {}", e);
            Vec::new()
        }
    };
    
    Ok(HttpResponse::Ok().json(json!({
        "total_templates": total_templates,
        "category_stats": category_stats,
        "usage_stats": usage_stats
    })))
}