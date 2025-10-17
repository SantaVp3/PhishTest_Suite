-- ============================================
-- PhishTest Suite - 数据库升级脚本
-- 版本: v1.1 -> v1.2
-- 功能: 增强追踪功能，添加IP、User-Agent、设备信息等字段
-- 日期: 2025-10-17
-- ============================================

-- 说明：
-- 如果你的数据库已经存在，运行此脚本将添加新的追踪字段
-- 对于新安装，直接运行应用程序即可，迁移脚本会自动创建表

USE phishtest_db;

-- 备份提示
SELECT '⚠️  建议先备份数据库！运行命令: mysqldump -u root -p phishtest_db > backup_$(date +%Y%m%d_%H%M%S).sql' AS 'IMPORTANT';

-- 检查表是否存在
SELECT CONCAT('✅ 检查 campaign_recipients 表...') AS 'Status';

-- 为 campaign_recipients 表添加新的追踪字段
-- 使用 ALTER TABLE ... ADD COLUMN IF NOT EXISTS 语法（MySQL 8.0.13+）
-- 如果使用较旧版本的 MySQL，可能需要手动检查字段是否存在

-- 打开追踪字段
ALTER TABLE campaign_recipients 
ADD COLUMN IF NOT EXISTS opened_ip VARCHAR(45) AFTER opened_at,
ADD COLUMN IF NOT EXISTS opened_user_agent TEXT AFTER opened_ip,
ADD COLUMN IF NOT EXISTS opened_device_type VARCHAR(50) AFTER opened_user_agent,
ADD COLUMN IF NOT EXISTS opened_os VARCHAR(100) AFTER opened_device_type,
ADD COLUMN IF NOT EXISTS opened_browser VARCHAR(100) AFTER opened_os;

SELECT '✅ 添加邮件打开追踪字段完成' AS 'Status';

-- 点击追踪字段
ALTER TABLE campaign_recipients 
ADD COLUMN IF NOT EXISTS clicked_ip VARCHAR(45) AFTER clicked_at,
ADD COLUMN IF NOT EXISTS clicked_user_agent TEXT AFTER clicked_ip,
ADD COLUMN IF NOT EXISTS clicked_device_type VARCHAR(50) AFTER clicked_user_agent,
ADD COLUMN IF NOT EXISTS clicked_os VARCHAR(100) AFTER clicked_device_type,
ADD COLUMN IF NOT EXISTS clicked_browser VARCHAR(100) AFTER clicked_os,
ADD COLUMN IF NOT EXISTS clicked_location VARCHAR(255) AFTER clicked_browser;

SELECT '✅ 添加链接点击追踪字段完成' AS 'Status';

-- 验证新字段是否添加成功
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'phishtest_db'
    AND TABLE_NAME = 'campaign_recipients'
    AND COLUMN_NAME IN (
        'opened_ip', 'opened_user_agent', 'opened_device_type', 'opened_os', 'opened_browser',
        'clicked_ip', 'clicked_user_agent', 'clicked_device_type', 'clicked_os', 'clicked_browser', 'clicked_location'
    )
ORDER BY ORDINAL_POSITION;

SELECT '✅ 数据库升级完成！新的追踪字段已添加。' AS 'Status';
SELECT '📊 现在当用户点击邮件链接时，系统将自动记录：IP地址、设备类型、操作系统、浏览器、地理位置' AS 'Info';
SELECT '🚀 请重启后端服务以应用更改: cd backend && cargo run' AS 'Next Step';

