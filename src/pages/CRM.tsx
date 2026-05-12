import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Calendar,
  ChevronRight,
  FileText,
  Plus,
  PhoneCall,
  PlusCircle,
  Search,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react'
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

// ========== CONSTANTS ==========
const leadStages = [
  { value: 'new', label: 'Mới tiếp nhận', color: 'yellow' },
  { value: 'site_survey', label: 'Khảo sát', color: 'blue' },
  { value: 'proposition', label: 'Báo giá', color: 'purple' },
  { value: 'won', label: 'Đã ký', color: 'green' },
  { value: 'lost', label: 'Mất khách', color: 'red' },
]
const nextLeadStage: Record<string, string> = {
  new: 'site_survey',
  site_survey: 'proposition',
  proposition: 'won',
}
const leadSources = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'showroom', label: 'Showroom' },
  { value: 'architect', label: 'Kiến trúc sư' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'social_media', label: 'Mạng xã hội' },
  { value: 'auto_request', label: 'Yêu cầu tự động' },
]
const leadRatings = [
  { value: 'hot', label: 'Hot', color: 'text-red-500' },
  { value: 'warm', label: 'Warm', color: 'text-orange-500' },
  { value: 'cold', label: 'Cold', color: 'text-blue-500' },
]
const activityIcons: Record<string, React.ReactNode> = {
  Call: <PhoneCall size={14} className="text-blue-500" />,
  Email: <span className="text-green-500 text-xs">@</span>,
  Meeting: <User size={14} className="text-purple-500" />,
  'Site Visit': <Activity size={14} className="text-orange-500" />,
  'Quote Sent': <FileText size={14} className="text-teal-500" />,
}

// ========== CALCULATION HELPERS ==========
const calcLineTotal = (q: number, p: number, d: number) => q * p * (1 - d / 100)
const calcSubtotal = (lines: any[]) =>
  lines.reduce((sum, l) => sum + (l.line_total || 0), 0)
const calcTaxAmount = (subtotal: number, taxPct: number) =>
  subtotal * taxPct / 100
const calcTotal = (subtotal: number, taxAmt: number) => subtotal + taxAmt

// ========== TYPES ==========
interface QuotationFormData {
  id?: string
  quotation_number?: string
  lead_id: string
  customer_id?: string
  issued_date: string
  valid_until_date: string
  status: string
  tax_percent: number
  notes?: string
  products: {
    id?: string
    product_id: string
    product_name: string
    product_sku: string
    quantity: number
    unit_price: number
    discount_percent: number
    line_total: number
  }[]
}

interface LeadFormData {
  id?: string
  lead_number?: string
  company_name: string
  contact_person_name: string
  contact_person_phone: string
  contact_person_email: string
  company_address: string
  company_tax_id: string
  owner_id: string
  owner_name: string
  stage: string
  source: string
  lead_rating: string
  estimated_value: number
  probability_percent: number
  expected_close_date: string
  notes: string
  customer_type: string
  // Bỏ phần sản phẩm và thông tin tài chính khỏi Lead
  // products: LeadProductLine[]
  // tax_percent: number
}

