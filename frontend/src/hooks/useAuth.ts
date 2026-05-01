import { useAuthStore } from '../stores/authStore'
import { useState, useEffect } from 'react'

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, isInitialized, initialize, login, register, logout } =
    useAuthStore()
  const [ready, setReady] = useState(isInitialized)

  useEffect(() => {
    if (isInitialized) {
      setReady(true)
      return
    }

    initialize().finally(() => setReady(true))
  }, [initialize, isInitialized])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitialized: ready,
    register,
    login,
    logout,
  }
}
