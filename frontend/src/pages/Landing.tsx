import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronDown,
  ArrowRight,
  CheckCircle,
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  BarChart3,
  Lock,
  Zap,
  Globe,
  Code,
  Sparkles,
  Rocket,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Scroll Observer Hook
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({})
  const elementsRef = useRef<{ [key: string]: IntersectionObserver }>({})

  const observe = (id: string, element: HTMLElement | null) => {
    if (!element) return

    if (!elementsRef.current[id]) {
      elementsRef.current[id] = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [id]: true }))
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      )
    }
    elementsRef.current[id].observe(element)
  }

  return { isVisible, observe }
}

// Counter Animation Hook
const useCountUp = (target: number, duration: number, isVisible: boolean) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isVisible, target, duration])

  return count
}

const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { observe } = useScrollReveal()
  const statsRef = useRef<HTMLDivElement>(null)
  const statsVisible = true

  useEffect(() => {
    if (statsRef.current) {
      observe('stats', statsRef.current)
    }
  }, [])

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-white via-purple-50 to-white pointer-events-none"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-sm">NT</span>
            </div>
            <span className="text-xl font-bold text-gray-900">NovaTech</span>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-2 rounded-lg bg-black hover:bg-gray-900 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-4 bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden min-h-screen flex items-center">
        {/* Multiple layered background for depth */}
        <div className="absolute inset-0">
          {/* Layer 1 - Large blobs */}
          <div className="absolute top-10 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob"></div>
          <div className="absolute bottom-10 left-0 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>
          
          {/* Layer 2 - Additional depth blobs */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-100 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-pink-100 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '5s' }}></div>
          
          {/* Grid pattern for subtle depth */}
          <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-b from-transparent via-purple-600 to-transparent"></div>
        </div>

        {/* Floating Elements - Enhanced */}
        <div className="absolute top-20 left-10 w-12 h-12 border-2 border-purple-300 rounded-lg animate-float opacity-50"></div>
        <div className="absolute bottom-32 right-20 w-8 h-8 border-2 border-pink-300 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 border-2 border-purple-200 rounded-full animate-float opacity-40" style={{ animationDelay: '2.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-10 h-10 border-2 border-pink-200 rounded-lg animate-float opacity-30" style={{ animationDelay: '3.5s' }}></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-8 inline-block px-4 py-2 bg-purple-100 rounded-full border border-purple-300 animate-fade-in backdrop-blur">
            <span className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <Sparkles size={16} /> Enterprise ERP Platform
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight animate-fade-in text-gray-900" style={{ animationDelay: '0.2s' }}>
            Understand your inventory{' '}
            <span className="text-gray-900">
              in real time
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Stop managing your inventory with spreadsheets and outdated tools. NovaTech gives you the real-time visibility and control you need to grow faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 rounded-lg bg-black hover:bg-gray-900 text-white font-bold text-base transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2 group"
            >
              <Rocket size={18} className="group-hover:rotate-45 transition-transform duration-300" />
              Get started free
            </button>
            <button className="px-6 py-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-900 font-bold text-base transition-all duration-300 hover:shadow-md hover:scale-105">
              Get a demo
            </button>
          </div>

          {/* Large Stats Section (Katana Style) */}
          <div className="mt-20 mb-12 animate-fade-in" style={{ animationDelay: '0.8s' }} ref={statsRef}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  number: 60, 
                  suffix: '%',
                  label: 'Higher sales on average year over year',
                  isDecimal: false
                },
                { 
                  number: 12, 
                  suffix: 'x',
                  label: 'Increase in inventory turnover',
                  isDecimal: true,
                  decimalPlace: 1
                },
                { 
                  number: 6, 
                  suffix: 'weeks',
                  label: 'To fully implement vs. 6-12 months for most ERPs',
                  isDecimal: false
                }
              ].map((stat, idx) => {
                const countValue = useCountUp(stat.number, 2000, statsVisible)
                const displayValue = stat.isDecimal 
                  ? (countValue / 10).toFixed(stat.decimalPlace || 1)
                  : countValue
                
                return (
                  <div 
                    key={idx}
                    className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-500 transform hover:scale-105 animate-fade-in-up"
                    style={{ animationDelay: `${0.9 + idx * 0.1}s` }}
                  >
                    <div className="text-5xl sm:text-6xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text mb-3">
                      {displayValue}{stat.suffix}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown size={32} className="text-purple-600" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 bg-gradient-to-b from-white via-purple-50/30 to-white relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-100/20 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-100/20 rounded-full blur-3xl opacity-40"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-24 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Everything You Need to Scale
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              All the tools your business needs in one unified platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingCart size={32} className="text-gray-600" />,
                title: 'Sales Management',
                description: 'Track orders, quotes, and pipeline across channels.',
              },
              {
                icon: <Package size={32} className="text-orange-600" />,
                title: 'Inventory Control',
                description: 'Real-time stock levels and automated alerts.',
              },
              {
                icon: <Users size={32} className="text-pink-600" />,
                title: 'CRM Suite',
                description: 'Manage every customer interaction.',
              },
              {
                icon: <TrendingUp size={32} className="text-green-600" />,
                title: 'Analytics & Reporting',
                description: 'Powerful dashboards and instant insights.',
              },
              {
                icon: <BarChart3 size={32} className="text-blue-600" />,
                title: 'Financial Management',
                description: 'Complete accounting and invoice management.',
              },
              {
                icon: <Lock size={32} className="text-purple-600" />,
                title: 'Enterprise Security',
                description: 'Bank-level encryption for your data.',
              },
            ].map((feature, idx) => {
              const cardClasses = [
                'p-8 rounded-2xl border transition-all duration-500 transform hover:scale-105 hover:shadow-2xl group animate-fade-in-up cursor-pointer relative overflow-hidden',
                idx === 0 && 'bg-gradient-to-br from-gray-100 to-gray-50 border-gray-300 hover:from-gray-200 hover:to-gray-100 hover:border-gray-400',
                idx === 1 && 'bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200 hover:from-orange-200 hover:to-orange-100 hover:border-orange-300',
                idx === 2 && 'bg-gradient-to-br from-pink-100 to-pink-50 border-pink-200 hover:from-pink-200 hover:to-pink-100 hover:border-pink-300',
                idx === 3 && 'bg-gradient-to-br from-green-100 to-green-50 border-green-200 hover:from-green-200 hover:to-green-100 hover:border-green-300',
                idx === 4 && 'bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200 hover:from-blue-200 hover:to-blue-100 hover:border-blue-300',
                idx === 5 && 'bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200 hover:from-purple-200 hover:to-purple-100 hover:border-purple-300',
              ].filter(Boolean).join(' ');
              
              const iconBgClasses = [
                'mb-4 p-3 bg-white rounded-lg w-fit group-hover:scale-110 transition-all shadow-md group-hover:shadow-lg',
                idx === 0 && 'group-hover:bg-gray-100',
                idx === 1 && 'group-hover:bg-orange-100',
                idx === 2 && 'group-hover:bg-pink-100',
                idx === 3 && 'group-hover:bg-green-100',
                idx === 4 && 'group-hover:bg-blue-100',
                idx === 5 && 'group-hover:bg-purple-100',
              ].filter(Boolean).join(' ');
              
              return (
                <div
                  key={idx}
                  className={cardClasses}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {/* Depth shadow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.05), transparent)`,
                    }}
                  ></div>
                  
                  <div className="relative z-10">
                    <div className={iconBgClasses}>{feature.icon}</div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-purple-700 transition-colors">{feature.title}</h3>
                    <p className="text-gray-600 group-hover:text-gray-700 transition-colors leading-relaxed">{feature.description}</p>
                    <div className="mt-4 h-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="py-32 px-4 bg-gradient-to-br from-white to-purple-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Real-time Inventory Management
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how your inventory, orders, and operations come together in one powerful dashboard
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="animate-fade-in-up group" style={{ animationDelay: '0.2s' }}>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-purple-100 bg-white relative hover:shadow-3xl transition-shadow duration-500">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-15 blur-xl transition-opacity duration-500 -z-10 pointer-events-none"></div>
              {/* Navbar */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <span className="font-bold text-xl">katana</span>
                  <div className="flex gap-6 text-sm">
                    <button className="hover:text-purple-400 transition-colors flex items-center gap-2">Sell</button>
                    <button className="hover:text-purple-400 transition-colors flex items-center gap-2">Make</button>
                    <button className="hover:text-purple-400 transition-colors flex items-center gap-2">Buy</button>
                    <button className="hover:text-purple-400 transition-colors flex items-center gap-2">Stock</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-sm font-semibold">Create</button>
                  <button className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center font-bold text-gray-900">kt</button>
                </div>
              </div>
              
              {/* Table content */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Order #</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Production</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'SO-4', customer: 'B2B Customer', amount: '4656.00', status: 'In stock', prod: 'Processed', delivery: 'Done', highlight: 'yellow' },
                      { id: '#95', customer: 'Shopify Customer', amount: '881.32', status: 'Picked', prod: 'Processed', delivery: 'Done', highlight: 'yellow' },
                      { id: '55', customer: 'HubSpot Customer', amount: '1652.80', status: 'In stock', prod: 'Ready', delivery: 'Pending', highlight: 'none' },
                      { id: '111', customer: 'BigCommerce', amount: '326.94', status: 'In stock', prod: 'Processing', delivery: 'Pending', highlight: 'none' },
                    ].map((order, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 text-gray-600">{order.customer}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">${order.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'In stock' ? 'bg-green-100 text-green-700' :
                            order.status === 'Picked' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.prod === 'Done' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.prod}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.highlight === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                            order.delivery === 'Done' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.delivery}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-32 px-4 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-purple-600 to-pink-600"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-24 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Built for Your Industry
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From retailers to manufacturers, NovaTech adapts to your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'E-Commerce & Retail',
                description: 'Multi-channel sales and inventory management.',
                items: ['Shopify Integration', 'Multi-location Inventory', 'Omnichannel Sync'],
                color: 'from-purple-500 to-purple-600',
              },
              {
                title: 'Manufacturing',
                description: 'Production tracking and supply chain management.',
                items: ['Production Planning', 'BOM Management', 'Quality Control'],
                color: 'from-pink-500 to-pink-600',
              },
              {
                title: 'Wholesale & Distribution',
                description: 'Order management and customer portals.',
                items: ['Customer Portal', 'Dynamic Pricing', 'Bulk Orders'],
                color: 'from-fuchsia-500 to-fuchsia-600',
              },
              {
                title: 'Service Businesses',
                description: 'Project tracking and professional invoicing.',
                items: ['Project Tracking', 'Time Tracking', 'Invoicing'],
                color: 'from-violet-500 to-violet-600',
              },
            ].map((useCase, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 group animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${useCase.color} mb-4 group-hover:scale-125 transition-transform`}></div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text transition-all">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 mb-6">{useCase.description}</p>
                <div className="space-y-2">
                  {useCase.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors group/item">
                      <CheckCircle size={18} className="text-green-500 group-hover/item:scale-125 transition-transform" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Real People Are Saying Section */}
      <section className="py-32 px-4 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl opacity-40"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              What real people are saying
            </h2>
            <p className="text-lg text-gray-600">
              NovaTech supports thousands of businesses in achieving their goals and pushing the boundaries of what's possible.
            </p>
          </div>

          {/* Customer Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "NovaTech allowed us to consolidate everything into one platform. We know what our inventory is at the central hub, and it pushes out to every other location.",
                name: "Lance O'Brien",
                role: "Chief Operating Officer at Mine Baseball",
                metrics: [
                  { value: "60%", label: "Order processing reduction" },
                  { value: "4x", label: "Faster inventory updates" }
                ],
                bgColor: 'from-purple-50 to-purple-100',
                accentColor: 'bg-purple-600'
              },
              {
                quote: "NovaTech allowed us to strategically manage our capacity and increase how many orders we could get by over 50%.",
                name: "Lisa Diep", 
                role: "Chief Operating Officer at Peace Collective",
                metrics: [
                  { value: "$40k+", label: "Recovered inventory value" },
                  { value: "50%", label: "Order capacity increase" }
                ],
                bgColor: 'from-pink-50 to-pink-100',
                accentColor: 'bg-pink-600'
              },
              {
                quote: "Every step from labor costs to final extraction is tracked in NovaTech. It's given us true visibility and control.",
                name: "Karson Hardy",
                role: "Operations Director at Cornbread Hemp",
                metrics: [
                  { value: "100%", label: "Production efficiency gain" },
                  { value: "2x", label: "Production scale-up" }
                ],
                bgColor: 'from-green-50 to-green-100',
                accentColor: 'bg-green-600'
              },
              {
                quote: "The integration capabilities are unmatched. We connected everything in days instead of months.",
                name: "Sarah Johnson",
                role: "CEO at TechFlow Manufacturing",
                metrics: [
                  { value: "5x", label: "Facility scale capability" },
                  { value: "2x", label: "Revenue growth" }
                ],
                bgColor: 'from-blue-50 to-blue-100',
                accentColor: 'bg-blue-600'
              },
              {
                quote: "Real-time visibility across all locations transformed how we manage inventory. Stockouts dropped by 70%.",
                name: "Michael Chen",
                role: "Operations Manager at Global Retail Co",
                metrics: [
                  { value: "70%", label: "Stockout reduction" },
                  { value: "3x", label: "Faster operations" }
                ],
                bgColor: 'from-amber-50 to-amber-100',
                accentColor: 'bg-amber-600'
              },
              {
                quote: "We went from spreadsheets to a fully automated inventory system. The time savings are incredible.",
                name: "Emma Rodriguez",
                role: "Founder at Made Co",
                metrics: [
                  { value: "80%", label: "Manual work eliminated" },
                  { value: "10hrs", label: "Saved per week" }
                ],
                bgColor: 'from-indigo-50 to-indigo-100',
                accentColor: 'bg-indigo-600'
              }
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl bg-gradient-to-br ${testimonial.bgColor} border border-gray-200 hover:shadow-lg transition-all duration-500 transform hover:scale-105 animate-fade-in-up group cursor-pointer relative overflow-hidden`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Accent bar */}
                <div className={`absolute top-0 left-0 h-1 w-full ${testimonial.accentColor}`}></div>
                
                <div className="relative z-10">
                  {/* Quote */}
                  <p className="text-gray-700 mb-4 leading-relaxed italic text-sm line-clamp-3">
                    "{testimonial.quote}"
                  </p>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4 py-3 border-t border-b border-gray-200">
                    {testimonial.metrics.map((metric, i) => (
                      <div key={i} className="text-center">
                        <p className={`font-bold text-lg ${testimonial.accentColor} bg-clip-text text-transparent bg-gradient-to-r from-current`}>
                          {metric.value}
                        </p>
                        <p className="text-xs text-gray-600">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Name and Role */}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials with Carousel */}
      <section className="py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Trusted by Growing Businesses
            </h2>
            <p className="text-lg text-gray-600">See how companies transform with NovaTech</p>
          </div>

          {/* Testimonial Carousel */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    name: 'Sarah Johnson',
                    role: 'CEO at TechFlow Inc',
                    quote: 'NovaTech cut our order processing by 60%. Game-changing.',
                    rating: 5,
                  },
                  {
                    name: 'Michael Chen',
                    role: 'Operations Manager',
                    quote: 'Finally have visibility across all inventory locations.',
                    rating: 5,
                  },
                  {
                    name: 'Emma Rodriguez',
                    role: 'Founder of Made Co',
                    quote: 'Integration capabilities are unmatched. Perfect integration.',
                    rating: 5,
                  },
                ].map((testimonial, idx) => (
                  <div
                    key={idx}
                    className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-100 border border-purple-200 hover:from-purple-100 hover:to-pink-200 hover:border-pink-300 transition-all duration-500 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-200/50 cursor-pointer animate-fade-in-up group relative overflow-hidden"
                    style={{ animationDelay: `${0.3 + idx * 0.15}s` }}
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 to-pink-400/0 group-hover:from-purple-400/10 group-hover:to-pink-400/10 transition-all duration-500 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-gray-700 mb-6 italic relative text-lg leading-relaxed">
                        <span className="text-4xl text-purple-200 absolute -left-3 -top-3">"</span>
                        {testimonial.quote}
                        <span className="text-4xl text-purple-200 absolute -right-3 -bottom-3">"</span>
                      </p>
                      <div>
                        <p className="font-bold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-32 px-4 bg-gradient-to-br from-purple-200 via-purple-200 to-purple-300 text-gray-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-24 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">Why Choose NovaTech?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Zap size={40} />, title: 'Lightning Fast', description: 'Real-time insights' },
              { icon: <Code size={40} />, title: 'Easy Integration', description: 'Connect tools instantly' },
              { icon: <Globe size={40} />, title: 'Cloud Native', description: 'Access anywhere' },
              { icon: <Users size={40} />, title: 'Team Collaboration', description: 'Work seamlessly' },
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="text-center p-8 rounded-2xl bg-white/40 hover:bg-white/60 backdrop-blur-md border border-purple-300 hover:border-purple-400 transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:-translate-y-2 cursor-pointer group animate-fade-in-up relative overflow-hidden"
                style={{ animationDelay: `${0.6 + idx * 0.1}s` }}
              >
                {/* Gradient shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/20 group-hover:via-white/10 group-hover:to-white/5 transition-all duration-500 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-center mb-4 text-purple-600 group-hover:text-purple-700 group-hover:scale-125 transition-all duration-300 transform">{benefit.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-purple-700 transition-colors">{benefit.title}</h3>
                  <p className="text-gray-700 group-hover:text-gray-800 transition-colors">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-32 px-4 relative overflow-hidden" style={{ backgroundColor: '#E6FF33' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 -left-96 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-96 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Integrate Your Tools and Streamline Workflows
            </h2>
            <p className="text-lg text-gray-900/80 max-w-2xl mx-auto">
              Keep your business connected with NovaTech at the center of your operations. Native integrations and open API ensure real-time data flow across all platforms. Build a tech stack tailored to your needs.
            </p>
          </div>

          {/* Integration Grid with connecting lines */}
          <div className="relative mb-16">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
              {/* Left side integrations */}
              <div className="flex flex-col gap-8 md:gap-16 md:w-1/3">
                <div className="flex justify-end">
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-gray-400 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                      <div className="text-3xl group-hover:scale-125 transition-transform">🧡</div>
                    </div>
                    <p className="text-gray-900 text-sm font-semibold text-center mt-3">HubSpot</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-gray-400 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                      <div className="text-3xl group-hover:scale-125 transition-transform">🔮</div>
                    </div>
                    <p className="text-gray-900 text-sm font-semibold text-center mt-3">Xero</p>
                  </div>
                </div>
              </div>

              {/* Center */}
              <div className="flex flex-col items-center gap-4 md:w-1/3">
                <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/50 group hover:scale-125 transition-transform cursor-pointer">
                    <span className="text-3xl font-bold text-gray-900">NT</span>
                  </div>
                  <p className="text-gray-900 text-sm font-semibold text-center mt-3">NovaTech</p>
                </div>
                
                {/* See all integrations button */}
                <button className="mt-8 px-8 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base transition-all transform hover:scale-105 hover:shadow-2xl shadow-lg">
                  See all integrations
                </button>
              </div>

              {/* Right side integrations */}
              <div className="flex flex-col gap-8 md:gap-16 md:w-1/3">
                <div className="flex justify-start">
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-gray-400 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                      <div className="text-3xl group-hover:scale-125 transition-transform">🟢</div>
                    </div>
                    <p className="text-gray-900 text-sm font-semibold text-center mt-3">Shopify</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-gray-400 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                      <div className="text-3xl group-hover:scale-125 transition-transform">📤</div>
                    </div>
                    <p className="text-gray-900 text-sm font-semibold text-center mt-3">API</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connecting lines SVG - visible on md and up */}
            <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none" style={{ top: '-2rem', left: 0, right: 0, bottom: 0 }}>
              <line x1="33%" y1="100" x2="50%" y2="96" stroke="rgba(0,0,0,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="33%" y1="240" x2="50%" y2="96" stroke="rgba(0,0,0,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="67%" y1="100" x2="50%" y2="96" stroke="rgba(0,0,0,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="67%" y1="240" x2="50%" y2="96" stroke="rgba(0,0,0,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          {/* Integration benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Real-time Sync',
                description: 'Automatic data synchronization across all connected tools'
              },
              {
                icon: '🔒',
                title: 'Secure Connection',
                description: 'Enterprise-grade encryption and OAuth authentication'
              },
              {
                icon: '🚀',
                title: 'Easy Setup',
                description: 'One-click integration with zero code required'
              }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-gray-50/60 backdrop-blur-md border border-gray-300 rounded-2xl p-6 hover:bg-gray-100/60 transition-all animate-fade-in-up group cursor-pointer" style={{ animationDelay: `${0.6 + idx * 0.1}s` }}>
                <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-700">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
        {/* Enhanced neon glow background with multiple layers */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 -left-64 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-400 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob" style={{ animationDelay: '3s' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-gray-300 mb-12 leading-relaxed">
              Join hundreds already using NovaTech to streamline operations
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button className="px-6 py-3 rounded-lg border-2 border-white/30 hover:border-yellow-400 hover:bg-white/10 text-white font-bold text-base transition-all duration-300 hover:shadow-md hover:scale-105">
                Schedule Demo
              </button>
            </div>

            <p className="text-gray-400 mt-8 text-sm">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 relative z-10">
          <div>
            <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              NovaTech
            </h3>
            <p className="text-gray-400 hover:text-gray-300 transition-colors">Enterprise ERP for growing businesses</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              {['Features', 'Pricing', 'Security'].map((item) => (
                <li key={item} className="hover:text-white cursor-pointer transition-colors hover:translate-x-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              {['About', 'Blog', 'Careers'].map((item) => (
                <li key={item} className="hover:text-white cursor-pointer transition-colors hover:translate-x-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              {['Privacy', 'Terms', 'Contact'].map((item) => (
                <li key={item} className="hover:text-white cursor-pointer transition-colors hover:translate-x-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400 relative z-10">
          <p>&copy; 2026 NovaTech. All rights reserved.</p>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(37, 99, 235, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
          }
        }

        /* Enhanced animations */
        .animate-blob {
          animation: blob 7s infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-slide-in {
          animation: slideIn 0.6s ease-out;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        /* Enhanced button effects */
        button {
          position: relative;
          overflow: hidden;
        }

        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }

        button:hover::before {
          left: 100%;
        }

        /* Smooth transitions on all interactive elements */
        * {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
      `}</style>
    </div>
  )
}

export default Landing
