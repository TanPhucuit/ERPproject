import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Users,
  Warehouse,
  Loader,
} from 'lucide-react'
import { erpApi } from '../services/erpApi'

const emptyMetrics = {
  totalRevenue: 0,
  totalOrders: 0,
  activeCustomers: 0,
  invoiceStatus: { paid: 0, pending: 0, overdue: 0 },
  revenueByMonth: [],
  topProducts: [],
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(emptyMetrics)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dailyMetrics, productMetrics, customerMetrics, accountingMetrics] = await Promise.all([
          erpApi.get<any[]>('/metrics/daily?days=180'),
          erpApi.get<any[]>('/metrics/products'),
          erpApi.get<any[]>('/metrics/customers'),
          erpApi.get<any>('/accounting/metrics'),
        ])

        const monthlyRevenue = new Map<string, number>()
        dailyMetrics.forEach((metric) => {
          const month = String(metric.metric_date || '').slice(0, 7)
          monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + Number(metric.total_sales_revenue || 0))
        })

        setMetrics({
          totalRevenue: dailyMetrics.reduce((sum, metric) => sum + Number(metric.total_sales_revenue || 0), 0),
          totalOrders: dailyMetrics.reduce((sum, metric) => sum + Number(metric.orders_created || 0), 0),
          activeCustomers: customerMetrics.length,
          invoiceStatus: {
            paid: accountingMetrics?.paidInvoices || accountingMetrics?.paid_invoices || 0,
            pending: accountingMetrics?.pendingInvoices || accountingMetrics?.pending_invoices || 0,
            overdue: accountingMetrics?.overdueInvoices || accountingMetrics?.overdue_invoices || 0,
          },
          revenueByMonth: Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue })),
          topProducts: productMetrics.map((product) => ({
            name: product.product_name || product.name || product.sku || 'Product',
            sales: Number(product.total_quantity_sold || product.total_revenue || 0),
          })),
        })
      } catch (loadError: any) {
        setError(loadError.message || 'Unable to load dashboard data from backend')
        setMetrics(emptyMetrics)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const stats = [
    {
      label: 'Total Revenue',
      value: metrics.totalRevenue,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Active Orders',
      value: metrics.totalOrders,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      label: 'Total Customers',
      value: metrics.activeCustomers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: '+5.3%',
      trendUp: true,
    },
    {
      label: 'Inventory Items',
      value: '2,430',
      icon: Warehouse,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: '-2.1%',
      trendUp: false,
    },
  ]

  const invoiceData = [
    { name: 'Paid', value: metrics.invoiceStatus.paid, color: '#10b981' },
    { name: 'Pending', value: metrics.invoiceStatus.pending, color: '#f59e0b' },
    { name: 'Overdue', value: metrics.invoiceStatus.overdue, color: '#ef4444' },
  ]

  const performanceData = [
    { metric: 'Q1', sales: 4000, orders: 2400, customers: 2210 },
    { metric: 'Q2', sales: 3000, orders: 1398, customers: 2210 },
    { metric: 'Q3', sales: 2000, orders: 9800, customers: 2290 },
    { metric: 'Q4', sales: 2780, orders: 3908, customers: 2000 },
  ]

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader className="animate-spin text-blue-600 mr-2" size={20} />
          <p className="text-blue-700 font-medium">Loading dashboard data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error Loading Dashboard</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Generate Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow hover:shadow-md transition-all p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-semibold">{stat.label}</h3>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`${stat.color}`} size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                <TrendIcon size={16} />
                <span className="font-semibold">{stat.trend}</span>
                <span className="text-gray-500">vs last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend - Large */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
              <p className="text-sm text-gray-600">Monthly revenue over last 6 months</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Details →</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => value.toLocaleString()}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0f3a7d" strokeWidth={2} dot={false} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Invoice Status</h2>
            <p className="text-sm text-gray-600 mb-6">Distribution by status</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={invoiceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#0f3a7d"
                dataKey="value"
              >
                {invoiceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-sm">
            {invoiceData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Quarterly Performance</h2>
            <p className="text-sm text-gray-600">Sales, orders & customers by quarter</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metric" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#0f3a7d" name="Sales ($1000s)" />
              <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
              <ShoppingCart size={18} className="text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">New Order</p>
                <p className="text-xs text-gray-600">Create sales order</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
              <Package size={18} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Stock Check</p>
                <p className="text-xs text-gray-600">Review inventory</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
              <Users size={18} className="text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">New Customer</p>
                <p className="text-xs text-gray-600">Add customer info</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-600" />
            Important Alerts
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">3 Overdue Invoices</p>
                <p className="text-sm text-gray-600">Total amount: $15,240</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">5 Low Stock Items</p>
                <p className="text-sm text-gray-600">Urgent reorder needed</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Clock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Pending Approvals</p>
                <p className="text-sm text-gray-600">2 purchase orders waiting</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            Top Products
          </h2>
          <div className="space-y-4">
            {metrics.topProducts?.map((product: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Sales</span>
                    <span className="text-xs text-gray-600">{product.sales} units sold</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {product.sales.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'VND',
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard
