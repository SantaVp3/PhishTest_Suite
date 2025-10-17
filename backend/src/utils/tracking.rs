use base64::{Engine as _, engine::general_purpose};
use uuid::Uuid;
use std::env;

/// 生成追踪ID
pub fn generate_tracking_id(campaign_id: &str, recipient_id: &str) -> String {
    let data = format!("{}:{}", campaign_id, recipient_id);
    general_purpose::URL_SAFE_NO_PAD.encode(data.as_bytes())
}

/// 解析追踪ID
pub fn parse_tracking_id(tracking_id: &str) -> Option<(String, String)> {
    match general_purpose::URL_SAFE_NO_PAD.decode(tracking_id) {
        Ok(decoded) => {
            let data = String::from_utf8(decoded).ok()?;
            let parts: Vec<&str> = data.split(':').collect();
            if parts.len() == 2 {
                Some((parts[0].to_string(), parts[1].to_string()))
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

/// 生成追踪像素（1x1透明GIF）
pub fn generate_tracking_pixel(campaign_id: &str, recipient_id: &str) -> String {
    let tracking_id = generate_tracking_id(campaign_id, recipient_id);
    let base_url = get_tracking_base_url();
    format!("{}/api/v1/track/pixel/{}", base_url, tracking_id)
}

/// 生成追踪链接（重定向到目标URL）
pub fn generate_tracking_link(campaign_id: &str, recipient_id: &str, target_url: &str) -> String {
    let tracking_id = generate_tracking_id(campaign_id, recipient_id);
    let base_url = get_tracking_base_url();
    let encoded_target = urlencoding::encode(target_url);
    format!("{}/api/v1/track/click/{}?redirect={}", base_url, tracking_id, encoded_target)
}

/// 在HTML邮件中插入追踪像素
pub fn inject_tracking_pixel(html: &str, campaign_id: &str, recipient_id: &str) -> String {
    let pixel_url = generate_tracking_pixel(campaign_id, recipient_id);
    let pixel_tag = format!(
        r#"<img src="{}" width="1" height="1" style="display:none" alt="" />"#,
        pixel_url
    );
    
    // 在</body>标签前插入追踪像素
    if html.contains("</body>") {
        html.replace("</body>", &format!("{}</body>", pixel_tag))
    } else {
        format!("{}{}", html, pixel_tag)
    }
}

/// 替换邮件模板中的变量和链接
pub fn process_email_template(
    template_html: &str,
    campaign_id: &str,
    recipient_id: &str,
    recipient_name: &str,
    recipient_email: &str,
    phishing_target_url: &str,
) -> String {
    let mut processed = template_html.to_string();
    
    // 替换基本变量
    processed = processed.replace("{{recipient_name}}", recipient_name);
    processed = processed.replace("{{recipient_email}}", recipient_email);
    processed = processed.replace("{{name}}", recipient_name);
    processed = processed.replace("{{email}}", recipient_email);
    
    // 替换钓鱼链接
    let tracking_link = generate_tracking_link(campaign_id, recipient_id, phishing_target_url);
    processed = processed.replace("{{phishing_link}}", &tracking_link);
    
    // 注入追踪像素
    processed = inject_tracking_pixel(&processed, campaign_id, recipient_id);
    
    processed
}

fn get_tracking_base_url() -> String {
    env::var("PHISHING_DOMAIN")
        .or_else(|_| env::var("BASE_URL"))
        .unwrap_or_else(|_| "http://localhost:8080".to_string())
}

/// 1x1透明GIF数据
pub const TRACKING_PIXEL_GIF: &[u8] = &[
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF,
    0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B,
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tracking_id_generation_and_parsing() {
        let campaign_id = "campaign-123";
        let recipient_id = "recipient-456";
        
        let tracking_id = generate_tracking_id(campaign_id, recipient_id);
        let (parsed_campaign, parsed_recipient) = parse_tracking_id(&tracking_id).unwrap();
        
        assert_eq!(parsed_campaign, campaign_id);
        assert_eq!(parsed_recipient, recipient_id);
    }

    #[test]
    fn test_template_processing() {
        let template = r#"<html><body><h1>Hello {{recipient_name}}</h1><a href="{{phishing_link}}">Click here</a></body></html>"#;
        let processed = process_email_template(
            template,
            "campaign-1",
            "recipient-1",
            "John Doe",
            "john@example.com",
            "https://evil.com/phishing",
        );
        
        assert!(processed.contains("Hello John Doe"));
        assert!(processed.contains("/api/v1/track/click/"));
        assert!(processed.contains("/api/v1/track/pixel/"));
    }
}

