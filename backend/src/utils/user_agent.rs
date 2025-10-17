use actix_web::HttpRequest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientInfo {
    pub ip: String,
    pub user_agent: String,
    pub device_type: String,
    pub os: String,
    pub browser: String,
    pub location: Option<String>,
}

/// 从请求中提取客户端信息
pub fn extract_client_info(req: &HttpRequest) -> ClientInfo {
    let ip = get_client_ip(req);
    let user_agent = get_user_agent(req);
    let (device_type, os, browser) = parse_user_agent(&user_agent);
    
    ClientInfo {
        ip: ip.clone(),
        user_agent,
        device_type,
        os,
        browser,
        location: get_location_from_ip(&ip),
    }
}

/// 获取客户端真实IP（考虑代理和负载均衡）
fn get_client_ip(req: &HttpRequest) -> String {
    // 优先从 X-Forwarded-For 获取（如果使用了代理/负载均衡）
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            // X-Forwarded-For 可能包含多个IP，取第一个
            if let Some(first_ip) = forwarded_str.split(',').next() {
                return first_ip.trim().to_string();
            }
        }
    }
    
    // 尝试 X-Real-IP
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(ip_str) = real_ip.to_str() {
            return ip_str.to_string();
        }
    }
    
    // 最后使用连接信息中的对端地址
    req.connection_info()
        .peer_addr()
        .unwrap_or("unknown")
        .to_string()
}

/// 获取User-Agent
fn get_user_agent(req: &HttpRequest) -> String {
    req.headers()
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}

/// 解析User-Agent字符串，提取设备类型、操作系统、浏览器
fn parse_user_agent(ua: &str) -> (String, String, String) {
    let ua_lower = ua.to_lowercase();
    
    // 检测设备类型
    let device_type = if ua_lower.contains("mobile") || 
                         (ua_lower.contains("android") && !ua_lower.contains("tablet")) {
        "Mobile"
    } else if ua_lower.contains("tablet") || ua_lower.contains("ipad") {
        "Tablet"
    } else {
        "Desktop"
    }.to_string();
    
    // 检测操作系统
    let os = if ua_lower.contains("windows nt 10.0") {
        "Windows 10/11".to_string()
    } else if ua_lower.contains("windows nt 6.3") {
        "Windows 8.1".to_string()
    } else if ua_lower.contains("windows nt 6.2") {
        "Windows 8".to_string()
    } else if ua_lower.contains("windows nt 6.1") {
        "Windows 7".to_string()
    } else if ua_lower.contains("windows") {
        "Windows".to_string()
    } else if ua_lower.contains("mac os x") {
        extract_macos_version(ua)
    } else if ua_lower.contains("android") {
        extract_android_version(ua)
    } else if ua_lower.contains("iphone") {
        extract_ios_version(ua, "iPhone")
    } else if ua_lower.contains("ipad") {
        extract_ios_version(ua, "iPad")
    } else if ua_lower.contains("linux") {
        "Linux".to_string()
    } else {
        "Unknown".to_string()
    };
    
    // 检测浏览器
    let browser = if ua_lower.contains("edg/") || ua_lower.contains("edge/") {
        "Microsoft Edge".to_string()
    } else if ua_lower.contains("chrome/") && !ua_lower.contains("edg") {
        "Chrome".to_string()
    } else if ua_lower.contains("firefox/") {
        "Firefox".to_string()
    } else if ua_lower.contains("safari/") && !ua_lower.contains("chrome") {
        "Safari".to_string()
    } else if ua_lower.contains("opera") || ua_lower.contains("opr/") {
        "Opera".to_string()
    } else if ua_lower.contains("msie") || ua_lower.contains("trident/") {
        "Internet Explorer".to_string()
    } else {
        "Unknown".to_string()
    };
    
    (device_type, os, browser)
}

fn extract_macos_version(ua: &str) -> String {
    if let Some(start) = ua.find("Mac OS X") {
        let version_str = &ua[start..];
        if let Some(end) = version_str.find(')') {
            let version = &version_str[..end];
            return version.replace('_', ".").to_string();
        }
    }
    "macOS".to_string()
}

fn extract_android_version(ua: &str) -> String {
    if let Some(start) = ua.find("Android ") {
        let version_str = &ua[start + 8..];
        if let Some(end) = version_str.find(';') {
            return format!("Android {}", version_str[..end].trim());
        }
    }
    "Android".to_string()
}

fn extract_ios_version(ua: &str, device: &str) -> String {
    if let Some(start) = ua.find("OS ") {
        let version_str = &ua[start + 3..];
        if let Some(end) = version_str.find(' ') {
            return format!("{} (iOS {})", device, version_str[..end].replace('_', "."));
        }
    }
    format!("{} (iOS)", device)
}

/// 根据IP获取地理位置（简单版本）
fn get_location_from_ip(ip: &str) -> Option<String> {
    // 识别内网IP
    if ip.starts_with("192.168.") 
        || ip.starts_with("10.") 
        || ip.starts_with("172.16.") 
        || ip.starts_with("172.17.")
        || ip.starts_with("172.18.")
        || ip.starts_with("172.19.")
        || ip.starts_with("172.20.")
        || ip.starts_with("172.21.")
        || ip.starts_with("172.22.")
        || ip.starts_with("172.23.")
        || ip.starts_with("172.24.")
        || ip.starts_with("172.25.")
        || ip.starts_with("172.26.")
        || ip.starts_with("172.27.")
        || ip.starts_with("172.28.")
        || ip.starts_with("172.29.")
        || ip.starts_with("172.30.")
        || ip.starts_with("172.31.")
        || ip == "127.0.0.1"
        || ip == "::1" 
        || ip == "unknown" {
        return Some("内网".to_string());
    }
    
    // 对于公网IP，返回"外网"标识
    // 如需更精确定位，可集成 MaxMind GeoIP2 或调用 IP 定位 API
    Some("外网".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_chrome_windows() {
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        let (device, os, browser) = parse_user_agent(ua);
        
        assert_eq!(device, "Desktop");
        assert_eq!(os, "Windows 10/11");
        assert_eq!(browser, "Chrome");
    }

    #[test]
    fn test_parse_safari_ios() {
        let ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
        let (device, os, browser) = parse_user_agent(ua);
        
        assert_eq!(device, "Mobile");
        assert!(os.contains("iPhone"));
        assert_eq!(browser, "Safari");
    }

    #[test]
    fn test_parse_firefox_linux() {
        let ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0";
        let (device, os, browser) = parse_user_agent(ua);
        
        assert_eq!(device, "Desktop");
        assert_eq!(os, "Linux");
        assert_eq!(browser, "Firefox");
    }

    #[test]
    fn test_internal_ip_detection() {
        assert_eq!(get_location_from_ip("192.168.1.1"), Some("内网".to_string()));
        assert_eq!(get_location_from_ip("10.0.0.1"), Some("内网".to_string()));
        assert_eq!(get_location_from_ip("172.16.0.1"), Some("内网".to_string()));
        assert_eq!(get_location_from_ip("127.0.0.1"), Some("内网".to_string()));
    }
}

