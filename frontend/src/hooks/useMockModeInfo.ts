import { useEffect } from 'react'

// This hook logs info about mock API mode on app startup
export function useMockModeInfo() {
  useEffect(() => {
    const isMockMode = true // This should match USE_MOCK_API in apiClient.ts
    if (isMockMode) {
      console.log(
        '%c🧪 MOCK MODE ENABLED',
        'background: #FFD700; color: #000; padding: 8px 12px; font-weight: bold; border-radius: 4px;'
      )
      console.log(
        '%c✅ Frontend is using mock data - no backend/Supabase needed',
        'background: #90EE90; color: #000; padding: 8px 12px;'
      )
      console.log('%cYou can test all features locally:', 'color: #0066cc; font-weight: bold;')
      console.log(
        '%c• Login with any email and password\n• Browse all modules (CRM, Sales, Purchase, Inventory, Accounting)\n• View charts and metrics\n• Test adding/editing items',
        'color: #0066cc;'
      )
      console.log(
        '%c💡 To use real backend: Set USE_MOCK_API = false in src/services/apiClient.ts',
        'color: #FF6347; font-style: italic;'
      )
    }
  }, [])
}
