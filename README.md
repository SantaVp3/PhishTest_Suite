# PhishTest Suite - 企业安全意识评估平台

一个专业的邮件钓鱼测试平台，用于企业安全意识培训和评估。

## 🚀 技术栈

### 前端
- **React 18** + TypeScript
- **Tailwind CSS** - 现代化样式框架
- **ShadCN UI** - 高质量组件库
- **Vite** - 快速构建工具

### 后端
- **Rust** + Actix-web框架
- **MySQL 8.0** - 主数据库（支持读写分离）
- **AES-256加密** - 数据安全保护

## 📋 核心功能

### 1. 钓鱼邮件管理
- 🎨 可视化邮件模板编辑器（HTML/CSS自定义）
- 👥 收件人分组管理（CSV导入/手动添加）
- ⏰ 智能发送调度系统（定时/分批发送）

### 2. 场景模拟引擎
- 📧 12种预置钓鱼场景模板
- 🎭 高级伪装选项（域名克隆、链接重定向）
- 📱 响应式邮件设计支持

### 3. 数据分析中心
- 📊 实时数据看板（送达/打开/点击率监测）
- 🔥 用户行为热力图分析
- 🎯 智能风险评估模型

## 🏗️ 项目结构

```
PhishTest Suite/
├── frontend/          # React前端应用
├── backend/           # Rust后端服务
├── database/          # 数据库脚本
├── docs/             # 项目文档
└── docker/           # Docker配置
```

## 🔒 安全特性

- AES-256数据加密存储
- JWT身份认证
- RBAC权限控制
- SQL注入防护
- XSS攻击防护

## 🚀 快速开始

### 前端开发
```bash
cd frontend
npm install
npm run dev
```

### 后端开发
```bash
cd backend
cargo run
```

## 📄 许可证

本项目仅用于合法的安全测试和企业培训目的。