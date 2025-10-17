import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import EmptyState from '@/components/EmptyState'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Mail, 
  MousePointer, 
  Eye, 
  AlertTriangle,
  Shield,
  Target,
  Clock,
  Download,
  RefreshCw,
  Filter,
  Calendar
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalCampaigns: number
    activeCampaigns: number
    totalRecipients: number
    overallSuccessRate: number
  }
  campaignStats: {
    emailsSent: number
    emailsOpened: number
    linksClicked: number
    dataSubmitted: number
    openRate: number
    clickRate: number
    successRate: number
  }
  riskAssessment: {
    highRisk: number
    mediumRisk: number
    lowRisk: number
    riskScore: number
  }
  recentActivity: Array<{
    id: string
    type: 'email_sent' | 'email_opened' | 'link_clicked' | 'data_submitted'
    recipient: string
    campaign: string
    timestamp: string
  }>
  topVulnerabilities: Array<{
    department: string
    successRate: number
    totalTests: number
    riskLevel: 'high' | 'medium' | 'low'
  }>
}

interface AnalyticsDashboardProps {
  campaignId?: string
  timeRange?: '24h' | '7d' | '30d' | '90d'
}

export default function AnalyticsDashboard({ campaignId, timeRange = '7d' }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 从API获取真实数据
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      
      try {
        // 调用真实API获取分析数据
        const analyticsData = await apiClient.getAnalytics()
        setData(analyticsData)
      } catch (error) {
        console.error('获取分析数据失败:', error)
        // 如果API调用失败，设置空数据
        setData({
          overview: {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalRecipients: 0,
            overallSuccessRate: 0
          },
          campaignStats: {
            emailsSent: 0,
            emailsOpened: 0,
            linksClicked: 0,
            dataSubmitted: 0,
            openRate: 0,
            clickRate: 0,
            successRate: 0
          },
          riskAssessment: {
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            riskScore: 0
          },
          recentActivity: [],
          topVulnerabilities: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()

    // 自动刷新
    let interval: number
    if (autoRefresh) {
      interval = window.setInterval(fetchAnalytics, 30000) // 每30秒刷新一次
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [selectedTimeRange, campaignId, autoRefresh])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email_sent':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'email_opened':
        return <Eye className="h-4 w-4 text-green-500" />
      case 'link_clicked':
        return <MousePointer className="h-4 w-4 text-orange-500" />
      case 'data_submitted':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'email_sent':
        return '邮件发送'
      case 'email_opened':
        return '邮件打开'
      case 'link_clicked':
        return '链接点击'
      case 'data_submitted':
        return '数据提交'
      default:
        return '未知活动'
    }
  }

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high':
        return '高风险'
      case 'medium':
        return '中风险'
      case 'low':
        return '低风险'
      default:
        return '未知'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">数据分析中心</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* 头部控制栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">数据分析中心</h2>
          <p className="text-gray-600 mt-1">实时监控钓鱼测试效果和安全风险评估</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('24h')}
            >
              24小时
            </Button>
            <Button
              size="sm"
              variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('7d')}
            >
              7天
            </Button>
            <Button
              size="sm"
              variant={selectedTimeRange === '30d' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('30d')}
            >
              30天
            </Button>
            <Button
              size="sm"
              variant={selectedTimeRange === '90d' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('90d')}
            >
              90天
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总活动数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{data.overview.activeCampaigns}</span> 个活跃
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收件人</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalRecipients}</div>
            <p className="text-xs text-muted-foreground">
              覆盖所有部门
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邮件打开率</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.campaignStats.openRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600" />
              <span className="text-green-600 ml-1">+2.1%</span> 较上周
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">钓鱼成功率</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overview.overallSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 text-green-600" />
              <span className="text-green-600 ml-1">-1.2%</span> 较上周
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 活动统计详情 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>活动统计详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.campaignStats.emailsSent}</div>
                  <div className="text-sm text-gray-500">邮件发送</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.campaignStats.emailsOpened}</div>
                  <div className="text-sm text-gray-500">邮件打开</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{data.campaignStats.linksClicked}</div>
                  <div className="text-sm text-gray-500">链接点击</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{data.campaignStats.dataSubmitted}</div>
                  <div className="text-sm text-gray-500">数据提交</div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">点击率</span>
                  <span className="text-sm font-medium">{data.campaignStats.clickRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${data.campaignStats.clickRate}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">成功率</span>
                  <span className="text-sm font-medium">{data.campaignStats.successRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${data.campaignStats.successRate}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 部门风险评估 */}
          <Card>
            <CardHeader>
              <CardTitle>部门风险评估</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topVulnerabilities.length === 0 ? (
                <EmptyState
                  icon={<Shield className="h-12 w-12" />}
                  title="暂无风险数据"
                  description="完成钓鱼测试后将显示各部门的风险评估结果"
                />
              ) : (
                <div className="space-y-4">
                  {data.topVulnerabilities.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{dept.department}</div>
                        <Badge variant={getRiskBadgeVariant(dept.riskLevel)}>
                          {getRiskLabel(dept.riskLevel)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{dept.successRate}%</div>
                          <div className="text-xs text-gray-500">{dept.totalTests} 次测试</div>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              dept.riskLevel === 'high' ? 'bg-red-500' :
                              dept.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${dept.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">
          {/* 风险评估总览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                风险评估
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-orange-600">{data.riskAssessment.riskScore}</div>
                <div className="text-sm text-gray-500">风险评分</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">高风险</span>
                  <Badge variant="destructive">{data.riskAssessment.highRisk}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">中风险</span>
                  <Badge variant="default">{data.riskAssessment.mediumRisk}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">低风险</span>
                  <Badge variant="secondary">{data.riskAssessment.lowRisk}</Badge>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">建议</div>
                <div className="text-xs text-yellow-700 mt-1">
                  建议对高风险部门进行额外的安全意识培训
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 实时活动 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                实时活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-12 w-12" />}
                  title="暂无活动记录"
                  description="启动钓鱼测试活动后，这里将显示实时的用户行为记录"
                />
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {getActivityLabel(activity.type)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {activity.recipient}
                        </div>
                        <div className="text-xs text-gray-400">
                          {activity.campaign}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}