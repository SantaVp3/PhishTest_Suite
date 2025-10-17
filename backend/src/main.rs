use actix_web::{web, App, HttpServer, middleware::{Logger, DefaultHeaders}};
use actix_cors::Cors;
use dotenv::dotenv;

mod models;
mod handlers;
mod database;
mod utils;
mod middleware;

use handlers::{auth, campaigns, campaign_execution, templates, recipients, analytics, tracking, settings};
use middleware::auth::AuthMiddleware;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    println!("🔄 正在初始化数据库连接...");
    
    // 创建数据库连接池
    let pool = match database::create_connection_pool().await {
        Ok(pool) => {
            println!("✅ 数据库连接成功");
            pool
        }
        Err(e) => {
            eprintln!("❌ 数据库连接失败: {}", e);
            eprintln!("请确保MySQL服务正在运行，并检查连接配置");
            std::process::exit(1);
        }
    };
    
    // 注释掉示例数据初始化 - 用于生产环境
    // if let Err(e) = database::init_sample_data(&pool).await {
    //     eprintln!("⚠️  初始化示例数据失败: {}", e);
    // }

    println!("🚀 PhishTest Suite Backend Server starting on http://localhost:8080");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin("http://localhost:3001")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Content-Type", "Authorization", "Accept"])
            .expose_headers(vec!["Content-Type", "Authorization"])
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(
                DefaultHeaders::new()
                    .add(("X-Frame-Options", "DENY"))
                    .add(("X-Content-Type-Options", "nosniff"))
                    .add(("X-XSS-Protection", "1; mode=block"))
                    .add(("Referrer-Policy", "strict-origin-when-cross-origin"))
            )
            .wrap(cors)
            .wrap(Logger::default())
            .service(
                web::scope("/api/v1")
                    // 公开路由 - 认证
                    .service(
                        web::scope("/auth")
                            .route("/login", web::post().to(auth::login))
                            .route("/register", web::post().to(auth::register))
                    )
                    // 公开路由 - 追踪（不需要认证）
                    .service(
                        web::scope("/track")
                            .route("/pixel/{tracking_id}", web::get().to(tracking::track_pixel))
                            .route("/click/{tracking_id}", web::get().to(tracking::track_click))
                            .route("/report/{tracking_id}", web::post().to(tracking::track_report))
                    )
                    // 受保护的API路由（需要认证）
                    .service(
                        web::scope("")
                            .wrap(AuthMiddleware)
                            // 认证相关
                            .route("/auth/refresh", web::post().to(auth::refresh_token))
                            
                            // 用户管理
                            .route("/users/profile", web::get().to(auth::get_profile))
                            .route("/users/profile", web::put().to(auth::update_profile))
                            
                            // 钓鱼活动管理
                            .service(
                                web::scope("/campaigns")
                                    .route("", web::get().to(campaigns::get_campaigns))
                                    .route("", web::post().to(campaigns::create_campaign))
                                    .route("/{id}", web::get().to(campaigns::get_campaign))
                                    .route("/{id}", web::put().to(campaigns::update_campaign))
                                    .route("/{id}", web::delete().to(campaigns::delete_campaign))
                                    .route("/{id}/stats", web::get().to(campaigns::get_campaign_stats))
                                    .route("/{id}/tracking", web::get().to(tracking::get_tracking_stats))
                                    .route("/{id}/tracking-details", web::get().to(tracking::get_detailed_tracking))
                                    .route("/{id}/launch", web::post().to(campaign_execution::launch_campaign))
                                    .route("/{id}/pause", web::post().to(campaign_execution::pause_campaign))
                                    .route("/{id}/stop", web::post().to(campaign_execution::stop_campaign))
                            )
                            
                            // 邮件模板管理
                            .service(
                                web::scope("/templates")
                                    .route("", web::get().to(templates::get_templates))
                                    .route("", web::post().to(templates::create_template))
                                    .route("/{id}", web::get().to(templates::get_template))
                                    .route("/{id}", web::put().to(templates::update_template))
                                    .route("/{id}", web::delete().to(templates::delete_template))
                                    .route("/{id}/duplicate", web::post().to(templates::duplicate_template))
                                    .route("/{id}/test", web::post().to(campaign_execution::test_email))
                                    .route("/categories", web::get().to(templates::get_template_categories))
                            )
                            
                            // 收件人管理
                            .service(
                                web::scope("/recipients")
                                    .route("", web::get().to(recipients::get_recipients))
                                    .route("", web::post().to(recipients::create_recipient))
                                    .route("/bulk-import", web::post().to(recipients::bulk_import_recipients))
                                    .route("/departments", web::get().to(recipients::get_departments))
                                    .route("/stats", web::get().to(recipients::get_recipient_stats))
                                    .service(
                                        web::scope("/groups")
                                            .route("", web::get().to(recipients::get_groups))
                                            .route("", web::post().to(recipients::create_group))
                                            .route("/{id}", web::get().to(recipients::get_group))
                                            .route("/{id}", web::put().to(recipients::update_group))
                                            .route("/{id}", web::delete().to(recipients::delete_group))
                                    )
                            )
                            
                            // 数据分析
                            .service(
                                web::scope("/analytics")
                                    .route("/dashboard", web::get().to(analytics::get_analytics))
                            )
                            
                            // 系统设置
                            .service(
                                web::scope("/settings")
                                    .route("", web::get().to(settings::get_settings))
                                    .route("", web::put().to(settings::update_settings))
                                    .route("/reset", web::post().to(settings::reset_settings))
                            )
                    )
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}