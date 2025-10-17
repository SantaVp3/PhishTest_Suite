import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { apiClient, Campaign, Template } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Target,
  Calendar,
  Users,
  Mail,
  MousePointer,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [recipients, setRecipients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    template_id: '',
    recipient_groups: []
  })
  const [editCampaign, setEditCampaign] = useState({
    name: '',
    description: '',
    template_id: ''
  })

  useEffect(() => {
    loadCampaigns()
    loadTemplates()
    loadRecipients()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getCampaigns()
      setCampaigns(data.campaigns)
    } catch (error) {
      toast.error('加载活动列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const data = await apiClient.getTemplates()
      setTemplates(data.templates)
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  }

  const loadRecipients = async () => {
    try {
      const data = await apiClient.getRecipients()
      setRecipients(data.recipients || [])
    } catch (error) {
      console.error('加载收件人失败:', error)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      toast.error('请输入活动名称')
      return
    }

    try {
      await apiClient.createCampaign(newCampaign)
      toast.success('活动创建成功')
      setIsCreateDialogOpen(false)
      setNewCampaign({ name: '', description: '', template_id: '', recipient_groups: [] })
      loadCampaigns()
    } catch (error) {
      toast.error('创建活动失败')
      console.error(error)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？此操作不可撤销。')) {
      return
    }

    try {
      await apiClient.deleteCampaign(id)
      toast.success('活动删除成功')
      loadCampaigns()
    } catch (error) {
      toast.error('删除活动失败')
      console.error(error)
    }
  }

  const handlePauseCampaign = async (id: string) => {
    try {
      await apiClient.pauseCampaign(id)
      toast.success('活动已暂停')
      loadCampaigns()
    } catch (error) {
      toast.error('暂停活动失败')
      console.error(error)
    }
  }

  const handleViewDetails = async (id: string) => {
    try {
      const campaign = campaigns.find(c => c.id === id)
      if (!campaign) return
      
      // 获取活动统计数据
      const stats = await apiClient.getCampaignStats(id)
      setSelectedCampaign({ ...campaign, stats })
      setIsDetailDialogOpen(true)
    } catch (error) {
      toast.error('获取活动详情失败')
      console.error(error)
    }
  }

  const handleEditCampaign = (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    if (!campaign) return
    
    setSelectedCampaign(campaign)
    setEditCampaign({
      name: campaign.name,
      description: campaign.description || '',
      template_id: campaign.template_id || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedCampaign || !editCampaign.name.trim()) {
      toast.error('请输入活动名称')
      return
    }

    try {
      await apiClient.updateCampaign(selectedCampaign.id, editCampaign)
      toast.success('活动更新成功')
      setIsEditDialogOpen(false)
      loadCampaigns()
    } catch (error) {
      toast.error('更新活动失败')
      console.error(error)
    }
  }

  const handleOpenLaunchDialog = (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    if (!campaign) return
    
    setSelectedCampaign(campaign)
    setSelectedRecipients([])
    setIsLaunchDialogOpen(true)
  }

  const handleLaunchCampaign = async () => {
    if (!selectedCampaign) return
    
    if (selectedRecipients.length === 0) {
      toast.error('请至少选择一个收件人')
      return
    }

    try {
      await apiClient.startCampaign(selectedCampaign.id, {
        recipient_ids: selectedRecipients,
        phishing_target_url: 'https://example.com/phishing-test'
      })
      toast.success('活动启动成功，邮件正在后台发送')
      setIsLaunchDialogOpen(false)
      loadCampaigns()
    } catch (error) {
      toast.error('启动活动失败')
      console.error(error)
    }
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => 
      prev.includes(id) 
        ? prev.filter(r => r !== id)
        : [...prev, id]
    )
  }

  const toggleAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(recipients.map(r => r.id))
    }
  }

  const filteredCampaigns = campaigns.filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            钓鱼活动管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            创建和管理您的钓鱼测试活动
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建新活动
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索活动..."
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

      {/* 创建活动对话框 */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">创建新活动</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">活动名称</label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="输入活动名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">活动描述</label>
                <Input
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="输入活动描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">选择模板（可选）</label>
                <select
                  value={newCampaign.template_id}
                  onChange={(e) => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">不使用模板</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateCampaign}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 活动列表 */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">加载中...</div>
            </CardContent>
          </Card>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<Target className="h-12 w-12" />}
                title="暂无钓鱼活动"
                description="您还没有创建任何钓鱼测试活动。创建您的第一个活动来开始安全意识评估。"
                actionLabel="创建第一个活动"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign: any) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {campaign.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      campaign.status === 'active'
                        ? 'default'
                        : campaign.status === 'completed'
                        ? 'secondary'
                        : campaign.status === 'scheduled'
                        ? 'outline'
                        : 'destructive'
                    }
                  >
                    {campaign.status === 'active' && '进行中'}
                    {campaign.status === 'completed' && '已完成'}
                    {campaign.status === 'scheduled' && '已安排'}
                    {campaign.status === 'draft' && '草稿'}
                    {campaign.status === 'paused' && '已暂停'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{campaign.stats?.total_recipients || 0}</div>
                      <div className="text-xs text-gray-500">收件人</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{campaign.stats?.emails_sent || 0}</div>
                      <div className="text-xs text-gray-500">已发送</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{campaign.stats?.links_clicked || 0}</div>
                      <div className="text-xs text-gray-500">点击数</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {campaign.stats?.success_rate?.toFixed(1) || 0}%
                      </div>
                      <div className="text-xs text-gray-500">成功率</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    创建于 {new Date(campaign.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(campaign.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看详情
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditCampaign(campaign.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    {campaign.status === 'draft' || campaign.status === 'paused' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenLaunchDialog(campaign.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        启动
                      </Button>
                    ) : campaign.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePauseCampaign(campaign.id)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        暂停
                      </Button>
                    ) : null}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 查看详情对话框 */}
      {isDetailDialogOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">活动详情</h3>
              <button
                onClick={() => setIsDetailDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">活动名称</label>
                <p className="text-lg font-medium">{selectedCampaign.name}</p>
              </div>

              {selectedCampaign.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">描述</label>
                  <p>{selectedCampaign.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">状态</label>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedCampaign.status === 'active' ? 'default' :
                      selectedCampaign.status === 'completed' ? 'secondary' :
                      selectedCampaign.status === 'scheduled' ? 'outline' : 'destructive'
                    }
                  >
                    {selectedCampaign.status === 'active' && '进行中'}
                    {selectedCampaign.status === 'completed' && '已完成'}
                    {selectedCampaign.status === 'scheduled' && '已安排'}
                    {selectedCampaign.status === 'draft' && '草稿'}
                    {selectedCampaign.status === 'paused' && '已暂停'}
                  </Badge>
                </div>
              </div>

              {selectedCampaign.stats && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">统计数据</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <div className="text-2xl font-bold">{selectedCampaign.stats.stats.total_recipients || 0}</div>
                      <div className="text-xs text-gray-500">收件人</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <div className="text-2xl font-bold">{selectedCampaign.stats.stats.emails_sent || 0}</div>
                      <div className="text-xs text-gray-500">已发送</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <div className="text-2xl font-bold">{selectedCampaign.stats.stats.emails_opened || 0}</div>
                      <div className="text-xs text-gray-500">已打开</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <div className="text-2xl font-bold">{selectedCampaign.stats.stats.links_clicked || 0}</div>
                      <div className="text-xs text-gray-500">点击数</div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-sm text-gray-500">成功率: </span>
                    <span className="text-lg font-bold">{selectedCampaign.stats.stats.success_rate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">创建时间</label>
                <p>{new Date(selectedCampaign.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      {isEditDialogOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">编辑活动</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">活动名称</label>
                <Input
                  value={editCampaign.name}
                  onChange={(e) => setEditCampaign({ ...editCampaign, name: e.target.value })}
                  placeholder="输入活动名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">活动描述</label>
                <Input
                  value={editCampaign.description}
                  onChange={(e) => setEditCampaign({ ...editCampaign, description: e.target.value })}
                  placeholder="输入活动描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">选择模板</label>
                <select
                  value={editCampaign.template_id}
                  onChange={(e) => setEditCampaign({ ...editCampaign, template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">不使用模板</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 启动活动对话框 */}
      {isLaunchDialogOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">启动活动: {selectedCampaign.name}</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  请选择要发送钓鱼邮件的收件人。邮件将在后台异步发送。
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">选择收件人</label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleAllRecipients}
                  >
                    {selectedRecipients.length === recipients.length ? '取消全选' : '全选'}
                  </Button>
                </div>

                {recipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无收件人，请先添加收件人
                  </div>
                ) : (
                  <div className="border dark:border-gray-700 rounded-md max-h-60 overflow-y-auto">
                    {recipients.map((recipient) => (
                      <label
                        key={recipient.id}
                        className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(recipient.id)}
                          onChange={() => toggleRecipient(recipient.id)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{recipient.name}</div>
                          <div className="text-sm text-gray-500">{recipient.email}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {recipient.department} - {recipient.position}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-sm text-gray-500">
                  已选择: {selectedRecipients.length} / {recipients.length} 个收件人
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsLaunchDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleLaunchCampaign}
                disabled={selectedRecipients.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                启动活动
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}