import { useUIStore } from '../stores/uiStore'

export const useNotification = () => {
  const { showNotification, hideNotification } = useUIStore()

  return {
    success: (message: string) => showNotification('success', message),
    error: (message: string) => showNotification('error', message),
    warning: (message: string) => showNotification('warning', message),
    info: (message: string) => showNotification('info', message),
    hide: hideNotification,
  }
}
