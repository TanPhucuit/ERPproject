import React, { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import {
  ActionToolbar,
  formatCurrency,
  KanbanBoard,
  ModuleHeader,
  ModuleTabs,
  RecordActions,
  StatusBadge,
  ViewMode,
} from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

// ========== CALCULATION HELPERS ==========
// Subtotal = Σ(qty × unit_price × (1 - discount%/100))
const calcLineTotal = (q: number, p: number, d: number) => q * p * (1 - d / 100)
const calcSubtotal = (lines: any[]) =>
  lines.reduce((sum, l) => sum + (l.line_total || 0), 0)
const calcTaxAmount = (subtotal: number, taxPct: number) =>
  subtotal * taxPct / 100
const calcTotal = (subtotal: number, taxAmt: number) =>
  subtotal + taxAmt
const calcProfit = (total: number, totalCost: number) => total - totalCost
const calcProfitMargin = (total: number, profit: number) =>
  total > 0 ? (profit / total * 100) : 0

// ========== ORDER LINE TYPE ==========
interface OrderLine {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number          // form field name
  unit_price: number
  cost_price: number
  discount_percent: number
  line_total: number       // computed locally only
}

// ========== FORM RECORD TYPE ==========
interface FormRecord {
  id?: string
  quotation_number?: string
  order_number?: string
  quotation_id?: string
  customer_id: string
  customer_name: string
  lead_id?: string
  issued_date?: string
  valid_until_date?: string
  order_date?: string
  required_delivery_date?: string
  lines: OrderLine[]
  // Only editable field the user inputs
  tax_percent: number
  // Computed locally for display only - NOT sent to API
  subtotal: number
  tax_amount: number
  total_amount: number
  total_cost: number
  estimated_profit: number
  profit_margin_percent: number
  // Display only
  status: string
  notes: string
}

// ========== LINES EDITOR COMPONENT ==========
const LinesEditor: React.FC<{
  lines: OrderLine[]
  onChange: (lines: OrderLine[]) => void
  products: any[]
  showCost?: boolean
}> = ({ lines, onChange, products, showCost = false }) => {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredProducts = products.filter(p =>
    !lines.some(l => l.product_id === p.id) &&
    ((p.name || '').toLowerCase().includes(search.toLowerCase()) ||
     (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  )

  const addProduct = (product: any) => {
    const line: OrderLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: 1,
      unit_price: Number(product.list_price || 0),
      cost_price: Number(product.cost_price || 0),
      discount_percent: 0,
      line_total: calcLineTotal(1, Number(product.list_price || 0), 0),
    }
    onChange([...lines, line])
    setSearch('')
    setShowDropdown(false)
  }

  const updateLine = (id: string, key: keyof OrderLine, value: number) => {
    onChange(lines.map(l => {
      if (l.id !== id) return l
      const next = { ...l, [key]: value }
      next.line_total = calcLineTotal(next.quantity, next.unit_price, next.discount_percent)
      return next
    }))
  }

  const removeLine = (id: string) => onChange(lines.filter(l => l.id !== id))

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Tìm sản phẩm để thêm..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {showDropdown && filteredProducts.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-w-lg rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
            {filteredProducts.slice(0, 12).map(p => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.sku}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600">{formatCurrency(p.list_price)}</span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && filteredProducts.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg p-3 text-sm text-gray-500">
            Không tìm thấy sản phẩm phù hợp
          </div>
        )}
      </div>

      {/* Table */}
      {lines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Sản phẩm</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-16">SL</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Đơn giá</th>
                {showCost && <th className="px-2 py-2 text-right font-semibold text-gray-700 w-24">Giá vốn</th>}
                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">CK%</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Thành tiền</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map(line => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{line.product_name}</p>
                    <p className="text-xs text-gray-400">{line.product_sku}</p>
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min={1} value={line.quantity}
                      onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                      className="w-full rounded border border-gray-300 px-1 py-1 text-center text-sm focus:border-blue-500 focus:outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min={0} value={line.unit_price}
                      onChange={e => updateLine(line.id, 'unit_price', Number(e.target.value))}
                      className="w-full rounded border border-gray-300 px-1 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
                  </td>
                  {showCost && (
                    <td className="px-2 py-2 text-right text-sm text-gray-500">
                      {formatCurrency(line.cost_price)}
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <input type="number" min={0} max={100} value={line.discount_percent}
                      onChange={e => updateLine(line.id, 'discount_percent', Number(e.target.value))}
                      className="w-full rounded border border-gray-300 px-1 py-1 text-center text-sm focus:border-blue-500 focus:outline-none" />
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-blue-700">
                    {formatCurrency(line.line_total)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => removeLine(line.id)} className="rounded p-1 text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-gray-500">
          Chưa có sản phẩm. Thêm sản phẩm bằng ô tìm kiếm trên.
        </div>
      )}
    </div>
  )
}

// ========== SALES MODAL ==========
const SalesModal: React.FC<{
  isOpen: boolean
  activeTab: 'quotations' | 'orders'
  record: FormRecord | null
  customers: any[]
  leads: any[]
  products: any[]
  quotations: any[]
  onClose: () => void
  onSave: (data: FormRecord) => void
  errorMessage?: string | null
}> = ({ isOpen, activeTab, record, customers, leads, products, quotations, onClose, onSave, errorMessage }) => {
  const isOrder = activeTab === 'orders'
  const showCost = isOrder

  const [form, setForm] = useState<FormRecord>({
    customer_id: '',
    customer_name: '',
    lead_id: '',
    issued_date: new Date().toISOString().slice(0, 10),
    order_date: new Date().toISOString().slice(0, 10),
    valid_until_date: '',
    required_delivery_date: '',
    lines: [],
    tax_percent: 10,
    subtotal: 0, tax_amount: 0, total_amount: 0,
    total_cost: 0, estimated_profit: 0, profit_margin_percent: 0,
    status: 'draft',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (record) {
      const lines: OrderLine[] = (record.lines || []).map((l: any) => ({
        id: l.id || `line-${Date.now()}`,
        product_id: l.product_id || '',
        product_name: l.product_name || l.product?.name || '',
        product_sku: l.product?.sku || '',
        quantity: l.quantity || l.quantity_ordered || 1,
        unit_price: l.unit_price || 0,
        cost_price: l.cost_price || l.product?.cost_price || 0,
        discount_percent: l.discount_percent || 0,
        line_total: l.line_total || calcLineTotal(l.quantity || 1, l.unit_price || 0, l.discount_percent || 0),
      }))
      const subtotal = calcSubtotal(lines)
      const tax_amount = calcTaxAmount(subtotal, record.tax_percent || 10)
      const total_amount = calcTotal(subtotal, tax_amount)
      const total_cost = lines.reduce((s, l) => s + l.quantity * l.cost_price, 0)
      const estimated_profit = calcProfit(total_amount, total_cost)
      const profit_margin_percent = calcProfitMargin(total_amount, estimated_profit)
      setForm({ ...record, lines, subtotal, tax_amount, total_amount, total_cost, estimated_profit, profit_margin_percent })
    } else {
      setForm({
        customer_id: '', customer_name: '',
        lead_id: '',
        issued_date: new Date().toISOString().slice(0, 10),
        order_date: new Date().toISOString().slice(0, 10),
        valid_until_date: '',
        required_delivery_date: '',
        lines: [],
        tax_percent: 10,
        subtotal: 0, tax_amount: 0, total_amount: 0,
        total_cost: 0, estimated_profit: 0, profit_margin_percent: 0,
        status: 'draft',
        notes: '',
      })
    }
    setErrors({})
  }, [record, isOpen, isOrder])

  // Auto-calculate whenever lines or tax_percent changes
  useEffect(() => {
    const subtotal = calcSubtotal(form.lines)
    const tax_amount = calcTaxAmount(subtotal, form.tax_percent)
    const total_amount = calcTotal(subtotal, tax_amount)
    const total_cost = form.lines.reduce((s, l) => s + l.quantity * l.cost_price, 0)
    const estimated_profit = calcProfit(total_amount, total_cost)
    const profit_margin_percent = calcProfitMargin(total_amount, estimated_profit)
    setForm(f => ({ ...f, subtotal, tax_amount, total_amount, total_cost, estimated_profit, profit_margin_percent }))
  }, [form.lines, form.tax_percent])

  const updateField = (key: keyof FormRecord, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleSave = () => {
    const nextErrors: Record<string, string> = {}
    if (isOrder && !form.customer_id) nextErrors.customer_id = 'Khách hàng là bắt buộc'
    if (!isOrder && !form.lead_id) nextErrors.lead_id = 'Phải chọn Lead nguồn'
    if (form.lines.length === 0) nextErrors.lines = 'Phải có ít nhất 1 sản phẩm'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave(form)
  }

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name}${c.customer_number ? ` (${c.customer_number})` : ''}` }))
  const leadOptions = leads
    .filter(l => !['won'].includes(l.stage_name || l.stage || l.status))
    .map(l => ({ value: l.id, label: `${l.lead_number || ''} - ${l.company_name}` }))
  const quotationOptions = quotations.filter(q => ['sent', 'accepted', 'won'].includes(q.status)).map(q => ({ value: q.id, label: `${q.quotation_number} - ${q.customer?.name || ''}` }))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {record?.id ? `Sửa ${isOrder ? 'Sales Order' : 'Quotation'}` : `Tạo ${isOrder ? 'Sales Order' : 'Quotation'} mới`}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">{errorMessage}</p>
          </div>
        )}

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Mã</label>
              <input type="text" value={form.quotation_number || form.order_number || '(tự động)'} readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
            </div>
            {isOrder && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Khách hàng {isOrder && <span className="text-red-500">*</span>}
              </label>
              <select value={form.customer_id}
                onChange={e => {
                  const c = customers.find(c => c.id === e.target.value)
                  updateField('customer_id', e.target.value)
                  updateField('customer_name', c?.name || '')
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.customer_id ? 'border-red-400' : 'border-gray-300'}`}>
                <option value="">-- Chọn khách hàng --</option>
                {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.customer_id && <p className="mt-1 text-xs text-red-600">{errors.customer_id}</p>}
            </div>
            )}

            {!isOrder && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Lead nguồn</label>
                <select value={form.lead_id || ''} onChange={e => updateField('lead_id', e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.lead_id ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">-- Không có Lead --</option>
                  {leadOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.lead_id && <p className="mt-1 text-xs text-red-600">{errors.lead_id}</p>}
              </div>
            )}

            {isOrder && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Từ Quotation</label>
                <select value={form.quotation_id || ''} onChange={e => updateField('quotation_id', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">-- Không có Quotation --</option>
                  {quotationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                {isOrder ? 'Ngày đặt hàng' : 'Ngày báo giá'}
              </label>
              <input type="date" value={isOrder ? (form.order_date || '') : (form.issued_date || '')}
                onChange={e => updateField(isOrder ? 'order_date' : 'issued_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                {isOrder ? 'Ngày giao dự kiến' : 'Hạn báo giá'}
              </label>
              <input type="date" value={isOrder ? (form.required_delivery_date || '') : (form.valid_until_date || '')}
                onChange={e => updateField(isOrder ? 'required_delivery_date' : 'valid_until_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

          </div>

          {/* Product Lines */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                📦 Sản phẩm ({form.lines.length})
              </h3>
              {errors.lines && <p className="text-xs text-red-600">{errors.lines}</p>}
            </div>
            <LinesEditor
              lines={form.lines}
              onChange={lines => updateField('lines', lines)}
              products={products}
              showCost={showCost}
            />
          </div>

          {/* Auto-Calculated Summary — only tax_percent is editable */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase tracking-wide">💰 Tổng kết (Tự động tính)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  Tạm tính (Subtotal) = Σ(qty × price × (1 - CK%)):</span>
                <span className="font-semibold text-gray-900">{formatCurrency(form.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <TrendingDown size={13} className="text-gray-400" />
                  Thuế GTGT (% — chỉ nhập vào đây):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.tax_percent}
                    onChange={e => updateField('tax_percent', Number(e.target.value))}
                    className="w-20 rounded border border-blue-300 bg-white px-2 py-1 text-center text-sm font-semibold text-blue-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tiền thuế (Tax) = Subtotal × tax%:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(form.tax_amount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-300 pt-2">
                <span className="font-bold text-gray-900 text-base">Tổng cộng (Total) = Subtotal + Tax:</span>
                <span className="font-bold text-blue-700 text-lg">{formatCurrency(form.total_amount)}</span>
              </div>

              {showCost && (
                <>
                  <div className="flex items-center justify-between border-t border-gray-200 mt-2 pt-2">
                    <span className="text-gray-600">Giá vốn (Total Cost):</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(form.total_cost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      {form.estimated_profit >= 0
                        ? <TrendingUp size={13} className="text-green-500" />
                        : <TrendingDown size={13} className="text-red-500" />
                      }
                      Lợi nhuận ước tính = Total – Cost:
                    </span>
                    <span className={`font-bold ${form.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(form.estimated_profit)}
                      <span className="ml-1 text-xs font-normal">({form.profit_margin_percent.toFixed(1)}%)</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Ghi chú</label>
            <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ghi chú..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {record?.id ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== MAIN SALES MODULE ==========
const SalesModule: React.FC = () => {
  const showNotification = useUIStore(s => s.showNotification)
  const [activeTab, setActiveTab] = useState<'orders' | 'quotations'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<FormRecord | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadAll = () => {
    return Promise.all([
      erpApi.get<any[]>('/sales-orders?limit=100'),
      erpApi.get<any[]>('/sales-orders/quotations?limit=100'),
      erpApi.get<any[]>('/customers?limit=1000'),
      erpApi.get<any[]>('/crm/leads?limit=100'),
      erpApi.get<any[]>('/products?limit=1000'),
    ])
      .then(([orderData, quoteData, custData, leadData, prodData]) => {
        setLoadError(null)
        setOrders(orderData)
        setQuotations(quoteData)
        setCustomers(custData)
        setLeads(leadData)
        setProducts(prodData)
      })
      .catch(e => {
        setOrders([]); setQuotations([]); setCustomers([]); setLeads([]); setProducts([])
        setLoadError(e.message)
      })
  }

  useEffect(() => {
    loadAll()
  }, [])

  const activeRecords = activeTab === 'orders' ? orders : quotations
  const setActiveRecords = activeTab === 'orders' ? setOrders : setQuotations

  const filteredRecords = useMemo(() =>
    activeRecords.filter(r => {
      const haystack = `${r.quotation_number || r.sales_order_number || ''} ${r.customer_name || r.customer?.name || ''} ${r.status}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || r.status === status)
    }), [activeRecords, search, status])

  const openCreate = () => { setModalRecord(null); setModalError(null); setModalOpen(true) }

  const openEdit = (record: any) => {
    const lines: OrderLine[] = (record.lines || record.quotation_lines || record.sales_order_lines || []).map((l: any) => ({
      id: l.id || `line-${Date.now()}`,
      product_id: l.product_id || '',
      product_name: l.product_name || l.product?.name || '',
      product_sku: l.product?.sku || '',
      quantity: l.quantity || l.quantity_ordered || 1,
      unit_price: l.unit_price || 0,
      cost_price: l.cost_price || l.product?.cost_price || 0,
      discount_percent: l.discount_percent || 0,
      line_total: l.line_total || calcLineTotal(l.quantity || 1, l.unit_price || 0, l.discount_percent || 0),
    }))
    const subtotal = calcSubtotal(lines)
    const tax_percent = record.tax_percent || 10
    const tax_amount = calcTaxAmount(subtotal, tax_percent)
    const total_amount = calcTotal(subtotal, tax_amount)
    const total_cost = lines.reduce((s, l) => s + l.quantity * l.cost_price, 0)
    const estimated_profit = calcProfit(total_amount, total_cost)
    const profit_margin_percent = calcProfitMargin(total_amount, estimated_profit)
    const formData: FormRecord = {
      id: record.id,
      quotation_number: record.quotation_number,
      order_number: record.sales_order_number,
      quotation_id: record.quotation_id || '',
      customer_id: record.customer_id || record.customer?.id || '',
      customer_name: record.customer_name || record.customer?.name || '',
      lead_id: record.lead_id,
      issued_date: record.issued_date,
      order_date: record.order_date,
      valid_until_date: record.valid_until_date,
      required_delivery_date: record.required_delivery_date,
      lines,
      tax_percent,
      subtotal, tax_amount, total_amount, total_cost, estimated_profit, profit_margin_percent,
      status: record.status,
      notes: record.notes || '',
    }
    setModalRecord(formData)
    setModalError(null)
    setModalOpen(true)
  }

  // IMPORTANT: Only send editable fields. Financial totals are GENERATED ALWAYS AS in DB.
  const handleSave = async (formData: FormRecord) => {
    const isOrder = activeTab === 'orders'
    const path = isOrder ? '/sales-orders' : '/sales-orders/quotations'
    // Send ONLY what the user can edit + the line data
    const payload: any = {
      customer_id: isOrder ? formData.customer_id : null,
      lead_id: formData.lead_id || null,
      quotation_id: isOrder ? (formData.quotation_id || null) : null,
      issued_date: formData.issued_date,
      order_date: formData.order_date,
      valid_until_date: formData.valid_until_date,
      required_delivery_date: formData.required_delivery_date,
      // Only editable financial field
      tax_percent: formData.tax_percent,
      status: formData.status,
      notes: formData.notes,
      lines: formData.lines.map(l => ({
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        cost_price: l.cost_price,
        discount_percent: l.discount_percent,
      })),
    }
    // Include order numbers for new records
    if (!isOrder) payload.quotation_number = formData.quotation_number || `QT-${Date.now().toString().slice(-6)}`
    if (isOrder) payload.sales_order_number = formData.order_number || `SO-${Date.now().toString().slice(-6)}`

    try {
      if (modalRecord?.id && !modalRecord.id.startsWith('order') && !modalRecord.id.startsWith('quote')) {
        await erpApi.put(`${path}/${modalRecord.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        formData.id = created.id
      }
    } catch (e: any) {
      setModalError(e.message)
      return
    }
    setActiveRecords(current => {
      const exists = current.some(r => r.id === formData.id)
      if (exists) return current.map(r => r.id === formData.id ? { ...r, ...formData } : r)
      return [{ id: formData.id, ...formData }, ...current]
    })
    setModalOpen(false)
    setModalRecord(null)
    showNotification('success', `${isOrder ? 'Sales Order' : 'Quotation'} đã được lưu.`)
  }

  const deleteRecord = async (record: any) => {
    const path = activeTab === 'orders' ? '/sales-orders' : '/sales-orders/quotations'
    if (!window.confirm(`Xóa ${record.quotation_number || record.sales_order_number}?`)) return
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (e: any) {
      showNotification('error', `Xóa thất bại: ${e.message}`)
      return
    }
    setActiveRecords(current => current.filter(r => r.id !== record.id))
    showNotification('success', 'Đã xóa thành công.')
  }

  const advanceRecord = async (record: any) => {
    const path = activeTab === 'orders' ? '/sales-orders' : '/sales-orders/quotations'
    const nextStatus = activeTab === 'quotations'
      ? (record.status === 'draft' ? 'sent' : record.status === 'sent' ? 'accepted' : null)
      : (record.status === 'draft' ? 'confirmed' : null)
    if (!nextStatus) return
    try {
      await erpApi.put(`${path}/${record.id}`, { status: nextStatus })
      await loadAll()
      showNotification('success', `${activeTab === 'orders' ? 'Sales Order' : 'Quotation'} moved to ${nextStatus}.`)
    } catch (e: any) {
      showNotification('error', `Status update failed: ${e.message}`)
    }
  }

  const rejectQuotation = async (record: any) => {
    try {
      await erpApi.put(`/sales-orders/quotations/${record.id}`, { status: 'lost' })
      await loadAll()
      showNotification('success', 'Quotation rejected and lead moved to lost.')
    } catch (e: any) {
      showNotification('error', `Reject failed: ${e.message}`)
    }
  }

  const renderActions = (record: any) => (
    <div className="flex items-center gap-1">
      <RecordActions
        onEdit={() => openEdit(record)}
        onDelete={() => deleteRecord(record)}
        onAdvance={
          (activeTab === 'quotations' && ['draft', 'sent'].includes(record.status)) ||
          (activeTab === 'orders' && record.status === 'draft')
            ? () => advanceRecord(record)
            : undefined
        }
        advanceLabel={activeTab === 'quotations' && record.status === 'sent' ? 'Accept' : 'Advance'}
      />
      {activeTab === 'quotations' && ['draft', 'sent'].includes(record.status) && (
        <button
          onClick={() => rejectQuotation(record)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          title="Reject quotation"
        >
          <X size={14} />
          Reject
        </button>
      )}
    </div>
  )

  const title = activeTab === 'orders' ? 'Sales Order' : 'Quotation'
  const statuses = useMemo(() => Array.from(new Set(activeRecords.map(r => r.status))), [activeRecords])

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Sales"
        subtitle="Quản lý Quotations và Sales Orders. Chỉ cần nhập tax%, hệ thống tự động tính Subtotal, Tax Amount, Total và Estimated Profit."
        primaryLabel={`Tạo ${title} mới`}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không thể tải dữ liệu: {loadError}
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={tab => { setActiveTab(tab as 'orders' | 'quotations'); setSearch(''); setStatus('all') }}
        tabs={[
          { id: 'orders', label: 'Sales Orders', count: orders.length },
          { id: 'quotations', label: 'Quotations', count: quotations.length },
        ]}
      />

      <ActionToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statuses={statuses}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Mã</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Khách hàng</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ngày</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Trạng thái</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Tổng cộng</th>
                {activeTab === 'orders' && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Lợi nhuận</th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                    {record.quotation_number || record.sales_order_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.customer_name || record.customer?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.issued_date || record.order_date}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(record.total_amount || record.subtotal || 0)}
                  </td>
                  {activeTab === 'orders' && (
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${
                      (record.estimated_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(record.estimated_profit || 0)}
                    </td>
                  )}
                  <td className="px-4 py-3">{renderActions(record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              Chưa có bản ghi nào
            </div>
          )}
        </div>
      ) : (
        <KanbanBoard
          records={filteredRecords}
          groupBy={r => r.status}
          renderCard={record => (
            <div key={record.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-blue-700">{record.quotation_number || record.sales_order_number}</p>
                  <p className="text-sm text-gray-600">{record.customer_name || record.customer?.name}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(record.total_amount || record.subtotal || 0)}</p>
              {activeTab === 'orders' && (
                <p className={`text-sm font-semibold ${(record.estimated_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Lợi nhuận: {formatCurrency(record.estimated_profit || 0)}
                </p>
              )}
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      <SalesModal
        isOpen={modalOpen}
        activeTab={activeTab}
        record={modalRecord}
        customers={customers}
        leads={leads}
        products={products}
        quotations={quotations}
        onClose={() => { setModalOpen(false); setModalRecord(null) }}
        onSave={handleSave}
        errorMessage={modalError}
      />
    </div>
  )
}

export default SalesModule

