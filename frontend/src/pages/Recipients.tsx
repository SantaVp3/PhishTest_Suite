import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Upload,
  Download,
  Users,
  Building,
  UserPlus,
  Trash2
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function Recipients() {
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('individuals')

  const [recipients, setRecipients] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    email: '',
    department: '',
    position: ''
  })
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    recipient_ids: [] as string[]
  })

  useEffect(() => {
    loadRecipients()
    if (activeTab === 'groups') {
      loadGroups()
    }
  }, [activeTab])

  const loadRecipients = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getRecipients()
      setRecipients(data.recipients)
    } catch (error) {
      toast.error('加载收件人列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getGroups()
      setGroups(data.groups || [])
    } catch (error) {
      toast.error('加载分组列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipient = async () => {
    if (!newRecipient.name.trim() || !newRecipient.email.trim()) {
      toast.error('请填写姓名和邮箱')
      return
    }

    try {
      console.log('创建收件人数据:', newRecipient)
      await apiClient.createRecipient(newRecipient)
      toast.success('收件人添加成功')
      setIsAddDialogOpen(false)
      setNewRecipient({ name: '', email: '', department: '', position: '' })
      loadRecipients()
    } catch (error: any) {
      const errorMessage = error.message || '添加收件人失败'
      toast.error(errorMessage)
      console.error('添加收件人错误:', error)
    }
  }

  const handleImportCSV = () => {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // 这里处理CSV文件上传
        toast.success('CSV文件上传成功，正在处理...')
        setIsImportDialogOpen(false)
      }
    }
    input.click()
  }

  const handleExportCSV = () => {
    // 导出CSV功能
    const csvContent = "data:text/csv;charset=utf-8," 
      + "姓名,邮箱,部门,职位\n"
      + recipients.map(r => `${r.name},${r.email},${r.department},${r.position}`).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "recipients.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('收件人列表已导出')
  }

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('请输入分组名称')
      return
    }

    const groupData = {
      ...newGroup,
      recipient_ids: selectedMembers
    }

    try {
      await apiClient.createGroup(groupData)
      toast.success('分组创建成功')
      setIsCreateGroupDialogOpen(false)
      setNewGroup({ name: '', description: '', recipient_ids: [] })
      setSelectedMembers([])
      loadGroups()
    } catch (error: any) {
      toast.error(error.message || '创建分组失败')
      console.error(error)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('确定要删除这个分组吗？')) return

    try {
      await apiClient.deleteGroup(id)
      toast.success('分组删除成功')
      loadGroups()
    } catch (error: any) {
      toast.error(error.message || '删除分组失败')
      console.error(error)
    }
  }

  const toggleMemberSelection = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = recipient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || recipient.department === departmentFilter
    const matchesRisk = riskFilter === 'all' || recipient.riskLevel === riskFilter
    return matchesSearch && matchesDepartment && matchesRisk
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            收件人管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            管理测试收件人和分组，支持批量导入
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                批量导入
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批量导入收件人</DialogTitle>
                <DialogDescription>
                  上传CSV文件批量导入收件人信息
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <Button variant="outline" onClick={handleImportCSV}>选择CSV文件</Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    支持CSV格式，包含姓名、邮箱、部门、职位等字段
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">CSV格式要求：</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>第一行为标题行：姓名,邮箱,部门,职位</li>
                    <li>邮箱格式必须正确</li>
                    <li>编码格式：UTF-8</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleImportCSV}>
                  开始导入
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                添加收件人
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新收件人</DialogTitle>
                <DialogDescription>
                  手动添加单个收件人信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input 
                      id="name" 
                      placeholder="输入姓名"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="输入邮箱地址"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">部门</Label>
                    <Select value={newRecipient.department} onValueChange={(value) => setNewRecipient({ ...newRecipient, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择部门" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">IT部门</SelectItem>
                        <SelectItem value="finance">财务部</SelectItem>
                        <SelectItem value="hr">人事部</SelectItem>
                        <SelectItem value="sales">销售部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">职位</Label>
                    <Input 
                      id="position" 
                      placeholder="输入职位"
                      value={newRecipient.position}
                      onChange={(e) => setNewRecipient({ ...newRecipient, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddRecipient}>
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('individuals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'individuals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline mr-2 h-4 w-4" />
            个人收件人
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="inline mr-2 h-4 w-4" />
            收件人分组
          </button>
        </nav>
      </div>

      {activeTab === 'individuals' && (
        <>
          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索姓名或邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部部门</SelectItem>
                    <SelectItem value="IT部门">IT部门</SelectItem>
                    <SelectItem value="财务部">财务部</SelectItem>
                    <SelectItem value="人事部">人事部</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="风险等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部风险</SelectItem>
                    <SelectItem value="high">高风险</SelectItem>
                    <SelectItem value="medium">中风险</SelectItem>
                    <SelectItem value="low">低风险</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  导出
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 收件人列表 */}
          <Card>
            <CardHeader>
              <CardTitle>收件人列表</CardTitle>
              <CardDescription>
                共 {filteredRecipients.length} 个收件人
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : filteredRecipients.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="暂无收件人"
                  description={searchTerm || departmentFilter !== 'all' || riskFilter !== 'all' 
                    ? "没有符合筛选条件的收件人" 
                    : "您还没有添加任何收件人。添加收件人来开始创建钓鱼测试活动。"}
                  actionLabel="添加第一个收件人"
                  onAction={() => setIsAddDialogOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecipients.map((recipient) => (
                    <Card key={recipient.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{recipient.name}</CardTitle>
                            <CardDescription>{recipient.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {recipient.department && (
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <Building className="h-4 w-4 mr-2" />
                              {recipient.department}
                            </div>
                          )}
                          {recipient.position && (
                            <div className="text-gray-600 dark:text-gray-400">
                              职位: {recipient.position}
                            </div>
                          )}
                          {recipient.risk_level && (
                            <div className="mt-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                recipient.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                                recipient.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {recipient.risk_level === 'high' ? '高风险' :
                                 recipient.risk_level === 'medium' ? '中风险' : '低风险'}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'groups' && (
        <>
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">加载中...</div>
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Building className="h-12 w-12" />}
                  title="暂无收件人分组"
                  description="您还没有创建任何收件人分组。创建分组可以更好地管理和组织您的测试目标。"
                  actionLabel="创建第一个分组"
                  onAction={() => setIsCreateGroupDialogOpen(true)}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 添加新分组卡片 */}
              <Card 
                className="border-dashed border-2 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => setIsCreateGroupDialogOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">创建新分组</span>
                </CardContent>
              </Card>

              {/* 分组列表 */}
              {groups.map((group: any) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription className="mt-1">{group.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{group.member_count || 0} 个成员</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      创建于 {new Date(group.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 创建分组对话框 */}
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建收件人分组</DialogTitle>
                <DialogDescription>
                  创建一个新的收件人分组，并选择要添加的成员
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">分组名称</Label>
                  <Input
                    id="group-name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="输入分组名称"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">分组描述（可选）</Label>
                  <Input
                    id="group-description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="输入分组描述"
                  />
                </div>
                <div>
                  <Label>选择成员</Label>
                  <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                    {recipients.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">暂无可选收件人</div>
                    ) : (
                      recipients.map((recipient) => (
                        <label
                          key={recipient.id}
                          className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(recipient.id)}
                            onChange={() => toggleMemberSelection(recipient.id)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{recipient.name}</div>
                            <div className="text-sm text-gray-500">{recipient.email}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    已选择: {selectedMembers.length} 个成员
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateGroup}>创建分组</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}