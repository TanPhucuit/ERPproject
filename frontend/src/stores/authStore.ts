import { create } from 'zustand'
import { User } from '../types'
import * as mockData from '../services/mockData'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

// Mock mode - auto-login with mock data
const USE_MOCK_AUTH = true
const mockToken = 'mock-jwt-token-demo-12345'

export const useAuthStore = create<AuthStore>((set) => ({
  user: USE_MOCK_AUTH ? (mockData.mockUser as User) : null,
  token: USE_MOCK_AUTH ? mockToken : null,
  isLoading: false,
  isAuthenticated: USE_MOCK_AUTH,

  login: async () => {
    set({ isLoading: true })
    set({
      token: mockToken,
      user: mockData.mockUser as User,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  logout: async () => {
    set({
      user: mockData.mockUser as User,
      token: mockToken,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
}))
