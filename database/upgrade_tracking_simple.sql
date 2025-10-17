-- 数据库升级脚本（兼容旧版MySQL）
USE phishtest_db;

-- 打开追踪字段
ALTER TABLE campaign_recipients 
ADD COLUMN opened_ip VARCHAR(45) AFTER opened_at,
ADD COLUMN opened_user_agent TEXT AFTER opened_ip,
ADD COLUMN opened_device_type VARCHAR(50) AFTER opened_user_agent,
ADD COLUMN opened_os VARCHAR(100) AFTER opened_device_type,
ADD COLUMN opened_browser VARCHAR(100) AFTER opened_os;

-- 点击追踪字段
ALTER TABLE campaign_recipients 
ADD COLUMN clicked_ip VARCHAR(45) AFTER clicked_at,
ADD COLUMN clicked_user_agent TEXT AFTER clicked_ip,
ADD COLUMN clicked_device_type VARCHAR(50) AFTER clicked_user_agent,
ADD COLUMN clicked_os VARCHAR(100) AFTER clicked_device_type,
ADD COLUMN clicked_browser VARCHAR(100) AFTER clicked_os,
ADD COLUMN clicked_location VARCHAR(255) AFTER clicked_browser;

SELECT '✅ 数据库升级完成！' AS Status;

