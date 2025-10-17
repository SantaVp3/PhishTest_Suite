import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Templates from './pages/Templates'
import Recipients from './pages/Recipients'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import SystemConfig from './pages/SystemConfig'
import Login from './pages/Login'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<Login />} />
            
            {/* 受保护的路由 */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/campaigns" element={<Campaigns />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/recipients" element={<Recipients />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/system-config" element={<SystemConfig />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App