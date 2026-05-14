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
  Clock,
  AlertCircle,
  Users,
  Warehouse,
  Loader,
} from 'lucide-react'
import { erpApi } from '../services/erpApi'

const toNumber = (value: any) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const monthKey = (dateText?: string | null) => {
  const date = dateText ? new Date(dateText) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 7) : ''
}

const lastMonthKeys = (count: number) => {
  const keys: string[] = []
  const date = new Date()
  date.setDate(1)
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = new Date(date)
    item.setMonth(date.getMonth() - index)
    keys.push(item.toISOString().slice(0, 7))
  }
  return keys
}

const isPaid = (status?: string) => ['paid', 'completed'].includes(String(status || '').toLowerCase())
const isCancelled = (status?: string) => ['cancelled', 'canceled', 'rejected'].includes(String(status || '').toLowerCase())

const isOverdueInvoice = (invoice: any, todayText: string) => {
  const status = String(invoice.status || '').toLowerCase()
  return !isPaid(status) && !isCancelled(status) && invoice.due_date && String(invoice.due_date).slice(0, 10) < todayText
}

const buildCreditMap = (creditNotes: any[]) => creditNotes.reduce((map, note) => {
  const invoiceId = note.invoices_id || note.invoice_id
  if (!invoiceId) return map
  map.set(invoiceId, (map.get(invoiceId) || 0) + toNumber(note.total_amount || note.totalAmount))
  return map
}, new Map<string, number>())

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

const formatCompact = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 0 })

