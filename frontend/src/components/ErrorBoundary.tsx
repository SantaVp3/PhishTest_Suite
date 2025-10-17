import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>出错了</CardTitle>
              </div>
              <CardDescription>
                应用程序遇到了一个错误
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新页面
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  返回首页
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                如果问题持续存在，请联系技术支持
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

