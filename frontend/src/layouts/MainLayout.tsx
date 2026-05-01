import React, { useState } from 'react'
import { Menu, X, LogOut, BarChart3, Users, ShoppingCart, Package, Warehouse, BookOpen, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useLocation, useNavigate } from 'react-router-dom'
import ScenarioSelector from '../components/ScenarioSelector'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const modules = [
    { path: '/app/', label: 'Dashboard', icon: BarChart3 },
    { path: '/app/crm', label: 'CRM', icon: Users },
    { path: '/app/sales', label: 'Sales', icon: ShoppingCart },
    { path: '/app/purchase', label: 'Purchase', icon: Package },
    { path: '/app/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/app/accounting', label: 'Accounting', icon: BookOpen },
  ]

  const isActive = (path: string) => {
    if (path === '/app/') return location.pathname === '/app' || location.pathname === '/app/'
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    await logout()
    setShowLogoutConfirm(false)
    setUserMenuOpen(false)
    navigate('/sign-in')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-blue-50 shadow-sm border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-75 transition-opacity duration-200 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-all">
              <span className="text-white font-bold text-sm">NT</span>
            </div>
            <h1 className="text-lg font-bold text-blue-700 hidden sm:block hover:text-blue-800 transition-colors">NovaTech ERP</h1>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <ScenarioSelector />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user?.role || 'Admin'}</p>
                </div>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium rounded-lg"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Module Tabs */}
        <div className="border-t border-gray-200">
          {/* Desktop Tabs */}
          <div className="hidden md:flex overflow-x-auto">
            {modules.map((module) => {
              const Icon = module.icon
              const active = isActive(module.path)
              return (
                <button
                  key={module.path}
                  onClick={() => navigate(module.path)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{module.label}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Tabs */}
          {mobileMenuOpen && (
            <div className="md:hidden flex flex-col border-t border-gray-200">
              {modules.map((module) => {
                const Icon = module.icon
                const active = isActive(module.path)
                return (
                  <button
                    key={module.path}
                    onClick={() => {
                      navigate(module.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{module.label}</span>
                  </button>
                )
              })}
              <div className="border-t border-gray-200 px-4 py-3 md:hidden">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium py-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainLayout
