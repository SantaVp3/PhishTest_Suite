import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Cell
} from 'recharts'
import {
  Mail,
  Users,
  Target,
  TrendingUp,
  Plus,
  Activity,
  Shield,
  AlertTriangle
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

export default function Dashboard() {
  const [hasData, setHasData] = useState(false) // 设置为false，显示空状态

  // 如果有数据，显示完整的分析面板
  if (hasData) {
    return <AnalyticsDashboard />
  }

  // 如果没有数据，显示空状态
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            仪表板
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            企业安全意识评估概览
          </p>
        </div>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          创建新活动
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总活动数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              暂无数据
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邮件发送量</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              暂无数据
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参与用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              暂无数据
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均点击率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">
              暂无数据
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 活动趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle>活动趋势</CardTitle>
            <CardDescription>
              过去6个月的活动数量和成功率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<BarChart className="h-12 w-12" />}
              title="暂无活动数据"
              description="创建您的第一个钓鱼测试活动来查看趋势图表"
              actionLabel="创建活动"
              onAction={() => {}}
            />
          </CardContent>
        </Card>

        {/* 风险分布 */}
        <Card>
          <CardHeader>
            <CardTitle>用户风险分布</CardTitle>
            <CardDescription>
              基于行为模式的风险评估
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<PieChart className="h-12 w-12" />}
              title="暂无风险数据"
              description="完成钓鱼测试后将显示用户风险分布情况"
            />
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
          <CardDescription>
            最新的钓鱼测试活动状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="暂无活动"
            description="您还没有创建任何钓鱼测试活动。创建您的第一个活动来开始安全意识评估。"
            actionLabel="创建第一个活动"
            onAction={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  )
}