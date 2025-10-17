use lettre::{
    message::{header::ContentType, Mailbox, MultiPart, SinglePart},
    transport::smtp::{authentication::Credentials, response::Response},
    Message, SmtpTransport, Transport,
};
use anyhow::{Result, Context};
use std::env;

pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub from_name: String,
}

impl EmailConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            smtp_host: env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string()),
            smtp_port: env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .context("Invalid SMTP_PORT")?,
            smtp_username: env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: env::var("SMTP_PASSWORD").unwrap_or_default(),
            from_email: env::var("FROM_EMAIL").unwrap_or_else(|_| "noreply@phishtest.local".to_string()),
            from_name: env::var("FROM_NAME").unwrap_or_else(|_| "PhishTest Suite".to_string()),
        })
    }
}

pub struct EmailSender {
    config: EmailConfig,
    mailer: Option<SmtpTransport>,
}

impl EmailSender {
    pub fn new(config: EmailConfig) -> Self {
        let mailer = if !config.smtp_username.is_empty() && !config.smtp_password.is_empty() {
            let credentials = Credentials::new(
                config.smtp_username.clone(),
                config.smtp_password.clone(),
            );

            Some(
                SmtpTransport::relay(&config.smtp_host)
                    .unwrap_or_else(|_| SmtpTransport::builder_dangerous(&config.smtp_host))
                    .port(config.smtp_port)
                    .credentials(credentials)
                    .build(),
            )
        } else {
            log::warn!("SMTP credentials not configured, email sending will be simulated");
            None
        };

        Self { config, mailer }
    }

    pub fn from_env() -> Result<Self> {
        let config = EmailConfig::from_env()?;
        Ok(Self::new(config))
    }

    /// 发送HTML邮件
    pub async fn send_html_email(
        &self,
        to_email: &str,
        to_name: &str,
        subject: &str,
        html_body: &str,
        text_body: Option<&str>,
    ) -> Result<()> {
        let from = format!("{} <{}>", self.config.from_name, self.config.from_email)
            .parse::<Mailbox>()
            .context("Invalid from email")?;

        let to = format!("{} <{}>", to_name, to_email)
            .parse::<Mailbox>()
            .context("Invalid to email")?;

        let message_builder = Message::builder()
            .from(from)
            .to(to)
            .subject(subject);

        // 构建邮件内容
        let email = if let Some(text) = text_body {
            message_builder
                .multipart(
                    MultiPart::alternative()
                        .singlepart(
                            SinglePart::builder()
                                .header(ContentType::TEXT_PLAIN)
                                .body(text.to_string()),
                        )
                        .singlepart(
                            SinglePart::builder()
                                .header(ContentType::TEXT_HTML)
                                .body(html_body.to_string()),
                        ),
                )
                .context("Failed to build email")?
        } else {
            message_builder
                .header(ContentType::TEXT_HTML)
                .body(html_body.to_string())
                .context("Failed to build email")?
        };

        // 发送邮件
        if let Some(mailer) = &self.mailer {
            match mailer.send(&email) {
                Ok(response) => {
                    log::info!("Email sent successfully to {}: {:?}", to_email, response);
                    Ok(())
                }
                Err(e) => {
                    log::error!("Failed to send email to {}: {:?}", to_email, e);
                    Err(anyhow::anyhow!("Failed to send email: {}", e))
                }
            }
        } else {
            log::info!("📧 [SIMULATED] Email would be sent to: {}", to_email);
            log::info!("Subject: {}", subject);
            log::debug!("Body: {}", html_body);
            Ok(())
        }
    }

    /// 批量发送邮件（带限流）
    pub async fn send_bulk_emails(
        &self,
        emails: Vec<(String, String, String, String)>, // (to_email, to_name, subject, html_body)
        rate_limit_per_hour: usize,
    ) -> Result<Vec<Result<()>>> {
        let mut results = Vec::new();
        let delay_ms = if rate_limit_per_hour > 0 {
            3600_000 / rate_limit_per_hour as u64
        } else {
            0
        };

        for (to_email, to_name, subject, html_body) in emails {
            let result = self.send_html_email(&to_email, &to_name, &subject, &html_body, None).await;
            results.push(result);

            if delay_ms > 0 {
                tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
            }
        }

        Ok(results)
    }
}

/// 从HTML中提取纯文本（简单实现）
pub fn html_to_text(html: &str) -> String {
    // 简单地移除HTML标签
    let re = regex::Regex::new(r"<[^>]*>").unwrap();
    re.replace_all(html, "").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_email_simulation() {
        let config = EmailConfig {
            smtp_host: "localhost".to_string(),
            smtp_port: 587,
            smtp_username: "".to_string(),
            smtp_password: "".to_string(),
            from_email: "test@example.com".to_string(),
            from_name: "Test Sender".to_string(),
        };

        let sender = EmailSender::new(config);
        let result = sender.send_html_email(
            "recipient@example.com",
            "Test Recipient",
            "Test Subject",
            "<h1>Test Email</h1>",
            None,
        ).await;

        assert!(result.is_ok());
    }
}

