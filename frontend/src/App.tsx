import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useMockModeInfo } from './hooks/useMockModeInfo'
import { useUIStore } from './stores/uiStore'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CRMModule from './pages/CRM'
import SalesModule from './pages/Sales'
import PurchaseModule from './pages/Purchase'
import InventoryModule from './pages/Inventory'
import AccountingModule from './pages/Accounting'

// Layouts
import MainLayout from './layouts/MainLayout'

// Notification Component
import Notification from './components/Notification'

function App() {
  const notification = useUIStore((state) => state.notification)
  useMockModeInfo() // Log mock mode info on app start

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* App Routes - Dashboard */}
        <Route
          path="/app"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />

        {/* App Routes - CRM */}
        <Route
          path="/app/crm"
          element={
            <MainLayout>
              <CRMModule />
            </MainLayout>
          }
        />

        {/* App Routes - Sales */}
        <Route
          path="/app/sales"
          element={
            <MainLayout>
              <SalesModule />
            </MainLayout>
          }
        />

        {/* App Routes - Purchase */}
        <Route
          path="/app/purchase"
          element={
            <MainLayout>
              <PurchaseModule />
            </MainLayout>
          }
        />

        {/* App Routes - Inventory */}
        <Route
          path="/app/inventory"
          element={
            <MainLayout>
              <InventoryModule />
            </MainLayout>
          }
        />

        {/* App Routes - Accounting */}
        <Route
          path="/app/accounting"
          element={
            <MainLayout>
              <AccountingModule />
            </MainLayout>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          show={notification.show}
        />
      )}
    </BrowserRouter>
  )
}

export default App
