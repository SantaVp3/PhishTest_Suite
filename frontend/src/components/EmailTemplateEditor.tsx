import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Code, 
  Save, 
  Undo, 
  Redo, 
  Bold, 
  Italic, 
  Underline,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Palette,
  Type,
  Monitor,
  Smartphone,
  Tablet,
  Plus
} from 'lucide-react'

interface EmailTemplateEditorProps {
  template?: {
    id?: string
    name: string
    subject: string
    content: string
    variables?: string[]
  } | null
  onSave: (template: any) => void
  onCancel: () => void
}

export default function EmailTemplateEditor({ template, onSave, onCancel }: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '')
  const [subject, setSubject] = useState(template?.subject || '')
  const [content, setContent] = useState(template?.content || '')
  const [variables, setVariables] = useState<string[]>(template?.variables || [])
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showVariables, setShowVariables] = useState(false)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)

  // 预设的钓鱼场景模板
  const presetTemplates = [
    {
      name: '银行安全验证',
      subject: '紧急：您的账户存在异常登录，请立即验证',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://via.placeholder.com/200x60/0066cc/ffffff?text=BANK+LOGO" alt="银行标志" style="max-width: 200px;">
            </div>
            <h2 style="color: #d32f2f; text-align: center; margin-bottom: 20px;">安全警告</h2>
            <p>尊敬的 {{name}} 客户：</p>
            <p>我们检测到您的账户在 {{login_time}} 存在异常登录行为，登录地点：{{location}}。</p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong>为了保护您的账户安全，请立即点击下方按钮进行身份验证：</strong>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verification_link}}" style="background: #d32f2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">立即验证身份</a>
            </div>
            <p style="color: #666; font-size: 12px;">如果您无法点击按钮，请复制以下链接到浏览器：<br>{{verification_link}}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 11px; text-align: center;">此邮件由系统自动发送，请勿回复。如有疑问请联系客服。</p>
          </div>
        </div>
      `,
      variables: ['name', 'login_time', 'location', 'verification_link']
    },
    {
      name: 'IT部门系统升级',
      subject: '[IT通知] 系统升级 - 需要重新验证您的账户',
      content: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">IT 部门通知</h1>
          </div>
          <div style="background: white; padding: 30px;">
            <p>亲爱的 {{employee_name}}：</p>
            <p>我们将在 {{upgrade_date}} 进行重要的系统安全升级。为确保您能够正常访问公司系统，请在升级前完成账户验证。</p>
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">需要您的操作：</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>验证您的登录凭据</li>
                <li>更新安全设置</li>
                <li>确认联系信息</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verification_portal}}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold;">开始验证</a>
            </div>
            <p style="color: #dc3545; font-weight: bold;">⚠️ 请在 {{deadline}} 前完成验证，否则您的账户将被临时锁定。</p>
            <p>如有任何问题，请联系IT支持：{{support_email}}</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">IT部门 | {{company_name}}<br>发送时间：{{send_time}}</p>
          </div>
        </div>
      `,
      variables: ['employee_name', 'upgrade_date', 'verification_portal', 'deadline', 'support_email', 'company_name', 'send_time']
    },
    {
      name: '社交媒体安全提醒',
      subject: '您的账户安全设置需要更新',
      content: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 36px; color: #667eea;">🔒</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">安全提醒</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; line-height: 1.6;">你好 {{username}}，</p>
            <p style="font-size: 16px; line-height: 1.6;">我们注意到您的账户在 {{suspicious_time}} 有可疑活动。为了保护您的隐私和数据安全，我们建议您立即更新安全设置。</p>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #495057; margin: 0 0 15px 0;">检测到的活动：</h3>
              <ul style="color: #6c757d; margin: 0; padding-left: 20px;">
                <li>来自 {{suspicious_location}} 的登录尝试</li>
                <li>设备：{{device_info}}</li>
                <li>IP地址：{{ip_address}}</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="{{security_settings_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">更新安全设置</a>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;"><strong>提示：</strong>如果这不是您的操作，请立即更改密码并启用两步验证。</p>
            </div>

            <p style="color: #6c757d; font-size: 14px; line-height: 1.5;">如果您有任何疑问，请随时联系我们的支持团队。</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">© {{current_year}} {{platform_name}}. 保留所有权利。</p>
          </div>
        </div>
      `,
      variables: ['username', 'suspicious_time', 'suspicious_location', 'device_info', 'ip_address', 'security_settings_url', 'current_year', 'platform_name']
    }
  ]

  // 工具栏按钮
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  // 插入变量
  const insertVariable = (variable: string) => {
    const textarea = editorRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + `{{${variable}}}` + content.substring(end)
      setContent(newContent)
      
      // 重新设置光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
      }, 0)
    }
  }

  // 添加新变量
  const addVariable = () => {
    const newVar = prompt('请输入变量名称（不包含大括号）：')
    if (newVar && !variables.includes(newVar)) {
      setVariables([...variables, newVar])
    }
  }

  // 移除变量
  const removeVariable = (variable: string) => {
    setVariables(variables.filter(v => v !== variable))
  }

  // 应用预设模板
  const applyPresetTemplate = (preset: any) => {
    setName(preset.name)
    setSubject(preset.subject)
    setContent(preset.content)
    setVariables(preset.variables)
  }

  // 更新预览
  useEffect(() => {
    if (viewMode === 'preview' && previewRef.current) {
      const previewDoc = previewRef.current.contentDocument
      if (previewDoc) {
        // 替换变量为示例数据
        let previewContent = content
        variables.forEach(variable => {
          const placeholder = getVariablePlaceholder(variable)
          previewContent = previewContent.replace(new RegExp(`{{${variable}}}`, 'g'), placeholder)
        })
        
        previewDoc.open()
        previewDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>邮件预览</title>
            </head>
            <body style="margin: 0; padding: 20px; background: #f5f5f5;">
              ${previewContent}
            </body>
          </html>
        `)
        previewDoc.close()
      }
    }
  }, [content, variables, viewMode])

  // 获取变量占位符
  const getVariablePlaceholder = (variable: string): string => {
    const placeholders: { [key: string]: string } = {
      name: '张三',
      username: 'zhangsan',
      employee_name: '李四',
      email: 'user@example.com',
      login_time: '2024-01-15 14:30:25',
      location: '北京市朝阳区',
      verification_link: 'https://example.com/verify',
      upgrade_date: '2024-01-20',
      deadline: '2024-01-18 23:59',
      support_email: 'support@company.com',
      company_name: '示例公司',
      send_time: '2024-01-15 15:00:00',
      suspicious_time: '今天 14:25',
      suspicious_location: '上海市浦东新区',
      device_info: 'iPhone 12 Pro',
      ip_address: '192.168.1.100',
      security_settings_url: 'https://example.com/security',
      current_year: '2024',
      platform_name: '示例平台',
      verification_portal: 'https://portal.example.com'
    }
    return placeholders[variable] || `[${variable}]`
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入模板名称')
      return
    }
    if (!subject.trim()) {
      alert('请输入邮件主题')
      return
    }
    if (!content.trim()) {
      alert('请输入邮件内容')
      return
    }

    onSave({
      id: template?.id,
      name: name.trim(),
      subject: subject.trim(),
      content: content.trim(),
      variables
    })
  }

  return (
    <div className="space-y-6">
      {/* 头部工具栏 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {template?.id ? '编辑模板' : '创建模板'}
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('edit')}
            >
              <Code className="h-4 w-4 mr-1" />
              编辑
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4 mr-1" />
              预览
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            保存模板
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：预设模板和变量 */}
        <div className="space-y-4">
          {/* 预设模板 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">预设模板</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {presetTemplates.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => applyPresetTemplate(preset)}
                >
                  <div>
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {preset.subject}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* 变量管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                变量管理
                <Button size="sm" variant="outline" onClick={addVariable}>
                  <Plus className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {variables.map((variable, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeVariable(variable)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {variables.length === 0 && (
                  <p className="text-sm text-gray-500">暂无变量</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 中间：编辑器 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 基本信息 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">模板名称</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入模板名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮件主题</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="输入邮件主题"
                />
              </div>
            </CardContent>
          </Card>

          {/* 内容编辑器 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">邮件内容</CardTitle>
                {viewMode === 'preview' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={devicePreview === 'desktop' ? 'default' : 'outline'}
                      onClick={() => setDevicePreview('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={devicePreview === 'tablet' ? 'default' : 'outline'}
                      onClick={() => setDevicePreview('tablet')}
                    >
                      <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={devicePreview === 'mobile' ? 'default' : 'outline'}
                      onClick={() => setDevicePreview('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'edit' ? (
                <div className="space-y-2">
                  {/* 格式化工具栏 */}
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-gray-50">
                    <Button size="sm" variant="ghost" onClick={() => formatText('bold')}>
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => formatText('italic')}>
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => formatText('underline')}>
                      <Underline className="h-4 w-4" />
                    </Button>
                    <div className="w-px bg-gray-300 mx-1"></div>
                    <Button size="sm" variant="ghost" onClick={() => formatText('justifyLeft')}>
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => formatText('justifyCenter')}>
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => formatText('justifyRight')}>
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px bg-gray-300 mx-1"></div>
                    <Button size="sm" variant="ghost" onClick={() => formatText('insertUnorderedList')}>
                      <List className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => formatText('insertOrderedList')}>
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Textarea
                    ref={editorRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="输入邮件HTML内容..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <iframe
                    ref={previewRef}
                    className={`w-full border-0 ${
                      devicePreview === 'mobile' 
                        ? 'max-w-sm mx-auto' 
                        : devicePreview === 'tablet'
                        ? 'max-w-2xl mx-auto'
                        : 'w-full'
                    }`}
                    style={{ 
                      height: '500px',
                      transform: devicePreview === 'mobile' ? 'scale(0.8)' : 'scale(1)',
                      transformOrigin: 'top center'
                    }}
                    title="邮件预览"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}