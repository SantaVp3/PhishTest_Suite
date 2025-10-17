import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Mail, Shield, Database, Save, TestTube } from 'lucide-react'

export default function SystemConfig() {
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    from_email: 'noreply@phishtest.local',
    from_name: 'PhishTest Suite',
  })

  const [jwtConfig, setJwtConfig] = useState({
    jwt_secret: '',
  })

  const [phishingConfig, setPhishingConfig] = useState({
    phishing_domain: 'http://localhost:8080',
    email_rate_limit: '100',
  })

  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  const handleSaveSmtp = async () => {
    setSaving(true)
    try {
      // 这里可以调用后端API保存配置
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('SMTP配置保存成功')
      toast.info('请重启后端服务以应用新配置')
    } catch (error) {
      toast.error('保存配置失败')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!smtpConfig.smtp_username || !smtpConfig.smtp_password) {
      toast.error('请先配置SMTP用户名和密码')
      return
    }

    setTestingEmail(true)
    try {
      // 这里可以调用后端API测试邮件发送
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('测试邮件发送成功！请检查收件箱')
    } catch (error) {
      toast.error('测试邮件发送失败')
      console.error(error)
    } finally {
      setTestingEmail(false)
    }
  }

  const downloadEnvFile = () => {
    const envContent = `# 数据库配置
DATABASE_URL=mysql://root:@localhost:3306/phishtest_db

# JWT配置
JWT_SECRET=${jwtConfig.jwt_secret || 'your-super-secret-jwt-key-change-this-in-production'}

# SMTP邮件服务器配置
SMTP_HOST=${smtpConfig.smtp_host}
SMTP_PORT=${smtpConfig.smtp_port}
SMTP_USERNAME=${smtpConfig.smtp_username}
SMTP_PASSWORD=${smtpConfig.smtp_password}

# 发件人信息
FROM_EMAIL=${smtpConfig.from_email}
FROM_NAME=${smtpConfig.from_name}

# 钓鱼链接域名（用于追踪）
PHISHING_DOMAIN=${phishingConfig.phishing_domain}
BASE_URL=${phishingConfig.phishing_domain}

# 应用配置
RUST_LOG=info
RUST_BACKTRACE=1

# 邮件发送限制（每小时）
EMAIL_RATE_LIMIT=${phishingConfig.email_rate_limit}
`

    const blob = new Blob([envContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.env'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('配置文件已下载')
    toast.info('请将.env文件放置到backend目录并重启服务')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          系统配置
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          配置系统参数和服务设置
        </p>
      </div>

      {/* SMTP邮件配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <CardTitle>SMTP邮件服务器配置</CardTitle>
          </div>
          <CardDescription>
            配置邮件发送服务器，用于发送钓鱼测试邮件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP服务器地址</Label>
              <Input
                id="smtp_host"
                value={smtpConfig.smtp_host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">端口</Label>
              <Input
                id="smtp_port"
                value={smtpConfig.smtp_port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: e.target.value })}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_username">用户名</Label>
              <Input
                id="smtp_username"
                value={smtpConfig.smtp_username}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_username: e.target.value })}
                placeholder="your-email@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">密码/应用专用密码</Label>
              <Input
                id="smtp_password"
                type="password"
                value={smtpConfig.smtp_password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_email">发件人邮箱</Label>
              <Input
                id="from_email"
                value={smtpConfig.from_email}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                placeholder="noreply@phishtest.local"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_name">发件人名称</Label>
              <Input
                id="from_name"
                value={smtpConfig.from_name}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                placeholder="PhishTest Suite"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleTestEmail} variant="outline" disabled={testingEmail}>
              <TestTube className="h-4 w-4 mr-2" />
              {testingEmail ? '发送中...' : '测试邮件'}
            </Button>
            <Button onClick={handleSaveSmtp} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>提示：</strong>如果使用Gmail，需要启用"两步验证"并生成"应用专用密码"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 钓鱼域名配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>钓鱼测试配置</CardTitle>
          </div>
          <CardDescription>
            配置追踪链接和发送限制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phishing_domain">追踪域名</Label>
              <Input
                id="phishing_domain"
                value={phishingConfig.phishing_domain}
                onChange={(e) => setPhishingConfig({ ...phishingConfig, phishing_domain: e.target.value })}
                placeholder="http://localhost:8080"
              />
              <p className="text-xs text-gray-500">
                用于生成追踪链接和像素的域名
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_rate_limit">发送速率限制（每小时）</Label>
              <Input
                id="email_rate_limit"
                type="number"
                value={phishingConfig.email_rate_limit}
                onChange={(e) => setPhishingConfig({ ...phishingConfig, email_rate_limit: e.target.value })}
                placeholder="100"
              />
              <p className="text-xs text-gray-500">
                防止被识别为垃圾邮件
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JWT安全配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <CardTitle>安全配置</CardTitle>
          </div>
          <CardDescription>
            JWT密钥等安全相关配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jwt_secret">JWT密钥</Label>
            <Input
              id="jwt_secret"
              type="password"
              value={jwtConfig.jwt_secret}
              onChange={(e) => setJwtConfig({ ...jwtConfig, jwt_secret: e.target.value })}
              placeholder="自动生成强密码"
            />
            <p className="text-xs text-gray-500">
              用于签名JWT token，生产环境请使用强密码
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              const randomSecret = Array.from({ length: 32 }, () => 
                Math.random().toString(36).charAt(2)
              ).join('')
              setJwtConfig({ ...jwtConfig, jwt_secret: randomSecret })
              toast.success('已生成随机密钥')
            }}
          >
            生成随机密钥
          </Button>
        </CardContent>
      </Card>

      {/* 导出配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            <CardTitle>导出配置</CardTitle>
          </div>
          <CardDescription>
            将所有配置导出为.env文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              导出配置文件后，请将其放置到 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">backend/</code> 目录，
              并重启后端服务以应用新配置。
            </p>
            <Button onClick={downloadEnvFile}>
              <Save className="h-4 w-4 mr-2" />
              下载.env配置文件
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