// ========== LEAD FORM MODAL ==========
const LeadModal: React.FC<{
  isOpen: boolean
  record: LeadFormData | null
  users: any[]
  existingCustomer: any | null
  onClose: () => void
  onSave: (data: LeadFormData, autoDetectedCustomer: any | null) => void
  errorMessage?: string | null
}> = ({ isOpen, record, users, existingCustomer, onClose, onSave, errorMessage }) => {
  const [form, setForm] = useState<LeadFormData>({
    company_name: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_email: '',
    company_address: '',
    company_tax_id: '',
    owner_id: '',
    owner_name: '',
    stage: 'new',
    source: 'website',
    lead_rating: 'warm',
    estimated_value: 0,
    probability_percent: 10,
    expected_close_date: '',
    notes: '',
    customer_type: 'B2C',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C')
  const [autoDetected, setAutoDetected] = useState<any | null>(null)

  useEffect(() => {
    if (record) {
      setForm({ ...record })
      setCustomerType((record.customer_type as 'B2C' | 'B2B') || 'B2C')
    } else {
      setForm({
        company_name: '',
        contact_person_name: '',
        contact_person_phone: '',
        contact_person_email: '',
        company_address: '',
        company_tax_id: '',
        owner_id: '',
        owner_name: '',
        stage: 'new',
        source: 'website',
        lead_rating: 'warm',
        estimated_value: 0,
        probability_percent: 10,
        expected_close_date: '',
        notes: '',
        customer_type: 'B2C',
      })
      setCustomerType('B2C')
    }
    setErrors({})
    setAutoDetected(null)
  }, [record, isOpen])

  // Auto-fill when existingCustomer prop arrives from parent
  useEffect(() => {
    if (existingCustomer && form.company_name) {
      setAutoDetected(existingCustomer)
    }
  }, [existingCustomer, form.company_name])

  const updateField = (key: keyof LeadFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!form.company_name.trim()) errs.company_name = 'Tên khách hàng là bắt buộc'
    if (!form.contact_person_email.trim()) errs.contact_person_email = 'Email là bắt buộc'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(form, autoDetected)
  }

  const isAutoRequest = form.owner_id === 'auto_request'

  const salesPersonOptions = [
    ...users.map(u => ({ value: u.id, label: `${u.full_name} (${u.role})` })),
    { value: 'auto_request', label: '📋 Yêu cầu tự động (tạo báo giá mẫu)' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {record?.id ? 'Sửa Lead' : 'Tạo Lead mới'}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">Lỗi: {errorMessage}</p>
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Lead Number + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Mã Lead</label>
              <input
                type="text"
                value={form.lead_number || '(sẽ tạo tự động)'}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nguồn Lead</label>
              <select
                value={form.source}
                onChange={e => updateField('source', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {leadSources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Customer Auto-Detection */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <User size={16} />
              Thông tin Khách hàng Tiềm năng
              {autoDetected && (
                <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ Đã tìm thấy khách hàng — sẽ liên kết khi thắng
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Tên Công ty / Khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => { updateField('company_name', e.target.value); setAutoDetected(null) }}
                  placeholder="Nhập tên công ty hoặc khách hàng"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.company_name ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.company_name && <p className="mt-1 text-xs text-red-600">{errors.company_name}</p>}
                {autoDetected && (
                  <p className="mt-1 text-xs text-green-600">
                    Phát hiện: {autoDetected.name} ({autoDetected.customer_type}) — sẽ cập nhật khi lead thắng.
                  </p>
                )}
                {!autoDetected && form.company_name && (
                  <p className="mt-1 text-xs text-blue-600">Khách hàng mới — sẽ được tạo khi lead thắng.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Người liên hệ</label>
                <input type="text" value={form.contact_person_name}
                  onChange={e => updateField('contact_person_name', e.target.value)}
                  placeholder="Tên người liên hệ"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.contact_person_email}
                  onChange={e => { updateField('contact_person_email', e.target.value); setAutoDetected(null) }}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.contact_person_email ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="email@example.com"
                />
                {errors.contact_person_email && <p className="mt-1 text-xs text-red-600">{errors.contact_person_email}</p>}
                {autoDetected && (
                  <p className="mt-1 text-xs text-green-600">Liên kết với: {autoDetected.name}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Số điện thoại</label>
                <input type="text" value={form.contact_person_phone}
                  onChange={e => updateField('contact_person_phone', e.target.value)}
                  placeholder="+84..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Loại khách hàng</p>
                <div className="flex gap-3 mt-1">
                  {(['B2C', 'B2B'] as const).map(t => (
                    <label key={t} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${customerType === t ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                      <input type="radio" name="ct" value={t} checked={customerType === t}
                        onChange={() => { setCustomerType(t); updateField('customer_type', t) }}
                        className="accent-blue-600" />
                      {t === 'B2C' ? 'Cá nhân' : 'Doanh nghiệp'}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Địa chỉ</label>
                <input type="text" value={form.company_address}
                  onChange={e => updateField('company_address', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Mã số thuế</label>
                <input type="text" value={form.company_tax_id}
                  onChange={e => updateField('company_tax_id', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Giá trị Dự kiến (VNĐ)</label>
              <input type="number" min={0} value={form.estimated_value}
                onChange={e => updateField('estimated_value', Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Xác suất Thắng (%)</label>
              <input type="number" min={0} max={100} value={form.probability_percent}
                onChange={e => updateField('probability_percent', Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Đánh giá Lead</label>
              <select value={form.lead_rating}
                onChange={e => updateField('lead_rating', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                {leadRatings.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ngày dự kiến chốt</label>
              <input type="date" value={form.expected_close_date}
                onChange={e => updateField('expected_close_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nhân viên Kinh doanh</label>
              <select
                value={form.owner_id}
                onChange={e => updateField('owner_id', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${isAutoRequest ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}
              >
                <option value="">-- Chọn nhân viên --</option>
                {salesPersonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {isAutoRequest && (
                <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  Lead này sẽ <strong>tự động tạo báo giá mẫu</strong> khi chuyển sang giai đoạn "Báo giá".
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ghi chú</label>
              <textarea value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={3}
                placeholder="Ghi chú về nhu cầu, thông tin thêm..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {record?.id ? 'Cập nhật Lead' : 'Tạo Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== QUOTATION MODAL ==========
const QuotationModal: React.FC<{
  isOpen: boolean
  lead: any | null
  products: any[]
  onClose: () => void
  onSave: (data: QuotationFormData) => void
}> = ({ isOpen, lead, products, onClose, onSave }) => {
  const [form, setForm] = useState<QuotationFormData>({
    lead_id: '',
    issued_date: new Date().toISOString().slice(0, 10),
    valid_until_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'draft',
    tax_percent: 10,
    products: [],
  })
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  useEffect(() => {
    if (lead) {
      setForm(f => ({
        ...f,
        lead_id: lead.id,
        customer_id: lead.customer_id, // if lead is already linked to a customer
      }))
    }
  }, [lead, isOpen])

  const updateField = (key: keyof QuotationFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  const addProduct = (product: any) => {
    if (form.products.some(p => p.product_id === product.id)) return
    const line = {
      id: `qp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: 1,
      unit_price: Number(product.list_price || 0),
      discount_percent: 0,
      line_total: calcLineTotal(1, Number(product.list_price || 0), 0),
    }
    updateField('products', [...form.products, line])
    setShowProductDropdown(false)
    setProductSearch('')
  }

  const updateProductLine = (id: string, key: keyof QuotationFormData['products'][0], value: number) => {
    updateField('products', form.products.map(p => {
      if (p.id !== id) return p
      const next = { ...p, [key]: value }
      next.line_total = calcLineTotal(next.quantity, next.unit_price, next.discount_percent)
      return next
    }))
  }

  const removeProduct = (id: string) =>
    updateField('products', form.products.filter(p => p.id !== id))

  const handleSave = () => {
    if (form.products.length === 0) {
      alert('Báo giá phải có ít nhất một sản phẩm.')
      return
    }
    onSave(form)
  }

  const filteredProducts = products.filter(p =>
    !form.products.some(lp => lp.product_id === p.id) &&
    ((p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
     (p.sku || '').toLowerCase().includes(productSearch.toLowerCase()))
  )

  const subtotal = calcSubtotal(form.products)
  const tax_amount = calcTaxAmount(subtotal, form.tax_percent)
  const total_amount = calcTotal(subtotal, tax_amount)

  if (!isOpen || !lead) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            Tạo Báo giá cho Lead: {lead.company_name}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Products Section */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Sản phẩm Báo giá ({form.products.length})
              </h3>
              <p className="text-sm font-semibold text-blue-700">
                Tổng phụ: {formatCurrency(subtotal)}
              </p>
            </div>

            {/* Product Search */}
            <div className="relative mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Tìm sản phẩm để thêm vào báo giá..."
                  className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                  {filteredProducts.slice(0, 12).map(p => (
                    <button key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{formatCurrency(p.list_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Lines Table */}
            {form.products.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Sản phẩm</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">SL</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Đơn giá</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">CK %</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Thành tiền</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.products.map(line => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{line.product_name}</p>
                          <p className="text-xs text-gray-400">{line.product_sku}</p>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min={1}
                            value={line.quantity}
                            onChange={e => updateProductLine(line.id!, 'quantity', Number(e.target.value))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min={0}
                            value={line.unit_price}
                            onChange={e => updateProductLine(line.id!, 'unit_price', Number(e.target.value))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min={0} max={100}
                            value={line.discount_percent}
                            onChange={e => updateProductLine(line.id!, 'discount_percent', Number(e.target.value))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-blue-700">
                          {formatCurrency(line.line_total)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeProduct(line.id!)} className="rounded p-1 text-red-500 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">Tổng phụ:</td>
                      <td className="px-2 py-2 text-right font-bold text-blue-700">{formatCurrency(subtotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-1 text-right font-semibold text-gray-700">Thuế ({form.tax_percent}%):</td>
                      <td className="px-2 py-1 text-right text-sm text-gray-700">{formatCurrency(tax_amount)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-900">Tổng cộng:</td>
                      <td className="px-2 py-2 text-right font-bold text-blue-800">{formatCurrency(total_amount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Chưa có sản phẩm. Tìm và thêm sản phẩm ở trên.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
            Tạo Báo giá
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== ACTIVITY MODAL ==========
const ActivityModal: React.FC<{
  isOpen: boolean
  leadId: string
  users: any[]
  onClose: () => void
  onSaved: () => void
}> = ({ isOpen, leadId, users, onClose, onSaved }) => {
  const [activityType, setActivityType] = useState('')
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [performer, setPerformer] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!activityType || !description) return
    setSaving(true)
    try {
      await erpApi.post('/crm/activities', {
        lead_id: leadId,
        activity_type: activityType,
        description,
        outcome,
        activity_date: date,
        performed_by_id: performer || null,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      alert('Lỗi: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Ghi nhận Hoạt động</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Loại hoạt động</label>
            <select value={activityType} onChange={e => setActivityType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">-- Chọn --</option>
              <option>Call</option><option>Email</option><option>Meeting</option><option>Site Visit</option><option>Quote Sent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Mô tả</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Mô tả hoạt động..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Kết quả</label>
            <input type="text" value={outcome} onChange={e => setOutcome(e.target.value)}
              placeholder="Kết quả..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ngày/Giờ</label>
              <input type="datetime-local" value={date.slice(0, 16)} onChange={e => setDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Người thực hiện</label>
              <select value={performer} onChange={e => setPerformer(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">-- Tự động --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Hủy</button>
          <button onClick={handleSave} disabled={saving || !activityType || !description}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu Hoạt động'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== MAIN CRM MODULE ==========
const CRMModule: React.FC = () => {
  const showNotification = useUIStore(s => s.showNotification)
  const [activeTab, setActiveTab] = useState('leads')
  const [leads, setLeads] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [leadStagesData, setLeadStagesData] = useState<any[]>([])
  const [activityTypes, setActivityTypes] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [leadModalRecord, setLeadModalRecord] = useState<LeadFormData | null>(null)
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [quotationModalOpen, setQuotationModalOpen] = useState(false)
  const [quotationLead, setQuotationLead] = useState<any | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [activityLeadId, setActivityLeadId] = useState('')
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const loadAll = async () => {
    try {
      const [leadData, userData, productData, stageData, actTypeData, actData] = await Promise.all([
        erpApi.get<any[]>('/crm/leads?limit=100'),
        erpApi.get<any[]>('/users?limit=100'),
        erpApi.get<any[]>('/products?limit=1000'),
        erpApi.get<any[]>('/lead-stages'),
        erpApi.get<any[]>('/activity-types'),
        erpApi.get<any[]>('/crm/activities?limit=100'),
      ])
      setLeads(leadData)
      setUsers(userData)
      setProducts(productData)
      setLeadStagesData(stageData)
      setActivityTypes(actTypeData)
      setActivities(actData)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e.message)
    }
  }

  useEffect(() => { loadAll() }, [])

  const stageLabel = (stage: any) => {
    if (!stage) return 'Mới'
    return stage.display_name || stage.name || stage
  }

  const stageName = (stage: any) => stage?.name || stage

  const filteredLeads = useMemo(() =>
    leads.filter(l => {
      const hay = `${l.company_name || ''} ${l.contact_person_name || ''} ${l.contact_person_email || ''} ${l.lead_number || ''}`.toLowerCase()
      const matchSearch = hay.includes(search.toLowerCase())
      const matchStage = stageFilter === 'all' || (stageName(l.stage_id || l.stage) || 'new') === stageFilter
      return matchSearch && matchStage
    }), [leads, search, stageFilter])

  const openCreateLead = () => { setLeadModalRecord(null); setModalError(null); setExistingCustomer(null); setLeadModalOpen(true) }

  const openEditLead = (lead: any) => {
    setLeadModalRecord({
      id: lead.id,
      lead_number: lead.lead_number,
      company_name: lead.company_name || '',
      contact_person_name: lead.contact_person_name || '',
      contact_person_phone: lead.contact_person_phone || '',
      contact_person_email: lead.contact_person_email || '',
      company_address: lead.company_address || '',
      company_tax_id: lead.company_tax_id || '',
      owner_id: lead.owner_id || '',
      owner_name: lead.owner?.full_name || '',
      stage: stageName(lead.stage_id || lead.stage) || 'new',
      source: lead.source || 'website',
      lead_rating: lead.lead_rating || 'warm',
      estimated_value: lead.estimated_value || 0,
      probability_percent: lead.probability_percent || 10,
      expected_close_date: lead.expected_close_date || '',
      notes: lead.notes || '',
      customer_type: lead.customer_type || 'B2C',
    })
    setModalError(null)
    setExistingCustomer(lead.customer || null)
    setLeadModalOpen(true)
  }

  const handleSaveLead = async (formData: LeadFormData, autoDetectedCustomer: any | null) => {
    setSaving(true)
    try {
      // Auto-detect customer by email before saving
      let detectedCustomer = autoDetectedCustomer
      if (!detectedCustomer && formData.contact_person_email) {
        try {
          const allCustomers = await erpApi.get<any[]>('/customers?limit=1000')
          detectedCustomer = allCustomers.find((c: any) =>
            c.contact_person_email === formData.contact_person_email
          ) || null
          if (detectedCustomer) setExistingCustomer(detectedCustomer)
        } catch {}
      }

      const payload = {
        ...formData,
        owner_id: formData.owner_id === 'auto_request' ? null : (formData.owner_id || null),
        expected_close_date: formData.expected_close_date || null,
      }

      if (leadModalRecord?.id) {
        await erpApi.put(`/crm/leads/${leadModalRecord.id}`, payload)
      } else {
        await erpApi.post('/crm/leads', payload)
      }
      await loadAll()
      setLeadModalOpen(false)
      setLeadModalRecord(null)
      setModalError(null)
      showNotification('success', 'Lead đã được lưu thành công.')
    } catch (e: any) {
      setModalError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuotation = async (formData: QuotationFormData) => {
    setSaving(true)
    try {
      await erpApi.post('/sales/quotations', formData)
      await loadAll()
      setQuotationModalOpen(false)
      setQuotationLead(null)
      showNotification('success', 'Báo giá đã được tạo thành công.')
    } catch (e: any) {
      showNotification('error', `Tạo báo giá thất bại: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const advanceLead = async (lead: any) => {
    const currentStage = stageName(lead.stage_id || lead.stage)
    const next = nextLeadStage[currentStage]
    if (!next) return

    // Nếu là "Yêu cầu tự động" và chuyển sang "Báo giá", tự động tạo báo giá mẫu
    if (lead.source === 'auto_request' && next === 'proposition') {
        // Logic để tạo báo giá mẫu ở đây
        // Ví dụ: lấy 3 sản phẩm đầu tiên trong danh sách
        const sampleProducts = products.slice(0, 3).map(p => ({
            product_id: p.id,
            product_name: p.name,
            product_sku: p.sku,
            quantity: 1,
            unit_price: p.list_price,
            discount_percent: 0,
            line_total: p.list_price,
        }));

        const quotationPayload: QuotationFormData = {
            lead_id: lead.id,
            status: 'draft',
            issued_date: new Date().toISOString().slice(0, 10),
            valid_until_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
            tax_percent: 10,
            notes: 'Báo giá tự động từ hệ thống.',
            products: sampleProducts,
        };
        await handleSaveQuotation(quotationPayload);
    }

    // Khi lead thắng, tự động tạo khách hàng
    if (next === 'won') {
      try {
        const payload = {
          name: lead.company_name,
          customer_type: lead.customer_type || 'B2C',
          contact_person_name: lead.contact_person_name,
          contact_person_email: lead.contact_person_email,
          contact_person_phone: lead.contact_person_phone,
          billing_address: lead.company_address || '',
          shipping_address: lead.company_address || '',
          company_tax_id: lead.company_tax_id || null,
          lead_id: lead.id,
          status: 'active',
        }
        await erpApi.post('/customers', payload)
        showNotification('success', `Khách hàng "${lead.company_name}" đã được tạo tự động!`)
      } catch (e: any) {
        console.warn('Tự động tạo khách hàng thất bại:', e.message)
      }
    }

    try {
      await erpApi.put(`/crm/leads/${lead.id}`, { stage: next })
      await loadAll()
      showNotification('success', `Lead chuyển sang: ${stageLabel(leadStages.find(s => s.value === next))}`)
    } catch (e: any) {
      showNotification('error', `Cập nhật trạng thái thất bại: ${e.message}`)
    }
  }

  const deleteLead = async (lead: any) => {
    if (!window.confirm(`Xóa lead "${lead.company_name}"?`)) return
    try {
      await erpApi.delete(`/crm/leads/${lead.id}`)
      await loadAll()
      showNotification('success', 'Lead đã được xóa.')
    } catch (e: any) {
      showNotification('error', `Xóa thất bại: ${e.message}`)
    }
  }

  const openQuotationModal = (lead: any) => {
    setQuotationLead(lead)
    setQuotationModalOpen(true)
  }

  const renderLeadActions = (lead: any) => (
    <div className="flex items-center gap-1">
      <button onClick={() => { setActivityLeadId(lead.id); setActivityModalOpen(true) }}
        className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Ghi nhận Activity">
        <PlusCircle size={14} />
      </button>
      {stageName(lead.stage_id || lead.stage) !== 'won' && stageName(lead.stage_id || lead.stage) !== 'lost' && (
        <button onClick={() => openQuotationModal(lead)}
          className="rounded p-1.5 text-purple-600 hover:bg-purple-50" title="Tạo Báo giá">
          <FileText size={14} />
        </button>
      )}
      <RecordActions
        onEdit={() => openEditLead(lead)}
        onDelete={() => deleteLead(lead)}
        onAdvance={nextLeadStage[stageName(lead.stage_id || lead.stage)] ? () => advanceLead(lead) : undefined}
        advanceLabel="Chuyển tiếp"
      />
    </div>
  )

  const ratingColor = (r: string) => {
    if (r === 'hot') return 'text-red-500'
    if (r === 'warm') return 'text-orange-500'
    return 'text-blue-400'
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="CRM"
        subtitle="Quản lý Lead: Tiếp cận → Khảo sát → Báo giá → Chốt đơn"
        primaryLabel="Tạo Lead mới"
        onCreate={openCreateLead}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không thể tải dữ liệu CRM: {loadError}
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'leads', label: 'Cơ hội', count: leads.length },
          { id: 'activities', label: 'Hoạt động', count: activities.length },
        ]}
      />

      {activeTab === 'leads' && (
        <>
          <ActionToolbar
            search={search}
            onSearchChange={setSearch}
            status={stageFilter}
            onStatusChange={setStageFilter}
            statuses={leadStages.map(s => s.value)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {viewMode === 'list' ? (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Mã Lead</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Liên hệ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Giá trị</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Xác suất</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <p className="font-semibold text-blue-700">{lead.lead_number}</p>
                        <p className="text-xs text-gray-400">{lead.owner?.full_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-semibold text-gray-900">{lead.company_name}</p>
                        <p className={`text-xs font-semibold ${ratingColor(lead.lead_rating)}`}>
                          {lead.lead_rating === 'hot' ? '🔥' : lead.lead_rating === 'warm' ? '☀️' : '❄️'} {lead.lead_rating}
                          {lead.is_auto_request && <span className="ml-1 text-yellow-600">📋</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <p>{lead.contact_person_name}</p>
                        <p className="text-xs text-gray-400">{lead.contact_person_email}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(lead.estimated_value || 0)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {lead.probability_percent || 10}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={stageName(lead.stage_id || lead.stage)} />
                      </td>
                      <td className="px-4 py-3">{renderLeadActions(lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  Chưa có lead nào phù hợp
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard
              records={filteredLeads}
              groupBy={l => stageName(l.stage_id || l.stage) || 'new'}
              renderCard={lead => (
                <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{lead.company_name}</p>
                      <p className="text-xs text-gray-400">{lead.lead_number}</p>
                    </div>
                    <StatusBadge status={stageName(lead.stage_id || lead.stage)} />
                  </div>
                  <p className="text-sm text-gray-600">{lead.contact_person_name} • {lead.contact_person_email}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-blue-700">{formatCurrency(lead.estimated_value || 0)}</p>
                    <span className={`text-xs font-semibold ${ratingColor(lead.lead_rating)}`}>{lead.probability_percent || 10}%</span>
                  </div>
                  {lead.is_auto_request && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                      📋 Yêu cầu báo giá
                    </span>
                  )}
                  <div className="mt-3">{renderLeadActions(lead)}</div>
                </div>
              )}
            />
          )}
        </>
      )}

      {activeTab === 'activities' && (
        <div>
          {activities.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-white p-12 text-center">
              <Activity size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">Chưa có activity nào. Click "Ghi nhận Activity" trên một lead để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className="flex items-start gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                    {activityIcons[act.activity_type] || <Activity size={14} className="text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{act.activity_type || 'Activity'}</span>
                      <span className="text-xs text-gray-400">{act.performed_by?.full_name || '—'}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{act.description}</p>
                    {act.outcome && <p className="text-xs text-green-600 mt-0.5">→ {act.outcome}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {act.activity_date ? new Date(act.activity_date).toLocaleString('vi-VN') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <LeadModal
        isOpen={modalOpen}
        record={modalRecord}
        users={users}
        products={products}
        existingCustomer={existingCustomer}
        onClose={() => { setModalOpen(false); setModalRecord(null); setExistingCustomer(null) }}
        onSave={handleSave}
        errorMessage={modalError}
      />

      <ActivityModal
        isOpen={activityModalOpen}
        leadId={activityLeadId}
        users={users}
        onClose={() => { setActivityModalOpen(false); setActivityLeadId('') }}
        onSaved={loadAll}
      />
    </div>
  )
}

export default CRMModule
