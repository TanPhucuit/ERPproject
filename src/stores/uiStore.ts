import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  isLoading: boolean
  notification: {
    show: boolean
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
  } | null
  setSidebarOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void
  hideNotification: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  isLoading: false,
  notification: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),

  showNotification: (type, message) => {
    set({
      notification: { show: true, type, message },
    })
    // Auto-hide after 5 seconds
    setTimeout(() => {
      set({ notification: null })
    }, 5000)
  },

  hideNotification: () => set({ notification: null }),
}))
