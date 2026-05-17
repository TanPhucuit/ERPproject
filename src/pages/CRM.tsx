import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  FileText,
  PhoneCall,
  PlusCircle,
  Search,
  Trash2,
  User,
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
  { value: 'new', label: 'New', color: 'yellow' },
  { value: 'won', label: 'Won', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' },
]
const leadSources = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' },
  { value: 'auto_request', label: 'Auto Request' },
  { value: 'other', label: 'Other' },
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
  source: string
  probability_percent: number
  notes: string
  customer_type: string
  // Product and financial details are kept out of Lead records.
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
  const blankLead: LeadFormData = {
    company_name: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_email: '',
    company_address: '',
    company_tax_id: '',
    owner_id: '',
    owner_name: '',
    source: 'website',
    probability_percent: 10,
    notes: '',
    customer_type: 'B2C',
  }
  const [form, setForm] = useState<LeadFormData>(blankLead)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoDetected, setAutoDetected] = useState<any | null>(null)

  useEffect(() => {
    setForm(record ? { ...blankLead, ...record } : blankLead)
    setErrors({})
    setAutoDetected(null)
  }, [record, isOpen])

  useEffect(() => {
    if (existingCustomer && form.company_name) setAutoDetected(existingCustomer)
  }, [existingCustomer, form.company_name])

  const updateField = (key: keyof LeadFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!form.company_name.trim()) errs.company_name = 'Customer or company name is required'
    if (!form.contact_person_email.trim()) errs.contact_person_email = 'Email is required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(form, autoDetected)
  }

  const isAutoRequest = form.source === 'auto_request'
  const salesPersonOptions = users.map(u => ({ value: u.id, label: `${u.full_name || u.fullName} (${u.role})` }))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{record?.id ? 'Edit Lead' : 'Create Lead'}</h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">Error: {errorMessage}</p>
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Lead #</label>
              <input type="text" value={form.lead_number || '(auto)'} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Source</label>
              <select value={form.source} onChange={e => updateField('source', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                {leadSources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {isAutoRequest && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Auto request leads create a sent sample quotation after save.
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">Lead Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Customer / Company Name *</label>
                <input type="text" value={form.company_name} onChange={e => updateField('company_name', e.target.value)} className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.company_name ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.company_name && <p className="mt-1 text-xs text-red-600">{errors.company_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Contact Name</label>
                <input type="text" value={form.contact_person_name} onChange={e => updateField('contact_person_name', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Email *</label>
                <input type="email" value={form.contact_person_email} onChange={e => updateField('contact_person_email', e.target.value)} className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.contact_person_email ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.contact_person_email && <p className="mt-1 text-xs text-red-600">{errors.contact_person_email}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Phone</label>
                <input type="text" value={form.contact_person_phone} onChange={e => updateField('contact_person_phone', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Tax ID</label>
                <input type="text" value={form.company_tax_id} onChange={e => updateField('company_tax_id', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Address</label>
                <input type="text" value={form.company_address} onChange={e => updateField('company_address', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Probability (%)</label>
              <input type="number" min={0} max={100} value={form.probability_percent} onChange={e => updateField('probability_percent', Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Sales Owner</label>
              <select value={form.owner_id} onChange={e => updateField('owner_id', e.target.value)} disabled={isAutoRequest} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50">
                <option value="">-- Select salesperson --</option>
                {salesPersonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{record?.id ? 'Update Lead' : 'Create Lead'}</button>
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
    status: 'sent',
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
      alert('Quotation must have at least one product.')
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
            Create Quotation for Lead: {lead.company_name}
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
                Quotation Products ({form.products.length})
              </h3>
              <p className="text-sm font-semibold text-blue-700">
                Subtotal: {formatCurrency(subtotal)}
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
                  placeholder="Search products to add to the quotation..."
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
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">SL</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Unit Price</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">CK %</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Line Total</th>
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
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">Subtotal:</td>
                      <td className="px-2 py-2 text-right font-bold text-blue-700">{formatCurrency(subtotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-1 text-right font-semibold text-gray-700">Tax ({form.tax_percent}%):</td>
                      <td className="px-2 py-1 text-right text-sm text-gray-700">{formatCurrency(tax_amount)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-900">Total:</td>
                      <td className="px-2 py-2 text-right font-bold text-blue-800">{formatCurrency(total_amount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No products yet. Search and add products above.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
            Create Quotation
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
        activity_date: date,
        performed_by_id: performer || null,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Record Activity</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Activity Type</label>
            <select value={activityType} onChange={e => setActivityType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select...</option>
              <option>Call</option><option>Email</option><option>Meeting</option><option>Site Visit</option><option>Quote Sent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Activity description..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Date/Time</label>
              <input type="datetime-local" value={date.slice(0, 16)} onChange={e => setDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Performed By</label>
              <select value={performer} onChange={e => setPerformer(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">Automatic</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
          <button onClick={handleSave} disabled={saving || !activityType || !description}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Activity'}
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
  const [quotations, setQuotations] = useState<any[]>([])
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
      const [leadData, userData, productData, quoteData, _stageData, _actTypeData, actData] = await Promise.all([
        erpApi.get<any[]>('/crm/leads?limit=100'),
        erpApi.get<any[]>('/users?limit=100'),
        erpApi.get<any[]>('/products?limit=1000'),
        erpApi.get<any[]>('/sales-orders/quotations?limit=500'),
        erpApi.get<any[]>('/lead-stages'),
        erpApi.get<any[]>('/activity-types'),
        erpApi.get<any[]>('/crm/activities?limit=100'),
      ])
      setLeads(leadData)
      setUsers(userData)
      setProducts(productData)
      setQuotations(quoteData)
      setActivities(actData)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e.message)
    }
  }

  useEffect(() => { loadAll() }, [])

  const stageName = (leadOrStage: any) => {
    if (!leadOrStage) return 'new'
    if (typeof leadOrStage === 'object') {
      return leadOrStage.stage?.name || leadOrStage.stage_name || leadOrStage.status || leadOrStage.name || 'new'
    }
    return leadOrStage
  }

  const filteredLeads = useMemo(() =>
    leads.filter(l => {
      const hay = `${l.company_name || ''} ${l.contact_person_name || ''} ${l.contact_person_email || ''} ${l.lead_number || ''}`.toLowerCase()
      const matchSearch = hay.includes(search.toLowerCase())
      const matchStage = stageFilter === 'all' || stageName(l) === stageFilter
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
      source: lead.source || 'website',
      probability_percent: lead.probability_percent || 10,
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

      const isAutoRequest = formData.source === 'auto_request'
      const { stage, status, ...leadPayload } = formData as LeadFormData & { stage?: string; status?: string }
      const payload = {
        ...leadPayload,
        owner_id: isAutoRequest ? null : (formData.owner_id || null),
      }

      let savedLead: any
      if (leadModalRecord?.id) {
        savedLead = await erpApi.put(`/crm/leads/${leadModalRecord.id}`, payload)
      } else {
        savedLead = await erpApi.post('/crm/leads', payload)
      }
      if (isAutoRequest && savedLead) {
        showNotification('success', 'Auto-request lead saved. The system will create a quotation automatically.')
      } else {
        showNotification('success', 'Lead saved successfully.')
      }

      await loadAll()
      setLeadModalOpen(false)
      setLeadModalRecord(null)
      setModalError(null)
    } catch (e: any) {
      setModalError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuotation = async (formData: QuotationFormData, showNotif: boolean = true) => {
    setSaving(true)
    try {
      await erpApi.post('/sales-orders/quotations', formData)
      await loadAll()
      setQuotationModalOpen(false)
      setQuotationLead(null)
      if (showNotif) {
        showNotification('success', 'Quotation created successfully.')
      }
    } catch (e: any) {
      if (showNotif) {
        showNotification('error', `Quotation creation failed: ${e.message}`)
      } else {
        console.error("Auto-quote creation failed:", e.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteLead = async (lead: any) => {
    if (!window.confirm(`Delete lead "${lead.company_name}"?`)) return
    try {
      await erpApi.delete(`/crm/leads/${lead.id}`)
      await loadAll()
      showNotification('success', 'Lead deleted.')
    } catch (e: any) {
      showNotification('error', `Delete failed: ${e.message}`)
    }
  }

  const openQuotationModal = (lead: any) => {
    const existingQuotation = quotations.find((quotation) => quotation.lead_id === lead.id && quotation.status !== 'rejected')
    if (existingQuotation) {
      showNotification('error', `Lead nay da co quotation ${existingQuotation.quotation_number || existingQuotation.id}.`)
      return
    }
    setQuotationLead(lead)
    setQuotationModalOpen(true)
  }

  const renderLeadActions = (lead: any) => (
    <div className="flex items-center gap-1">
      <button onClick={() => { setActivityLeadId(lead.id); setActivityModalOpen(true) }}
        className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Record Activity">
        <PlusCircle size={14} />
      </button>
      {stageName(lead) !== 'won' && stageName(lead) !== 'lost' && (
        <button onClick={() => openQuotationModal(lead)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50" title="Tạo báo giá">
          <FileText size={14} />
          <span>Tạo báo giá</span>
        </button>
      )}
      <RecordActions
        onEdit={() => openEditLead(lead)}
        onDelete={() => deleteLead(lead)}
      />
    </div>
  )


  return (
    <div className="space-y-6">
      <ModuleHeader
        title="CRM"
        subtitle="Manage leads from prospecting to survey, quotation, and closing."
        primaryLabel="New Lead"
        onCreate={openCreateLead}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load CRM data: {loadError}
        </div>
      )}

      {saving && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Processing data...
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'leads', label: 'Leads', count: leads.length },
          { id: 'activities', label: 'Activities', count: activities.length },
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lead #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Probability</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
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
                        {lead.is_auto_request && <p className="text-xs font-semibold text-yellow-700">Auto request</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <p>{lead.contact_person_name}</p>
                        <p className="text-xs text-gray-400">{lead.contact_person_email}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {lead.probability_percent || 10}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={stageName(lead)} />
                      </td>
                      <td className="px-4 py-3">{renderLeadActions(lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No matching leads found
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard
              records={filteredLeads}
              groupBy={l => stageName(l)}
              renderCard={lead => (
                <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{lead.company_name}</p>
                      <p className="text-xs text-gray-400">{lead.lead_number}</p>
                    </div>
                    <StatusBadge status={stageName(lead)} />
                  </div>
                  <p className="text-sm text-gray-600">{lead.contact_person_name} • {lead.contact_person_email}</p>
                  <p className="mt-2 text-xs font-semibold text-blue-700">Probability {lead.probability_percent || 10}%</p>
                  {lead.is_auto_request && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                      Quotation request
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
              <p className="text-sm text-gray-500">No activities yet. Click "Record Activity" on a lead to start.</p>
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
                      <span className="text-xs text-gray-400">{act.performed_by?.full_name || '-'} - {act.lead?.company || act.lead?.company_name || act.lead?.email || 'No lead'}</span>
                    </div>
                      {act.activity_date ? new Date(act.activity_date).toLocaleString('en-US') : ''}
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
        isOpen={leadModalOpen}
        record={leadModalRecord}
        users={users}
        existingCustomer={existingCustomer}
        onClose={() => { setLeadModalOpen(false); setLeadModalRecord(null); setExistingCustomer(null) }}
        onSave={handleSaveLead}
        errorMessage={modalError}
      />

      <QuotationModal
        isOpen={quotationModalOpen}
        lead={quotationLead}
        products={products}
        onClose={() => { setQuotationModalOpen(false); setQuotationLead(null) }}
        onSave={handleSaveQuotation}
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
