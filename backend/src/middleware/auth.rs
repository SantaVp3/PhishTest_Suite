use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
use futures::future::LocalBoxFuture;
use std::future::{ready, Ready};
use serde::{Deserialize, Serialize};

use crate::utils::jwt::verify_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

pub struct AuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService { service }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // 获取Authorization header
        let auth_header = req.headers().get("Authorization");
        
        if let Some(auth_value) = auth_header {
            if let Ok(auth_str) = auth_value.to_str() {
                // 期望格式: "Bearer <token>"
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    
                    match verify_token(token) {
                        Ok(claims) => {
                            // Token验证成功，将用户信息添加到request extensions
                            let user = AuthUser {
                                id: claims.sub,
                                email: claims.email,
                                name: claims.name,
                                role: claims.role,
                            };
                            req.extensions_mut().insert(user);
                            
                            let fut = self.service.call(req);
                            return Box::pin(async move {
                                let res = fut.await?;
                                Ok(res)
                            });
                        }
                        Err(e) => {
                            log::warn!("Token verification failed: {:?}", e);
                        }
                    }
                }
            }
        }
        
        // 认证失败
        Box::pin(async move {
            Err(actix_web::error::ErrorUnauthorized(
                serde_json::json!({
                    "error": "Unauthorized",
                    "message": "Invalid or missing authentication token"
                })
                .to_string()
            ))
        })
    }
}

/// 从request中获取当前认证用户
pub fn get_current_user(req: &actix_web::HttpRequest) -> Option<AuthUser> {
    req.extensions().get::<AuthUser>().cloned()
}

/// 检查用户是否有指定角色
pub fn has_role(user: &AuthUser, role: &str) -> bool {
    user.role == role || user.role == "admin"
}

