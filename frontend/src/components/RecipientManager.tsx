import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Plus, 
  Trash2, 
  Edit, 
  Users, 
  Mail, 
  FileText,
  Download,
  Search,
  Filter
} from 'lucide-react'

interface Recipient {
  id?: string
  email: string
  name: string
  department?: string
  position?: string
  group?: string
}

interface RecipientGroup {
  id: string
  name: string
  description: string
  recipients: Recipient[]
  created_at: string
}

interface RecipientManagerProps {
  onRecipientsChange?: (recipients: Recipient[]) => void
  selectedRecipients?: Recipient[]
}

export default function RecipientManager({ onRecipientsChange, selectedRecipients = [] }: RecipientManagerProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [groups, setGroups] = useState<RecipientGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [isAddingRecipient, setIsAddingRecipient] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newRecipient, setNewRecipient] = useState<Recipient>({
    email: '',
    name: '',
    department: '',
    position: '',
    group: ''
  })
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理CSV文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      const newRecipients: Recipient[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length >= 2 && values[0] && values[1]) {
          const recipient: Recipient = {
            email: values[0],
            name: values[1],
            department: values[2] || '',
            position: values[3] || '',
            group: selectedGroup !== 'all' ? selectedGroup : ''
          }
          newRecipients.push(recipient)
        }
      }
      
      setRecipients([...recipients, ...newRecipients])
      if (onRecipientsChange) {
        onRecipientsChange([...recipients, ...newRecipients])
      }
    }
    reader.readAsText(file)
  }

  // 添加单个收件人
  const handleAddRecipient = () => {
    if (!newRecipient.email || !newRecipient.name) {
      alert('请填写邮箱和姓名')
      return
    }

    const recipient: Recipient = {
      ...newRecipient,
      id: Date.now().toString(),
      group: selectedGroup !== 'all' ? selectedGroup : newRecipient.group
    }

    const updatedRecipients = [...recipients, recipient]
    setRecipients(updatedRecipients)
    setNewRecipient({ email: '', name: '', department: '', position: '', group: '' })
    setIsAddingRecipient(false)
    
    if (onRecipientsChange) {
      onRecipientsChange(updatedRecipients)
    }
  }

  // 删除收件人
  const handleDeleteRecipient = (id: string) => {
    const updatedRecipients = recipients.filter(r => r.id !== id)
    setRecipients(updatedRecipients)
    if (onRecipientsChange) {
      onRecipientsChange(updatedRecipients)
    }
  }

  // 创建分组
  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      alert('请输入分组名称')
      return
    }

    const group: RecipientGroup = {
      id: Date.now().toString(),
      name: newGroup.name,
      description: newGroup.description,
      recipients: [],
      created_at: new Date().toISOString()
    }

    setGroups([...groups, group])
    setNewGroup({ name: '', description: '' })
    setIsCreatingGroup(false)
  }

  // 导出CSV模板
  const downloadTemplate = () => {
    const csvContent = 'email,name,department,position\nexample@company.com,张三,技术部,工程师\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'recipients_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 筛选收件人
  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (recipient.department && recipient.department.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesGroup = selectedGroup === 'all' || recipient.group === selectedGroup
    
    return matchesSearch && matchesGroup
  })

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">收件人管理</h2>
          <p className="text-gray-600 mt-1">管理钓鱼测试的目标收件人</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />
            导入CSV
          </Button>
          <Button onClick={() => setIsAddingRecipient(true)}>
            <Plus className="h-4 w-4 mr-1" />
            添加收件人
          </Button>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：分组管理 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">收件人分组</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setIsCreatingGroup(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedGroup === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedGroup('all')}
              >
                <Users className="h-4 w-4 mr-2" />
                全部收件人 ({recipients.length})
              </Button>
              
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant={selectedGroup === group.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {group.name} ({group.recipients.length})
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* 统计信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">统计信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">总收件人</span>
                <Badge variant="secondary">{recipients.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">分组数量</span>
                <Badge variant="secondary">{groups.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">已选择</span>
                <Badge variant="default">{selectedRecipients.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：收件人列表 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 搜索和筛选 */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索收件人..."
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

          {/* 收件人列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                收件人列表 ({filteredRecipients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecipients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无收件人</p>
                  <p className="text-sm text-gray-400 mt-1">
                    点击"添加收件人"或"导入CSV"来添加收件人
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-sm text-gray-500">({recipient.email})</span>
                        </div>
                        {(recipient.department || recipient.position) && (
                          <div className="text-sm text-gray-500 mt-1 ml-6">
                            {recipient.department} {recipient.position && `- ${recipient.position}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {recipient.group && (
                          <Badge variant="outline" className="text-xs">
                            {groups.find(g => g.id === recipient.group)?.name || recipient.group}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecipient(recipient.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 添加收件人对话框 */}
      {isAddingRecipient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">添加收件人</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">邮箱地址 *</label>
                <Input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="输入邮箱地址"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">姓名 *</label>
                <Input
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">部门</label>
                <Input
                  value={newRecipient.department}
                  onChange={(e) => setNewRecipient({ ...newRecipient, department: e.target.value })}
                  placeholder="输入部门"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">职位</label>
                <Input
                  value={newRecipient.position}
                  onChange={(e) => setNewRecipient({ ...newRecipient, position: e.target.value })}
                  placeholder="输入职位"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">分组</label>
                <select
                  value={newRecipient.group}
                  onChange={(e) => setNewRecipient({ ...newRecipient, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">选择分组</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddingRecipient(false)}>
                取消
              </Button>
              <Button onClick={handleAddRecipient}>
                添加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 创建分组对话框 */}
      {isCreatingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">创建分组</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">分组名称 *</label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="输入分组名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">分组描述</label>
                <Input
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="输入分组描述"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                取消
              </Button>
              <Button onClick={handleCreateGroup}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}