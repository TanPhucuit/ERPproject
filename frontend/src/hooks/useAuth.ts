import { useAuthStore } from '../stores/authStore'
import { useState, useEffect } from 'react'

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Mock mode: always initialized with mock user
    setIsInitialized(true)
  }, [])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    logout,
  }
}
