import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useMockModeInfo } from './hooks/useMockModeInfo'
import { useUIStore } from './stores/uiStore'

// Pages
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import CRMModule from './pages/CRM'
import SalesModule from './pages/Sales'
import PurchaseModule from './pages/Purchase'
import InventoryModule from './pages/Inventory'
import AccountingModule from './pages/Accounting'

// Layouts
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'

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
        <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />

        {/* App Routes - Dashboard */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* App Routes - CRM */}
        <Route
          path="/app/crm"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CRMModule />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* App Routes - Sales */}
        <Route
          path="/app/sales"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SalesModule />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* App Routes - Purchase */}
        <Route
          path="/app/purchase"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PurchaseModule />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* App Routes - Inventory */}
        <Route
          path="/app/inventory"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InventoryModule />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* App Routes - Accounting */}
        <Route
          path="/app/accounting"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AccountingModule />
              </MainLayout>
            </ProtectedRoute>
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
