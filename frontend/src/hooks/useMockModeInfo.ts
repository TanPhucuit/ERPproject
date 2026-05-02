import { useEffect } from 'react'

export function useMockModeInfo() {
  useEffect(() => {
    const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true'

    if (!isMockMode) {
      return
    }

    console.log(
      '%cMOCK MODE ENABLED',
      'background: #FFD700; color: #000; padding: 8px 12px; font-weight: bold; border-radius: 4px;'
    )
    console.log(
      '%cFrontend is using mock data - no backend/Supabase needed',
      'background: #90EE90; color: #000; padding: 8px 12px;'
    )
    console.log('%cYou can test all features locally:', 'color: #0066cc; font-weight: bold;')
    console.log(
      '%c- Login with any email and password\n- Browse all modules (CRM, Sales, Purchase, Inventory, Accounting)\n- View charts and metrics\n- Test adding/editing items',
      'color: #0066cc;'
    )
    console.log(
      '%cTo use real backend: set VITE_USE_MOCK_API=false in your environment',
      'color: #FF6347; font-style: italic;'
    )
  }, [])
}
