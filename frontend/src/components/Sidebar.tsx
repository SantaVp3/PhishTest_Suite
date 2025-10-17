import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Mail,
  Users,

  Settings,
  Shield,
  Target,
  Activity
} from 'lucide-react'

const navigation = [
  { name: '仪表板', href: '/', icon: BarChart3 },
  { name: '钓鱼活动', href: '/campaigns', icon: Target },
  { name: '邮件模板', href: '/templates', icon: Mail },
  { name: '收件人管理', href: '/recipients', icon: Users },
  { name: '数据分析', href: '/analytics', icon: Activity },
  { name: '系统设置', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center flex-shrink-0 px-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
            PhishTest Suite
          </span>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">管</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                管理员
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                admin@company.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}