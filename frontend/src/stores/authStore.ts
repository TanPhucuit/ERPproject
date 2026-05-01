import { create } from 'zustand'
import { User } from '../types'
import { authService, RegisterPayload } from '../services/authService'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

const storedToken = localStorage.getItem('auth_token')

const normalizeUser = (user: any): User => ({
  id: String(user.id),
  email: user.email,
  full_name: user.full_name,
  avatar_url: user.avatar_url || undefined,
  role: (user.role || 'Sales_Manager') as User['role'],
  status: (user.status || 'active') as User['status'],
})

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: storedToken,
  isLoading: false,
  isAuthenticated: !!storedToken,
  isInitialized: false,

  initialize: async () => {
    const token = authService.getToken()

    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      })
      return
    }

    set({ isLoading: true })

    try {
      const user = await authService.getCurrentUser()
      set({
        user: normalizeUser(user),
        token,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      })
    } catch (_error) {
      authService.clearToken()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const response = await authService.login({ email, password })
      set({
        token: response.token,
        user: normalizeUser(response.user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (payload) => {
    set({ isLoading: true })
    try {
      const response = await authService.register(payload)
      set({
        token: response.token,
        user: normalizeUser(response.user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } catch (_error) {
      // Keep logout resilient even if the API call fails.
    }

    authService.clearToken()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    })
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
}))
