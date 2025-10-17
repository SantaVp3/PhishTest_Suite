import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await fetch('http://localhost:8080/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          
          if (response.ok) {
            const data = await response.json()
            const user = {
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name || '管理员',
              role: 'admin'
            }
            
            set({
              user,
              token: data.token,
              isAuthenticated: true
            })
            return true
          }
          return false
        } catch (error) {
          console.error('Login error:', error)
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      },

      checkAuth: () => {
        const { token } = get()
        if (token) {
          // 验证token有效性
          set({ isAuthenticated: true })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)