const emptyMetrics = {
  totalRevenue: 0,
  activeOrders: 0,
  activeCustomers: 0,
  inventoryItems: 0,
  totalAvailableStock: 0,
  cashBalance: 0,
  invoiceStatus: { paid: 0, pending: 0, overdue: 0 },
  revenueByMonth: [],
  quarterlyPerformance: [],
  topProducts: [],
  alerts: {
    overdueInvoices: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
  },
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
        const [
          invoices,
          salesOrders,
          customers,
          products,
          stockLevels,
          binStock,
          purchaseOrders,
          accounts,
          creditNotes,
        ] = await Promise.all([
          erpApi.get<any[]>('/accounting/invoices?limit=1000'),
          erpApi.get<any[]>('/sales-orders?limit=1000'),
          erpApi.get<any[]>('/customers?limit=1000'),
          erpApi.get<any[]>('/products?limit=1000'),
          erpApi.get<any[]>('/inventory/stock-levels?limit=500'),
          erpApi.get<any[]>('/inventory/stock-in-bins?limit=1000'),
          erpApi.get<any[]>('/purchase/purchase-orders?limit=500'),
          erpApi.get<any[]>('/accounting/accounts'),
          erpApi.get<any[]>('/accounting/credit-notes?limit=1000'),
        ])

        const todayText = new Date().toISOString().slice(0, 10)
        const monthlyRevenue = new Map(lastMonthKeys(6).map((month) => [month, 0]))
        const quarterlyBuckets = new Map<string, { metric: string; sales: number; orders: number; customers: number }>()
        const invoiceStatus = { paid: 0, pending: 0, overdue: 0 }
        const creditMap = buildCreditMap(creditNotes)
        let totalRevenue = 0

        invoices.forEach((invoice) => {
          if (isCancelled(invoice.status)) return
          const amount = Math.max(toNumber(invoice.net_amount ?? invoice.subtotal ?? invoice.total_amount) - (creditMap.get(invoice.id) || 0), 0)
          totalRevenue += amount
          const month = monthKey(invoice.issue_date || invoice.created_at)
          if (month && monthlyRevenue.has(month)) {
            monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + amount)
          }

          if (isPaid(invoice.status)) invoiceStatus.paid += 1
          else if (isOverdueInvoice(invoice, todayText)) invoiceStatus.overdue += 1
          else invoiceStatus.pending += 1

          const date = invoice.issue_date ? new Date(invoice.issue_date) : invoice.created_at ? new Date(invoice.created_at) : null
          if (date && !Number.isNaN(date.getTime())) {
            const quarter = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`
            const bucket = quarterlyBuckets.get(quarter) || { metric: quarter, sales: 0, orders: 0, customers: 0 }
            bucket.sales += amount
            quarterlyBuckets.set(quarter, bucket)
          }
        })

        salesOrders.forEach((order) => {
          const date = order.order_date ? new Date(order.order_date) : order.created_at ? new Date(order.created_at) : null
          if (date && !Number.isNaN(date.getTime())) {
            const quarter = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`
            const bucket = quarterlyBuckets.get(quarter) || { metric: quarter, sales: 0, orders: 0, customers: 0 }
            bucket.orders += 1
            quarterlyBuckets.set(quarter, bucket)
          }
        })

        customers.forEach((customer) => {
          const date = customer.created_at ? new Date(customer.created_at) : null
          if (date && !Number.isNaN(date.getTime())) {
            const quarter = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`
            const bucket = quarterlyBuckets.get(quarter) || { metric: quarter, sales: 0, orders: 0, customers: 0 }
            bucket.customers += 1
            quarterlyBuckets.set(quarter, bucket)
          }
        })

        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>()
        salesOrders.filter((order) => !isCancelled(order.status)).forEach((order) => {
          ;(order.lines || order.sales_order_lines || []).forEach((line: any) => {
            const key = line.product_id || line.product?.id || line.product_sku || line.product_name
            if (!key) return
            const current = productSales.get(key) || {
              name: line.product_name || line.product?.product_name || line.product_sku || 'Product',
              quantity: 0,
              revenue: 0,
            }
            const quantity = toNumber(line.quantity ?? line.quantity_ordered)
            current.quantity += quantity
            current.revenue += quantity * toNumber(line.unit_price)
            productSales.set(key, current)
          })
        })

        const lowStockItems = stockLevels.filter((item) =>
          ['understocked', 'critical', 'low'].includes(String(item.reorder_status || item.reorderStatus || '').toLowerCase())
          || toNumber(item.available ?? item.quantityAvailable) <= 0
        ).length

        const pendingApprovals = purchaseOrders.filter((po) =>
          ['sent'].includes(String(po.status || '').toLowerCase())
        ).length

        setMetrics({
          totalRevenue,
          activeOrders: salesOrders.filter((order) => !['delivered', 'cancelled', 'canceled'].includes(String(order.status || '').toLowerCase())).length,
          activeCustomers: customers.filter((customer) => customer.is_active !== false && customer.status !== 'inactive').length,
          inventoryItems: products.filter((product) => product.is_active !== false && product.status !== 'inactive').length,
          totalAvailableStock: stockLevels.reduce((sum, item) => sum + toNumber(item.available ?? item.quantityAvailable), 0),
          cashBalance: accounts.reduce((sum, account) => sum + toNumber(account.balance), 0),
          invoiceStatus,
          revenueByMonth: Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue })),
          quarterlyPerformance: Array.from(quarterlyBuckets.values()).sort((a, b) => a.metric.localeCompare(b.metric)),
          topProducts: Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5),
          alerts: {
            overdueInvoices: invoiceStatus.overdue,
            lowStockItems,
            pendingApprovals,
          },
          binRows: binStock.length,
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
      label: 'Net Revenue',
      value: metrics.totalRevenue,
      displayValue: formatCurrency(metrics.totalRevenue),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      helperText: 'Untaxed invoice revenue after credit notes',
    },
    {
      label: 'Active Orders',
      value: metrics.activeOrders,
      displayValue: formatCompact(metrics.activeOrders),
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      helperText: 'Sales orders not delivered/cancelled',
    },
    {
      label: 'Total Customers',
      value: metrics.activeCustomers,
      displayValue: formatCompact(metrics.activeCustomers),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      helperText: 'Active customer records',
    },
    {
      label: 'Available Stock',
      value: metrics.totalAvailableStock,
      displayValue: formatCompact(metrics.totalAvailableStock),
      icon: Warehouse,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      helperText: `${formatCompact(metrics.inventoryItems)} active products`,
    },
  ]

  const invoiceData = [
    { name: 'Paid', value: metrics.invoiceStatus.paid, color: '#10b981' },
    { name: 'Pending', value: metrics.invoiceStatus.pending, color: '#f59e0b' },
    { name: 'Overdue', value: metrics.invoiceStatus.overdue, color: '#ef4444' },
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
          <p className="text-gray-600 mt-1">Live overview calculated from the current ERP tables.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
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
              <p className="text-2xl font-bold text-gray-900">{stat.displayValue}</p>
              <p className="mt-2 text-sm text-gray-500">{stat.helperText}</p>
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
              <p className="text-sm text-gray-600">Invoice revenue over the last 6 months</p>
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
                formatter={(value) => formatCurrency(toNumber(value))}
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
            <p className="text-sm text-gray-600">Invoice revenue, sales orders, and new customers by quarter</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.quarterlyPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metric" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#0f3a7d" name="Revenue (VND)" />
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
                <p className="font-semibold text-gray-900">{metrics.alerts.overdueInvoices} Overdue Invoices</p>
                <p className="text-sm text-gray-600">Live count from accounting data</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{metrics.alerts.lowStockItems} Low Stock Items</p>
                <p className="text-sm text-gray-600">Based on current reorder status</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Clock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Pending Approvals</p>
                <p className="text-sm text-gray-600">{metrics.alerts.pendingApprovals} purchase orders waiting</p>
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
            {metrics.topProducts?.length > 0 ? metrics.topProducts.map((product: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Sales</span>
                    <span className="text-xs text-gray-600">{formatCompact(product.quantity)} units sold</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No product sales data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard

