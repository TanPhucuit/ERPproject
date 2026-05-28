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
  AlertCircle,
  Users,
  Warehouse,
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

const formatPercent = (value: number) =>
  `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`

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
  topCustomers: [],
  topBins: [],
  topSales: [],
  quotationStatusData: [],
  acceptedQuotationTrend: [],
  returnRateTrend: [],
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
          quotations,
          leads,
          users,
          deliveryOrders,
          salesReturns,
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
          erpApi.get<any[]>('/sales-orders/quotations?limit=1000'),
          erpApi.get<any[]>('/crm/leads?limit=1000'),
          erpApi.get<any[]>('/users?limit=1000'),
          erpApi.get<any[]>('/inventory/delivery-orders?limit=1000'),
          erpApi.get<any[]>('/sales/returns?limit=1000'),
        ])

        const todayText = new Date().toISOString().slice(0, 10)
        const months = lastMonthKeys(6)
        const monthlyRevenue = new Map(months.map((month) => [month, 0]))
        const acceptedQuotationTrend = new Map(months.map((month) => [month, 0]))
        const returnRateBuckets = new Map(months.map((month) => [month, { month, salesOrders: 0, returns: 0, returnRate: 0 }]))
        const quarterlyBuckets = new Map<string, { metric: string; sales: number; orders: number; customers: number }>()
        const invoiceStatus = { paid: 0, pending: 0, overdue: 0 }
        const creditMap = buildCreditMap(creditNotes)
        const customerSales = new Map<string, {
          name: string
          revenue: number
          products: Map<string, { name: string; quantity: number; revenue: number }>
        }>()
        const leadsById = new Map(leads.map((lead) => [lead.id, lead]))
        const usersById = new Map(users.map((user) => [user.id, user]))
        const quotationStatusCounts = { accepted: 0, sent: 0, rejected: 0 }
        const salesAcceptance = new Map<string, {
          name: string
          acceptedLeadIds: Set<string>
          quotationCount: number
          revenue: number
        }>()
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

          const customerKey = invoice.customer_id || invoice.customer?.id || invoice.sales_order?.customer_id || invoice.customer_name || invoice.id
          const customerName = invoice.customer_name || invoice.customer?.name || invoice.customer?.full_name || invoice.customer?.company_name || 'Unknown Customer'
          const customerBucket = customerSales.get(customerKey) || { name: customerName, revenue: 0, products: new Map() }
          customerBucket.revenue += amount

          ;(invoice.lines || invoice.items || invoice.sales_order?.lines || invoice.sales_order?.items || invoice.sales_order?.sales_order_items || []).forEach((line: any) => {
            const productKey = line.product_id || line.product?.id || line.product_sku || line.product_name
            if (!productKey) return
            const productBucket = customerBucket.products.get(productKey) || {
              name: line.product_name || line.product?.product_name || line.product?.name || line.product_sku || 'Product',
              quantity: 0,
              revenue: 0,
            }
            const quantity = toNumber(line.quantity ?? line.quantity_ordered)
            productBucket.quantity += quantity
            productBucket.revenue += toNumber(line.line_total) || quantity * toNumber(line.unit_price)
            customerBucket.products.set(productKey, productBucket)
          })

          customerSales.set(customerKey, customerBucket)

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

            const month = date.toISOString().slice(0, 7)
            const returnBucket = returnRateBuckets.get(month)
            if (returnBucket && !isCancelled(order.status)) returnBucket.salesOrders += 1
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

        const binUsage = new Map<string, {
          code: string
          name: string
          warehouse: string
          quantity: number
          orderIds: Set<string>
        }>()
        deliveryOrders.filter((order) => !isCancelled(order.status)).forEach((order) => {
          ;(order.items || order.delivery_order_items || []).forEach((line: any) => {
            const bin = line.bin_location
            const key = line.bin_location_id || bin?.id || bin?.location_code
            if (!key) return
            const bucket = binUsage.get(key) || {
              code: bin?.location_code || bin?.bin_code || 'Unknown Bin',
              name: bin?.location_name || bin?.name || bin?.location_code || 'Unknown Bin',
              warehouse: bin?.warehouse?.warehouse_name || bin?.warehouseName || 'Warehouse',
              quantity: 0,
              orderIds: new Set<string>(),
            }
            bucket.quantity += toNumber(line.quantity_requested ?? line.quantity ?? line.quantity_delivered)
            if (order.id) bucket.orderIds.add(order.id)
            binUsage.set(key, bucket)
          })
        })

        quotations.forEach((quotation) => {
          const status = String(quotation.status || '').toLowerCase()
          if (status === 'accepted') quotationStatusCounts.accepted += 1
          else if (status === 'rejected') quotationStatusCounts.rejected += 1
          else quotationStatusCounts.sent += 1

          if (status !== 'accepted') return
          const acceptedDate = quotation.approved_at || quotation.issued_date || quotation.issue_date || quotation.created_at
          const month = monthKey(acceptedDate)
          if (month && acceptedQuotationTrend.has(month)) {
            acceptedQuotationTrend.set(month, (acceptedQuotationTrend.get(month) || 0) + 1)
          }

          const lead = quotation.lead || leadsById.get(quotation.lead_id)
          const salesId = lead?.assigned_to_id || lead?.owner_id || quotation.approved_by_id || quotation.created_by_id
          if (!salesId) return
          const user = usersById.get(salesId)
          const bucket = salesAcceptance.get(salesId) || {
            name: user?.full_name || user?.fullName || user?.username || user?.email || 'Unassigned Sales',
            acceptedLeadIds: new Set<string>(),
            quotationCount: 0,
            revenue: 0,
          }
          if (quotation.lead_id || lead?.id) bucket.acceptedLeadIds.add(quotation.lead_id || lead.id)
          bucket.quotationCount += 1
          bucket.revenue += toNumber(quotation.total_amount || quotation.totalAmount)
          salesAcceptance.set(salesId, bucket)
        })

        salesReturns.filter((item) => !isCancelled(item.status)).forEach((item) => {
          const date = item.return_date ? new Date(item.return_date) : item.returnDate ? new Date(item.returnDate) : item.created_at ? new Date(item.created_at) : null
          if (!date || Number.isNaN(date.getTime())) return
          const month = date.toISOString().slice(0, 7)
          const bucket = returnRateBuckets.get(month)
          if (bucket) bucket.returns += 1
        })

        returnRateBuckets.forEach((bucket) => {
          bucket.returnRate = bucket.salesOrders > 0 ? (bucket.returns / bucket.salesOrders) * 100 : 0
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
          topCustomers: Array.from(customerSales.values())
            .map((customer) => {
              const topProduct = Array.from(customer.products.values()).sort((a, b) => b.revenue - a.revenue)[0]
              return { name: customer.name, revenue: customer.revenue, topProduct }
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5),
          topBins: Array.from(binUsage.values())
            .map((bin) => ({ code: bin.code, name: bin.name, warehouse: bin.warehouse, quantity: bin.quantity, orderCount: bin.orderIds.size }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5),
          topSales: Array.from(salesAcceptance.values())
            .map((sale) => ({
              name: sale.name,
              leadCount: sale.acceptedLeadIds.size || sale.quotationCount,
              quotationCount: sale.quotationCount,
              revenue: sale.revenue,
            }))
            .sort((a, b) => b.leadCount - a.leadCount || b.revenue - a.revenue)
            .slice(0, 5),
          quotationStatusData: [
            { name: 'Accepted', value: quotationStatusCounts.accepted, color: '#10b981' },
            { name: 'Sent', value: quotationStatusCounts.sent, color: '#3b82f6' },
            { name: 'Rejected', value: quotationStatusCounts.rejected, color: '#ef4444' },
          ],
          acceptedQuotationTrend: Array.from(acceptedQuotationTrend.entries()).map(([month, accepted]) => ({ month, accepted })),
          returnRateTrend: Array.from(returnRateBuckets.values()),
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
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
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

      {/* Customer & Product Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Top Customers
          </h2>
          <div className="space-y-4">
            {metrics.topCustomers?.length > 0 ? metrics.topCustomers.map((customer: any, idx: number) => (
              <div key={`${customer.name}-${idx}`} className="flex items-start justify-between gap-4 pb-3 border-b last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Top product</span>
                    <span className="max-w-full truncate text-xs text-gray-600">
                      {customer.topProduct?.name || 'No product data'}
                    </span>
                  </div>
                  {customer.topProduct?.revenue > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Product revenue {formatCurrency(customer.topProduct.revenue)}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-lg font-bold text-blue-600">
                  {formatCurrency(customer.revenue)}
                </p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No customer revenue data available yet.
              </div>
            )}
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

      {/* Operations Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bins */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Warehouse size={20} className="text-orange-600" />
            Top Bins by Order Quantity
          </h2>
          <div className="space-y-4">
            {metrics.topBins?.length > 0 ? metrics.topBins.map((bin: any, idx: number) => (
              <div key={`${bin.code}-${idx}`} className="flex items-start justify-between gap-4 pb-3 border-b last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{bin.code} - {bin.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">{bin.warehouse}</span>
                    <span className="text-xs text-gray-600">{formatCompact(bin.orderCount)} delivery orders</span>
                  </div>
                </div>
                <p className="shrink-0 text-lg font-bold text-blue-600">
                  {formatCompact(bin.quantity)}
                </p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No delivery bin data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Sales */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Top Sales by Accepted Leads
          </h2>
          <div className="space-y-4">
            {metrics.topSales?.length > 0 ? metrics.topSales.map((sale: any, idx: number) => (
              <div key={`${sale.name}-${idx}`} className="flex items-start justify-between gap-4 pb-3 border-b last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{sale.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Accepted leads</span>
                    <span className="text-xs text-gray-600">{formatCompact(sale.quotationCount)} accepted quotations</span>
                  </div>
                  {sale.revenue > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Accepted quotation value {formatCurrency(sale.revenue)}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-lg font-bold text-blue-600">
                  {formatCompact(sale.leadCount)}
                </p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No accepted quotation owner data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quotation and Return Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Quotation Status</h2>
            <p className="text-sm text-gray-600 mb-6">Accepted, sent, and rejected quotations</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={metrics.quotationStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={76}
                fill="#0f3a7d"
                dataKey="value"
              >
                {metrics.quotationStatusData?.map((entry: any, index: number) => (
                  <Cell key={`quotation-status-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Accepted Quotations</h2>
            <p className="text-sm text-gray-600">Accepted quotation count over the last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={metrics.acceptedQuotationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis allowDecimals={false} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="accepted" fill="#10b981" name="Accepted quotations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Return Rate</h2>
            <p className="text-sm text-gray-600">Sales returns divided by sales orders</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={metrics.returnRateTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => formatPercent(toNumber(value))} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => formatPercent(toNumber(value))}
              />
              <Line type="monotone" dataKey="returnRate" stroke="#ef4444" strokeWidth={2} dot name="Return rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

export default Dashboard

