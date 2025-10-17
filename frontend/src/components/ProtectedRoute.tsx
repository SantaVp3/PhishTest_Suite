import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, token } = useAuthStore()

  // 检查认证状态
  if (!isAuthenticated || !token) {
    // 保存当前路径，登录后可以返回
    const currentPath = window.location.pathname
    sessionStorage.setItem('redirectPath', currentPath)
    
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

