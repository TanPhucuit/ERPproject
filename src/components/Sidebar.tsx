import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Users,
  ShoppingCart,
  Package,
  Warehouse,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation()

  const menuItems = [
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

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col w-64 bg-dark text-white transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
        style={{ backgroundColor: '#0F3A7D' }}
      >
        <div className="p-4 border-b border-white/20">
          <h2 className={`font-bold text-xl ${!isOpen && 'text-sm'}`}>NovaTech</h2>
        </div>

        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded mb-2 transition ${
                  active
                    ? 'bg-white/20 text-white border-l-4 border-accent'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                {isOpen && <span className="flex-1">{item.label}</span>}
                {isOpen && active && <ChevronRight size={18} />}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-16 left-0 w-64 bg-dark text-white lg:hidden transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#0F3A7D' }}
      >
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded mb-2 transition ${
                  active
                    ? 'bg-white/20 text-white border-l-4 border-accent'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
