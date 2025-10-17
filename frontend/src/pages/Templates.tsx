import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { apiClient, Template } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Eye,
  Edit,
  Copy,
  Trash2
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import EmailTemplateEditor from '@/components/EmailTemplateEditor'

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'phishing',
    description: '',
    subject: '',
    content: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getTemplates()
      setTemplates(data.templates)
    } catch (error) {
      toast.error('加载模板列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast.error('请填写模板名称和邮件主题')
      return
    }

    if (!newTemplate.content.trim()) {
      toast.error('请填写邮件内容')
      return
    }

    try {
      console.log('创建模板数据:', newTemplate)
      await apiClient.createTemplate(newTemplate)
      toast.success('模板创建成功')
      setIsCreateDialogOpen(false)
      setNewTemplate({ name: '', category: 'phishing', description: '', subject: '', content: '' })
      loadTemplates()
    } catch (error: any) {
      const errorMessage = error.message || '创建模板失败'
      toast.error(errorMessage)
      console.error('创建模板错误:', error)
    }
  }

  const handleSaveTemplate = async (templateData: any) => {
    try {
      console.log('保存模板数据:', templateData)
      if (templateData.id) {
        await apiClient.updateTemplate(templateData.id, templateData)
        toast.success('模板更新成功')
      } else {
        await apiClient.createTemplate(templateData)
        toast.success('模板创建成功')
      }
      setIsEditorOpen(false)
      setEditingTemplate(null)
      loadTemplates()
    } catch (error: any) {
      const errorMessage = error.message || (templateData.id ? '更新模板失败' : '创建模板失败')
      toast.error(errorMessage)
      console.error('保存模板错误:', error)
    }
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setIsEditorOpen(true)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？此操作不可撤销。')) {
      return
    }

    try {
      await apiClient.deleteTemplate(id)
      toast.success('模板删除成功')
      loadTemplates()
    } catch (error) {
      toast.error('删除模板失败')
      console.error(error)
    }
  }

  const handleCopyTemplate = async (template: Template) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (副本)`,
        id: undefined
      }
      await apiClient.createTemplate(newTemplate)
      toast.success('模板复制成功')
      loadTemplates()
    } catch (error) {
      toast.error('复制模板失败')
      console.error(error)
    }
  }

  const openTemplateEditor = () => {
    setEditingTemplate(null)
    setIsEditorOpen(true)
  }

  const filteredTemplates = templates.filter((template: any) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 如果编辑器打开，显示编辑器
  if (isEditorOpen) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setIsEditorOpen(false)
          setEditingTemplate(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            邮件模板管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            创建和管理钓鱼邮件模板
          </p>
        </div>
        <Button onClick={openTemplateEditor}>
          <Plus className="mr-2 h-4 w-4" />
          创建新模板
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          筛选
        </Button>
      </div>

      {/* 创建模板对话框 */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">创建新模板</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">模板名称</label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="输入模板名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">模板类别</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="phishing">钓鱼邮件</option>
                    <option value="spear-phishing">鱼叉式钓鱼</option>
                    <option value="social-engineering">社会工程学</option>
                    <option value="malware">恶意软件</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">模板描述</label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="输入模板描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮件主题</label>
                <Input
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="输入邮件主题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮件内容</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="输入邮件HTML内容"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTemplate}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">加载中...</div>
              </CardContent>
            </Card>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="暂无邮件模板"
                  description="您还没有创建任何邮件模板。创建您的第一个模板来开始设计钓鱼邮件。"
                  actionLabel="创建第一个模板"
                  onAction={() => setIsCreateDialogOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredTemplates.map((template: any) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      邮件主题
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      {template.subject}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      内容预览
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {template.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-gray-500">
                      创建于 {new Date(template.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        title="预览模板"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        title="编辑模板"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCopyTemplate(template)}
                        title="复制模板"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="删除模板"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}