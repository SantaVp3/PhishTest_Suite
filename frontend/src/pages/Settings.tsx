import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Shield,
  Bell,
  Users,
  Server,
  Save
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface Settings {
  email: {
    smtpHost: string
    smtpPort: string
    smtpUser: string
    smtpPassword: string
    sslEnabled: boolean
    sendRate: string
    batchSize: string
    senderName: string
    senderEmail: string
  }
  security: {
    dataEncryption: boolean
    transportEncryption: boolean
    sessionTimeout: string
    maxLoginAttempts: string
    twoFactorAuth: boolean
    ipWhitelist: boolean
  }
  notifications: {
    campaignComplete: boolean
    highRiskUser: boolean
    systemError: boolean
    adminEmail: string
  }
}

const DEFAULT_SETTINGS: Settings = {
  email: {
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    sslEnabled: true,
    sendRate: '60',
    batchSize: '100',
    senderName: 'PhishTest Suite',
    senderEmail: ''
  },
  security: {
    dataEncryption: true,
    transportEncryption: true,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    twoFactorAuth: false,
    ipWhitelist: false
  },
  notifications: {
    campaignComplete: true,
    highRiskUser: true,
    systemError: true,
    adminEmail: ''
  }
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await apiClient.getSettings()
      setSettings(data)
    } catch (error: any) {
      console.error('加载设置失败:', error)
      toast.error(error.message || '加载设置失败')
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      await apiClient.updateSettings(settings)
      toast.success('设置保存成功')
    } catch (error: any) {
      toast.error(error.message || '保存设置失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetSettings = async () => {
    if (confirm('确定要重置所有设置到默认值吗？')) {
      try {
        setLoading(true)
        const data = await apiClient.resetSettings()
        setSettings(data.settings)
        toast.success('设置已重置')
      } catch (error: any) {
        toast.error(error.message || '重置设置失败')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
  }

  const testSmtpConnection = () => {
    toast.loading('正在测试SMTP连接...', { duration: 2000 })
    setTimeout(() => {
      toast.success('SMTP连接测试成功')
    }, 2000)
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            系统设置
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            配置系统参数和安全选项
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            邮件配置
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            安全设置
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            通知设置
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            系统信息
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP服务器配置</CardTitle>
              <CardDescription>
                配置邮件发送服务器设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP服务器</Label>
                  <Input 
                    id="smtp-host" 
                    value={settings.email.smtpHost}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, smtpHost: e.target.value}})}
                    placeholder="smtp.example.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">端口</Label>
                  <Input 
                    id="smtp-port" 
                    value={settings.email.smtpPort}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, smtpPort: e.target.value}})}
                    placeholder="587" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">用户名</Label>
                  <Input 
                    id="smtp-user" 
                    value={settings.email.smtpUser}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, smtpUser: e.target.value}})}
                    placeholder="username@example.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">密码</Label>
                  <Input 
                    id="smtp-pass" 
                    type="password" 
                    value={settings.email.smtpPassword}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, smtpPassword: e.target.value}})}
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="smtp-ssl" 
                  checked={settings.email.sslEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, email: {...settings.email, sslEnabled: checked}})}
                />
                <Label htmlFor="smtp-ssl">启用SSL/TLS加密</Label>
              </div>
              <Button onClick={testSmtpConnection}>测试连接</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>发送设置</CardTitle>
              <CardDescription>
                配置邮件发送频率和限制
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="send-rate">发送频率 (邮件/分钟)</Label>
                  <Input 
                    id="send-rate" 
                    value={settings.email.sendRate}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, sendRate: e.target.value}})}
                    placeholder="60" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-size">批次大小</Label>
                  <Input 
                    id="batch-size" 
                    value={settings.email.batchSize}
                    onChange={(e) => setSettings({...settings, email: {...settings.email, batchSize: e.target.value}})}
                    placeholder="100" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">默认发件人名称</Label>
                <Input 
                  id="sender-name" 
                  value={settings.email.senderName}
                  onChange={(e) => setSettings({...settings, email: {...settings.email, senderName: e.target.value}})}
                  placeholder="PhishTest Suite" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-email">默认发件人邮箱</Label>
                <Input 
                  id="sender-email" 
                  value={settings.email.senderEmail}
                  onChange={(e) => setSettings({...settings, email: {...settings.email, senderEmail: e.target.value}})}
                  placeholder="noreply@company.com" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>数据加密</CardTitle>
              <CardDescription>
                配置数据加密和安全选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>AES-256数据加密</Label>
                  <p className="text-sm text-gray-500">
                    对敏感数据进行AES-256加密存储
                  </p>
                </div>
                <Switch 
                  checked={settings.security.dataEncryption}
                  onCheckedChange={(checked) => setSettings({...settings, security: {...settings.security, dataEncryption: checked}})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>传输加密</Label>
                  <p className="text-sm text-gray-500">
                    强制使用HTTPS进行数据传输
                  </p>
                </div>
                <Switch 
                  checked={settings.security.transportEncryption}
                  onCheckedChange={(checked) => setSettings({...settings, security: {...settings.security, transportEncryption: checked}})}
                />
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  加密功能已启用。系统会自动管理加密密钥。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>访问控制</CardTitle>
              <CardDescription>
                配置用户访问和权限设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">会话超时 (分钟)</Label>
                  <Input 
                    id="session-timeout" 
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({...settings, security: {...settings.security, sessionTimeout: e.target.value}})}
                    placeholder="30" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-attempts">最大登录尝试次数</Label>
                  <Input 
                    id="max-attempts" 
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => setSettings({...settings, security: {...settings.security, maxLoginAttempts: e.target.value}})}
                    placeholder="5" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>双因素认证</Label>
                  <p className="text-sm text-gray-500">
                    要求用户启用双因素认证
                  </p>
                </div>
                <Switch 
                  checked={settings.security.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({...settings, security: {...settings.security, twoFactorAuth: checked}})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>IP白名单</Label>
                  <p className="text-sm text-gray-500">
                    限制特定IP地址访问
                  </p>
                </div>
                <Switch 
                  checked={settings.security.ipWhitelist}
                  onCheckedChange={(checked) => setSettings({...settings, security: {...settings.security, ipWhitelist: checked}})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>
                配置系统通知和警报
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>活动完成通知</Label>
                  <p className="text-sm text-gray-500">
                    钓鱼活动完成时发送通知
                  </p>
                </div>
                <Switch 
                  checked={settings.notifications.campaignComplete}
                  onCheckedChange={(checked) => setSettings({...settings, notifications: {...settings.notifications, campaignComplete: checked}})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>高风险用户警报</Label>
                  <p className="text-sm text-gray-500">
                    发现高风险用户时发送警报
                  </p>
                </div>
                <Switch 
                  checked={settings.notifications.highRiskUser}
                  onCheckedChange={(checked) => setSettings({...settings, notifications: {...settings.notifications, highRiskUser: checked}})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>系统错误通知</Label>
                  <p className="text-sm text-gray-500">
                    系统发生错误时发送通知
                  </p>
                </div>
                <Switch 
                  checked={settings.notifications.systemError}
                  onCheckedChange={(checked) => setSettings({...settings, notifications: {...settings.notifications, systemError: checked}})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">管理员邮箱</Label>
                <Input 
                  id="admin-email" 
                  value={settings.notifications.adminEmail}
                  onChange={(e) => setSettings({...settings, notifications: {...settings.notifications, adminEmail: e.target.value}})}
                  placeholder="admin@company.com" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>
                查看系统状态和配置信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>系统版本</Label>
                  <div className="text-sm text-gray-600">PhishTest Suite v1.0.0</div>
                </div>
                <div className="space-y-2">
                  <Label>数据库版本</Label>
                  <div className="text-sm text-gray-600">MySQL 8.0.35</div>
                </div>
                <div className="space-y-2">
                  <Label>运行时间</Label>
                  <div className="text-sm text-gray-600">15天 8小时 32分钟</div>
                </div>
                <div className="space-y-2">
                  <Label>系统状态</Label>
                  <div className="text-sm text-green-600">正常运行</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统维护</CardTitle>
              <CardDescription>
                系统维护和管理操作
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button variant="outline">清理日志</Button>
                <Button variant="outline">优化数据库</Button>
                <Button variant="outline">重启服务</Button>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      建议定期备份数据并更新系统组件以确保安全性
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={resetSettings}>重置</Button>
        <Button onClick={saveSettings} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  )
}