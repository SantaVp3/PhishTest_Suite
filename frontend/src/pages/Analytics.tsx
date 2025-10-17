import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import {
  TrendingUp,
  Users,
  Mail,
  MousePointer,
  Shield,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6months')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getAnalytics()
      setAnalyticsData(data.dashboard)
    } catch (error) {
      toast.error('加载分析数据失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = () => {
    // 生成详细的分析报告
    const reportData = {
      生成时间: new Date().toLocaleString('zh-CN'),
      时间范围: timeRange,
      总体统计: {
        总活动数: analyticsData?.total_campaigns || 0,
        活跃活动数: analyticsData?.active_campaigns || 0,
        总收件人数: analyticsData?.total_recipients || 0,
        总发送邮件数: analyticsData?.total_emails_sent || 0,
        总打开邮件数: analyticsData?.total_emails_opened || 0,
        总点击链接数: analyticsData?.total_links_clicked || 0,
        整体成功率: `${(analyticsData?.overall_success_rate || 0).toFixed(2)}%`
      },
      部门统计: analyticsData?.department_stats || [],
      月度统计: analyticsData?.monthly_stats || []
    }

    // 转换为JSON格式并下载
    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2))
    const link = document.createElement("a")
    link.setAttribute("href", jsonContent)
    link.setAttribute("download", `phishing_analysis_report_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 同时生成CSV格式的部门统计
    if (analyticsData?.department_stats && analyticsData.department_stats.length > 0) {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "部门,收件人数,发送数,打开数,点击数,成功率\n"
        + analyticsData.department_stats.map((dept: any) => 
            `${dept.department},${dept.recipients},${dept.sent},${dept.opened},${dept.clicked},${dept.success_rate}%`
          ).join("\n")
      
      const csvLink = document.createElement("a")
      csvLink.setAttribute("href", encodeURI(csvContent))
      csvLink.setAttribute("download", `department_stats_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)
    }

    toast.success('分析报告已导出')
  }

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              数据分析中心
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              深入分析钓鱼测试数据，评估安全意识水平
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">正在加载分析数据...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const monthlyData: any[] = analyticsData?.monthly_stats || []
  const departmentData: any[] = analyticsData?.department_stats || []
  const riskDistribution: any[] = []
  const campaignTypes: any[] = []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            数据分析中心
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            深入分析钓鱼测试数据，评估安全意识水平
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">最近1个月</SelectItem>
              <SelectItem value="3months">最近3个月</SelectItem>
              <SelectItem value="6months">最近6个月</SelectItem>
              <SelectItem value="1year">最近1年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 关键指标卡片 - 显示零值 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总发送量</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.total_emails_sent || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-gray-500">
                {analyticsData?.total_emails_sent > 0 ? '累计发送邮件' : '暂无数据'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均打开率</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.total_emails_sent > 0 
                ? `${((analyticsData?.total_emails_opened || 0) / analyticsData.total_emails_sent * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-gray-500">
                {analyticsData?.total_emails_opened > 0 ? '邮件打开率' : '暂无数据'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均点击率</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.total_emails_sent > 0 
                ? `${((analyticsData?.total_links_clicked || 0) / analyticsData.total_emails_sent * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-gray-500">
                {analyticsData?.total_links_clicked > 0 ? '链接点击率' : '暂无数据'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">整体成功率</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analyticsData?.overall_success_rate || 0).toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-gray-500">
                {analyticsData?.overall_success_rate > 0 ? '钓鱼成功率' : '暂无数据'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 根据数据情况显示内容或空状态 */}
      {(!analyticsData || analyticsData.total_campaigns === 0) ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<BarChart3 className="h-12 w-12" />}
              title="暂无分析数据"
              description="您还没有执行任何钓鱼测试活动。创建并执行您的第一个活动来查看详细的分析数据和统计报告。"
              actionLabel="创建第一个活动"
              onAction={() => {
                // 导航到活动创建页面
                window.location.href = '/campaigns'
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>活动概览</CardTitle>
            <CardDescription>
              当前共有 {analyticsData.total_campaigns} 个活动，其中 {analyticsData.active_campaigns} 个正在进行中
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analyticsData.total_recipients}</div>
                <div className="text-sm text-gray-500">总收件人</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analyticsData.total_emails_sent}</div>
                <div className="text-sm text-gray-500">已发送</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{analyticsData.total_emails_opened}</div>
                <div className="text-sm text-gray-500">已打开</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analyticsData.total_links_clicked}</div>
                <div className="text-sm text-gray-500">已点击</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度趋势 - 空状态 */}
        <Card>
          <CardHeader>
            <CardTitle>月度活动趋势</CardTitle>
            <CardDescription>
              邮件发送、打开、点击和举报的月度统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无趋势数据</p>
                <p className="text-sm">执行活动后将显示趋势图表</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 风险分布 - 空状态 */}
        <Card>
          <CardHeader>
            <CardTitle>员工风险分布</CardTitle>
            <CardDescription>
              基于钓鱼测试结果的风险等级分布
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无风险数据</p>
                <p className="text-sm">完成测试后将显示风险分布</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 部门表现 - 空状态 */}
        <Card>
          <CardHeader>
            <CardTitle>部门安全意识表现</CardTitle>
            <CardDescription>
              各部门的钓鱼邮件点击率对比
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无部门数据</p>
                <p className="text-sm">添加收件人并执行测试后显示</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 活动类型效果 - 空状态 */}
        <Card>
          <CardHeader>
            <CardTitle>活动类型效果分析</CardTitle>
            <CardDescription>
              不同类型钓鱼活动的成功率对比
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无活动数据</p>
                <p className="text-sm">创建不同类型的活动后显示对比</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计表 - 空状态 */}
      <Card>
        <CardHeader>
          <CardTitle>部门详细统计</CardTitle>
          <CardDescription>
            各部门的详细钓鱼测试数据统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无统计数据
            </h3>
            <p className="text-gray-500 mb-4">
              添加收件人并执行钓鱼测试活动后，这里将显示详细的部门统计数据
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/recipients'}>
                添加收件人
              </Button>
              <Button onClick={() => window.location.href = '/campaigns'}>
                创建活动
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}