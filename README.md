# PhishTest Suite

一个钓鱼邮件测试平台，用于企业安全意识培训。

## 技术栈

### 后端
- Rust + Actix-web
- MySQL 8.0
- JWT 认证
- bcrypt 密码加密

### 前端
- React 18 + TypeScript
- Tailwind CSS
- Vite

## 主要功能

### 邮件模板
- 创建和编辑HTML邮件模板
- 支持变量替换（收件人姓名、邮箱等）
- 模板分类管理

### 收件人管理
- 手动添加收件人
- CSV批量导入
- 按部门分组

### 钓鱼活动
- 创建测试活动
- 选择模板和收件人
- 发送测试邮件

### 追踪功能
- 邮件打开追踪（追踪像素）
- 链接点击追踪
- 记录以下信息：
  - IP地址
  - 设备类型（Desktop/Mobile/Tablet）
  - 操作系统（Windows/macOS/iOS/Android/Linux）
  - 浏览器（Chrome/Firefox/Safari/Edge等）
  - 点击时间

### 数据统计
- 查看活动统计（发送/打开/点击数）
- 按部门统计
- 导出追踪数据

## 安全特性

- JWT身份认证
- bcrypt密码加密
- 密码强度验证
- SQL参数化查询（防SQL注入）
- HTTP安全响应头（XSS防护、点击劫持防护）

## 安装和使用

### 环境要求
- Rust 1.70+
- Node.js 18+
- MySQL 8.0+

### 后端启动

1. 配置环境变量：
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置数据库连接和JWT密钥
```

2. 启动后端：
```bash
cd backend
cargo run
```

后端将在 `http://localhost:8080` 启动

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动

### 数据库

首次启动时会自动创建数据库表。

如需升级数据库（添加追踪字段），运行：
```bash
mysql -u root -p phishtest_db < database/upgrade_tracking_simple.sql
```

## 项目结构

```
PhishTest Suite/
├── backend/           # Rust后端
│   ├── src/
│   │   ├── handlers/  # API处理器
│   │   ├── database/  # 数据库模型
│   │   ├── utils/     # 工具函数
│   │   └── middleware/# 中间件
│   └── Cargo.toml
├── frontend/          # React前端
│   ├── src/
│   │   ├── components/# React组件
│   │   ├── pages/     # 页面
│   │   └── lib/       # API客户端
│   └── package.json
└── database/          # SQL脚本
```

## 配置说明

### 后端环境变量（backend/.env）

```bash
# 数据库
DATABASE_URL=mysql://用户名:密码@localhost:3306/phishtest_db

# JWT密钥（必须设置）
JWT_SECRET=你的随机密钥字符串至少32位

# SMTP邮件服务器（可选，用于发送邮件）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-password

# 发件人信息
FROM_EMAIL=noreply@example.com
FROM_NAME=PhishTest Suite

# 追踪链接域名
PHISHING_DOMAIN=http://localhost:8080
```

## API端点

### 认证
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录

### 活动管理
- `GET /api/v1/campaigns` - 获取活动列表
- `POST /api/v1/campaigns` - 创建活动
- `GET /api/v1/campaigns/{id}` - 获取活动详情
- `POST /api/v1/campaigns/{id}/launch` - 启动活动

### 模板管理
- `GET /api/v1/templates` - 获取模板列表
- `POST /api/v1/templates` - 创建模板

### 收件人管理
- `GET /api/v1/recipients` - 获取收件人列表
- `POST /api/v1/recipients` - 添加收件人
- `POST /api/v1/recipients/bulk-import` - 批量导入

### 追踪
- `GET /api/v1/track/pixel/{tracking_id}` - 追踪像素（邮件打开）
- `GET /api/v1/track/click/{tracking_id}` - 追踪点击
- `GET /api/v1/campaigns/{id}/tracking-details` - 获取详细追踪数据

### 数据分析
- `GET /api/v1/analytics/dashboard` - 获取统计数据

## 注意事项

1. **JWT_SECRET** 必须设置为强随机字符串（至少32位）
2. 本项目仅用于授权的安全测试，请遵守相关法律法规
3. 发送邮件需要配置SMTP服务器
4. 默认端口：后端8080，前端3000
5. 数据库需要提前创建（或首次启动时自动创建）

## 许可

本项目仅用于合法的安全意识培训和测试目的。
