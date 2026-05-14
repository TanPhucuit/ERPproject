import React, { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, X } from 'lucide-react'
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

// ========== RFQ LINE TYPE ==========
interface RFQLine {
  id: string
  product_id: string
  supplier_products_id?: string
  supplier_name?: string
  product_name: string
  product_sku: string
  estimated_unit_price?: number
  quantity_required: number
  required_delivery_date?: string
  notes?: string
}

interface RFQSupplierQuotation {
  supplier_id: string
  supplier_name: string
  quoted_price: number
  quoted_lead_time_days?: number
  minimum_order_quantity?: number
  is_selected: boolean
}

// ========== PO LINE TYPE ==========
interface POLine {
  id: string
  product_id: string
  supplier_products_id?: string
  supplier_name?: string
  product_name: string
  product_sku: string
  product_cost_price?: number
  quantity_ordered: number
  unit_price: number
  line_total?: number
  required_delivery_date?: string
  notes?: string
}

// ========== CALCULATION HELPERS ==========
const calcRFQSubtotal = (lines: RFQLine[], quotations: Record<string, RFQSupplierQuotation[]>) => {
  return lines.reduce((sum, line) => {
    const selectedQuote = quotations[line.id]?.find(q => q.is_selected)
    return sum + ((selectedQuote?.quoted_price || line.estimated_unit_price || 0) * line.quantity_required)
  }, 0)
}

const calcPOTotal = (lines: POLine[]) => {
  return lines.reduce((sum, line) => sum + (line.line_total || (line.unit_price * line.quantity_ordered)), 0)
}

// ========== RFQ LINES EDITOR ==========
const getSupplierProductLabel = (item: any) =>
  `${item.supplierName || item.supplier_name || 'Supplier'} - ${formatCurrency(item.price || 0)}`

const RFQLinesEditor: React.FC<{
  lines: RFQLine[]
  onLinesChange: (lines: RFQLine[]) => void
  products: any[]
  supplierProducts: any[]
  suppliers: any[]
}> = ({ lines, onLinesChange, products, supplierProducts }) => {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const productsWithSuppliers = products.filter(product =>
    supplierProducts.some(sp => sp.product_id === product.id) &&
    !lines.some(line => line.product_id === product.id) &&
    `${product.name || product.product_name || ''} ${product.sku || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const supplierOptionsForProduct = (productId: string) =>
    supplierProducts.filter(item => item.product_id === productId)

  const addProduct = (product: any) => {
    const firstSupplierProduct = supplierOptionsForProduct(product.id)[0]
    const newLine: RFQLine = {
      id: `rfq-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      supplier_products_id: firstSupplierProduct?.id,
      supplier_name: firstSupplierProduct?.supplierName || firstSupplierProduct?.supplier_name,
      product_name: product.name || product.product_name,
      product_sku: product.sku,
      estimated_unit_price: firstSupplierProduct?.price || 0,
      quantity_required: 1,
      required_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    onLinesChange([...lines, newLine])
    setSearch('')
    setShowDropdown(false)
  }

  const updateLine = (id: string, key: keyof RFQLine, value: any) => {
    onLinesChange(lines.map(l => {
      if (l.id !== id) return l
      if (key === 'supplier_products_id') {
        const selectedSupplierProduct = supplierProducts.find(item => item.id === value)
        return {
          ...l,
          supplier_products_id: value,
          supplier_name: selectedSupplierProduct?.supplierName || selectedSupplierProduct?.supplier_name || '',
          estimated_unit_price: selectedSupplierProduct?.price || 0,
        }
      }
      return { ...l, [key]: value }
    }))
  }

  const removeLine = (id: string) => {
    onLinesChange(lines.filter(l => l.id !== id))
  }

  return (
    <div className="rounded-lg border border-gray-200 space-y-4">
      {/* Search & Add Product */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search products to add to RFQ..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {showDropdown && productsWithSuppliers.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-w-lg rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
            {productsWithSuppliers.slice(0, 10).map(p => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-900">{p.name || p.product_name}</span>
                  <p className="text-xs text-gray-500">{supplierOptionsForProduct(p.id).length} suppliers available</p>
                </div>
                <span className="text-xs text-gray-500">{p.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RFQ Lines */}
      {lines.length > 0 ? (
        <div className="p-3 space-y-4">
          {lines.map(line => (
            <div key={line.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Line Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{line.product_name}</p>
                  <p className="text-xs text-gray-500">{line.product_sku}</p>
                </div>
                <button onClick={() => removeLine(line.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Line Details */}
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Supplier</label>
                  <select value={line.supplier_products_id || ''}
                    onChange={e => updateLine(line.id, 'supplier_products_id', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="">Select supplier...</option>
                    {supplierOptionsForProduct(line.product_id).map(item => (
                      <option key={item.id} value={item.id}>{getSupplierProductLabel(item)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Qty Required</label>
                  <input type="number" min={1} value={line.quantity_required}
                    onChange={e => updateLine(line.id, 'quantity_required', Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Supplier Price</label>
                  <input type="text" value={formatCurrency(line.estimated_unit_price || 0)} readOnly
                    className="w-full rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Delivery Date</label>
                  <input type="date" value={line.required_delivery_date || ''}
                    onChange={e => updateLine(line.id, 'required_delivery_date', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Notes</label>
                  <input type="text" value={line.notes || ''}
                    onChange={e => updateLine(line.id, 'notes', e.target.value)}
                    placeholder="Optional notes"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-gray-500">
          No products added. Use search above to add products to RFQ.
        </div>
      )}
    </div>
  )
}

// ========== PO LINES EDITOR ==========
const POLinesEditor: React.FC<{
  lines: POLine[]
  onLinesChange: (lines: POLine[]) => void
  supplierProducts: any[]
}> = ({ lines, onLinesChange, supplierProducts }) => {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredProducts = supplierProducts.filter(p =>
    !lines.some(l => l.supplier_products_id === p.id) &&
    ((p.productName || p.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
     (p.supplierName || p.supplier_name || '').toLowerCase().includes(search.toLowerCase()) ||
     (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  )

  const addProduct = (supplierProduct: any) => {
    const newLine: POLine = {
      id: `po-${Date.now()}-${Math.random()}`,
      product_id: supplierProduct.product_id || '',
      supplier_products_id: supplierProduct.id,
      supplier_name: supplierProduct.supplierName || supplierProduct.supplier_name,
      product_name: supplierProduct.sku,
      product_sku: supplierProduct.sku,
      product_cost_price: supplierProduct.price || 0,
      quantity_ordered: 1,
      unit_price: supplierProduct.price || 0,
      line_total: supplierProduct.price || 0,
      required_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    onLinesChange([...lines, newLine])
    setSearch('')
    setShowDropdown(false)
  }

  const updateLine = (id: string, key: keyof POLine, value: any) => {
    onLinesChange(lines.map(l => {
      if (l.id === id) {
        const updated = { ...l, [key]: value }
        // Auto-calculate line_total when quantity or unit_price changes
        if (key === 'quantity_ordered' || key === 'unit_price') {
          updated.line_total = updated.unit_price * updated.quantity_ordered
        }
        return updated
      }
      return l
    }))
  }

  const removeLine = (id: string) => {
    onLinesChange(lines.filter(l => l.id !== id))
  }

  return (
    <div className="rounded-lg border border-gray-200 space-y-4">
      {/* Search & Add Product */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search products to add to PO..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {showDropdown && filteredProducts.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-w-lg rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
            {filteredProducts.slice(0, 10).map(p => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-900">{p.productName || p.product_name}</span>
                  <p className="text-xs text-gray-500">{p.supplierName || p.supplier_name}</p>
                </div>
                <span className="text-xs text-gray-500">{p.sku} - {formatCurrency(p.price || 0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PO Lines */}
      {lines.length > 0 ? (
        <div className="p-3 space-y-4">
          {lines.map(line => (
            <div key={line.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Line Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{line.product_name}</p>
                  <p className="text-xs text-gray-500">{line.product_sku}</p>
                </div>
                <button onClick={() => removeLine(line.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Line Details */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Qty Ordered</label>
                  <input type="number" min={1} value={line.quantity_ordered}
                    onChange={e => updateLine(line.id, 'quantity_ordered', Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Unit Price</label>
                  <input type="number" min={0} step={0.01} value={line.unit_price}
                    onChange={e => updateLine(line.id, 'unit_price', Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Line Total</label>
                  <input type="number" value={line.line_total || 0} readOnly
                    className="w-full rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Delivery Date</label>
                  <input type="date" value={line.required_delivery_date || ''}
                    onChange={e => updateLine(line.id, 'required_delivery_date', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-gray-500">
          No products added. Use search above to add products to PO.
        </div>
      )}
    </div>
  )
}

void POLinesEditor

// ========== RFQ CUSTOM MODAL ==========
const RFQModal: React.FC<{
  isOpen: boolean
  record: any
  suppliers: any[]
  supplierProducts: any[]
  products: any[]
  onClose: () => void
  onSave: (data: any) => void
}> = ({ isOpen, record, suppliers, supplierProducts, products, onClose, onSave }) => {
  const [form, setForm] = useState<any>({
    rfqNumber: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    closingDate: '',
    totalEstimatedCost: 0,
    status: 'new',
    notes: '',
    lines: [],
    quotations: {},
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const emptyRfq = {
      rfqNumber: `RFQ-${Date.now().toString().slice(-5)}`,
      issuedDate: new Date().toISOString().slice(0, 10),
      closingDate: '',
      totalEstimatedCost: 0,
      status: 'new',
      notes: '',
      lines: [],
      quotations: {},
    }
    if (record) {
      setForm({
        ...emptyRfq,
        ...record,
        rfqNumber: record.rfqNumber || record.rfq_number || emptyRfq.rfqNumber,
        issuedDate: record.issuedDate || record.issued_date || emptyRfq.issuedDate,
        closingDate: record.closingDate || record.closing_date || '',
        totalEstimatedCost: record.totalEstimatedCost || record.total_estimated_cost || 0,
        lines: Array.isArray(record.lines || record.rfq_lines) ? (record.lines || record.rfq_lines) : [],
        quotations: record.quotations || {},
      })
    } else {
      setForm(emptyRfq)
    }
    setFormError('')
  }, [record, isOpen])

  const handleSave = () => {
    if ((form.lines || []).length === 0) {
      setFormError('RFQ must have at least one product line.')
      return
    }
    if ((form.lines || []).some((line: RFQLine) => !line.supplier_products_id)) {
      setFormError('Please select a supplier for every RFQ product line.')
      return
    }
    setFormError('')
    const totalEstimatedCost = calcRFQSubtotal(form.lines || [], form.quotations || {})
    onSave({ ...form, totalEstimatedCost })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {record?.id ? 'Edit RFQ' : 'Create new RFQ'}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}
          {/* Header Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">RFQ #</label>
              <input type="text" value={form.rfqNumber} readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Issued Date</label>
              <input type="date" value={form.issuedDate}
                onChange={e => setForm({ ...form, issuedDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Closing Date</label>
              <input type="date" value={form.closingDate}
                onChange={e => setForm({ ...form, closingDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase tracking-wide">Products ({(form.lines || []).length})</h3>
            <RFQLinesEditor
              lines={form.lines || []}
              onLinesChange={lines => setForm({ ...form, lines })}
              products={products}
              supplierProducts={supplierProducts}
              suppliers={suppliers}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Total Estimated Cost:</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(calcRFQSubtotal(form.lines || [], form.quotations || {}))}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Notes</label>
              <textarea value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="RFQ notes..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {record?.id ? 'Update' : 'Create'} RFQ
          </button>
        </div>
      </div>
    </div>
  )
}


// ========== PO CUSTOM MODAL ==========
const POModal: React.FC<{
  isOpen: boolean
  record: any
  supplierProducts: any[]
  rfqs: any[]
  onClose: () => void
  onSave: (data: any) => void
}> = ({ isOpen, record, supplierProducts, rfqs, onClose, onSave }) => {
  const [form, setForm] = useState<any>({
    poNumber: '',
    supplierId: '',
    rfqId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    requiredDeliveryDate: '',
    actualDeliveryDate: '',
    totalAmountBeforeTax: 0,
    totalTax: 0,
    totalAmount: 0,
    receivedAmount: 0,
    status: 'sent',
    notes: '',
    lines: [],
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (record) {
      setForm({ ...record, rfqId: record.rfqId || record.rfq_id || record.rfqNumber || '' })
    } else {
      setForm({
        poNumber: `PO-${Date.now().toString().slice(-5)}`,
        supplierId: '',
        rfqId: '',
        orderDate: new Date().toISOString().slice(0, 10),
        requiredDeliveryDate: '',
        actualDeliveryDate: '',
        totalAmountBeforeTax: 0,
        totalTax: 0,
        totalAmount: 0,
        receivedAmount: 0,
        status: 'sent',
        notes: '',
        lines: [],
      })
    }
    setFormError('')
  }, [record, isOpen])

  const selectedRfq = rfqs.find((rfq) => rfq.id === form.rfqId)
  const rfqSupplierOptions = useMemo(() => {
    const supplierMap = new Map<string, string>()
    ;(selectedRfq?.lines || []).forEach((line: any) => {
      const supplierProduct = supplierProducts.find((item) => item.id === line.supplier_products_id)
      const supplierId = supplierProduct?.supplier_id
      if (supplierId) supplierMap.set(supplierId, supplierProduct?.supplierName || supplierProduct?.supplier_name || line.supplier_name || 'Supplier')
    })
    return Array.from(supplierMap.entries()).map(([value, label]) => ({ value, label }))
  }, [selectedRfq, supplierProducts])

  const mappedSupplierName = rfqSupplierOptions.map((supplier) => supplier.label).join(', ')

  const linesFromRfq = (rfq: any) => {
    return (rfq?.lines || []).map((line: any) => {
      const supplierProduct = supplierProducts.find((item) => item.id === line.supplier_products_id)
      const quantity = Number(line.quantity_required || line.quantity || 1)
      const unitPrice = Number(supplierProduct?.price || line.estimated_unit_price || 0)
      return {
        id: line.id || `po-${line.supplier_products_id}`,
        product_id: line.product_id || supplierProduct?.product_id || '',
        supplier_products_id: line.supplier_products_id,
        supplier_name: supplierProduct?.supplierName || supplierProduct?.supplier_name || line.supplier_name,
        product_name: line.product_name || supplierProduct?.productName || supplierProduct?.product_name || supplierProduct?.sku || '',
        product_sku: line.product_sku || supplierProduct?.productSku || supplierProduct?.sku || '',
        quantity_ordered: quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      }
    })
  }

  const selectRfq = (rfqId: string) => {
    const rfq = rfqs.find((item) => item.id === rfqId)
    const firstSupplierProductId = rfq?.lines?.[0]?.supplier_products_id
    const firstSupplierProduct = supplierProducts.find((item) => item.id === firstSupplierProductId)
    const supplierId = firstSupplierProduct?.supplier_id || ''
    setForm({
      ...form,
      rfqId,
      supplierId,
      lines: linesFromRfq(rfq),
    })
  }

  const handleSave = () => {
    if (!form.rfqId) {
      setFormError('Purchase Order must be created from an RFQ.')
      return
    }
    if (form.lines.length === 0) {
      setFormError('RFQ must have at least one product line.')
      return
    }
    setFormError('')
    const subtotal = calcPOTotal(form.lines)
    const totalWithTax = subtotal + (form.totalTax || 0)
    onSave({ ...form, totalAmountBeforeTax: subtotal, totalAmount: totalWithTax })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {record?.id ? 'Edit Purchase Order' : 'Create new Purchase Order'}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}
          {/* Header Fields */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">PO #</label>
              <input type="text" value={form.poNumber} readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">RFQ</label>
              <select value={form.rfqId || ''}
                onChange={e => selectRfq(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select RFQ...</option>
                {rfqs.map((rfq) => (
                  <option key={rfq.id} value={rfq.id}>{rfq.rfqNumber || rfq.rfq_number || rfq.id?.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Suppliers in RFQ</label>
              <input value={mappedSupplierName} readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">PO Date</label>
              <input type="date" value={form.orderDate}
                onChange={e => setForm({ ...form, orderDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Required Delivery</label>
              <input type="date" value={form.requiredDeliveryDate}
                onChange={e => setForm({ ...form, requiredDeliveryDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase tracking-wide">📦 Products ({form.lines.length})</h3>
            <div className="rounded-lg border border-gray-200">
              {form.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Supplier Price</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.lines.map((line: POLine) => (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-gray-900">{line.product_name}</p>
                            <p className="text-xs text-gray-500">{line.product_sku}</p>
                          </td>
                          <td className="px-3 py-2 text-center">{line.quantity_ordered}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(line.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(line.line_total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">
                  Select an RFQ and supplier to load RFQ products.
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Subtotal:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(calcPOTotal(form.lines))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Tax:</span>
              <input type="number" min={0} step={0.01} value={form.totalTax}
                onChange={e => setForm({ ...form, totalTax: Number(e.target.value) })}
                className="w-32 rounded border border-gray-300 px-2 py-1 text-sm text-right" />
            </div>
            <div className="border-t border-gray-300 pt-2 flex items-center justify-between">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(calcPOTotal(form.lines) + (form.totalTax || 0))}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Notes</label>
              <textarea value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="PO notes..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {record?.id ? 'Update' : 'Create'} PO
          </button>
        </div>
      </div>
    </div>
  )
}

const PurchaseModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('purchase-orders')
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [rfqs, setRfqs] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierProducts, setSupplierProducts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [rfqList, setRfqList] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)
  const [cancelRecord, setCancelRecord] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    erpApi
      .get<any[]>('/purchase/purchase-orders?limit=100')
      .then((records) => {
        setLoadError(null)
        setPurchaseOrders(
          records.map((po) => ({
            ...po,
            poNumber: po.purchase_order_number,
            supplierId: po.supplier_id,
            supplierName: po.supplier?.name || po.supplier_id,
            rfqNumber: po.rfq_number || po.rfq?.rfq_number || po.rfq_id?.slice(0, 8),
            productCount: po.product_count || po.lines?.length || po.items?.length || 0,
            orderDate: po.order_date,
            requiredDeliveryDate: po.required_delivery_date,
            actualDeliveryDate: po.actual_delivery_date,
            totalAmountBeforeTax: po.total_amount_before_tax,
            totalTax: po.total_tax,
            totalAmount: po.total_amount || 0,
            receivedAmount: po.received_amount,
            notes: po.notes,
            rfqId: po.rfq_id,
            lines: (po.items || []).map((item: any) => ({
              id: item.id,
              product_id: item.supplier_product?.product_id || item.product_id,
              supplier_products_id: item.supplier_products_id,
              supplier_name: item.supplier_product?.supplier?.name || po.supplier?.name,
              product_name: item.supplier_product?.sku || '',
              product_sku: item.supplier_product?.sku || item.supplier_product?.product?.sku || '',
              quantity_ordered: item.quantity,
              unit_price: item.unit_price,
              line_total: Number(item.quantity || 0) * Number(item.unit_price || 0),
            })),
          }))
        )
      })
      .catch((error) => {
        setPurchaseOrders([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/purchase/rfqs?limit=100')
      .then((records) => {
        setLoadError(null)
        setRfqs(
          records.map((rfq) => ({
            ...rfq,
            rfqNumber: rfq.rfq_number,
            issuedDate: rfq.issued_date,
            closingDate: rfq.closing_date,
            totalEstimatedCost: rfq.total_estimated_cost || 0,
            notes: rfq.notes,
            supplierName: rfq.supplier_name,
            lines: (rfq.items || []).map((item: any) => ({
              id: item.id,
              product_id: item.supplier_product?.product_id || '',
              supplier_products_id: item.supplier_products_id,
              supplier_name: item.supplier_product?.supplier?.supplier_name || item.supplier_product?.supplier?.name || '',
              product_name: item.supplier_product?.product?.product_name || item.supplier_product?.sku || '',
              product_sku: item.supplier_product?.product?.sku || item.supplier_product?.sku || '',
              estimated_unit_price: item.supplier_product?.price || 0,
              quantity_required: item.quantity,
            })),
          }))
        )
        setRfqList(records)
      })
      .catch((error) => {
        setRfqs([])
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    erpApi
      .get<any[]>('/suppliers?limit=1000')
      .then(setSuppliers)
      .catch(() => setSuppliers([]))

    erpApi
      .get<any[]>('/supplier-products?limit=1000')
      .then(setSupplierProducts)
      .catch(() => setSupplierProducts([]))

    erpApi
      .get<any[]>('/products?limit=1000')
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const activeRecords = activeTab === 'purchase-orders' ? purchaseOrders : rfqs
  const rfqOptions = useMemo(
    () => rfqList.map((rfq) => ({ value: rfq.id, label: `${rfq.rfq_number} - ${rfq.supplier?.name || 'Supplier'}` })),
    [rfqList]
  )
  const title = activeTab === 'purchase-orders' ? 'Purchase Order' : 'RFQ'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.purchase_order_number || record.rfq_number || record.rfqNumber || ''} ${record.supplierName || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    if (activeTab === 'purchase-orders') {
      showNotification('info', 'Purchase orders are generated automatically from accepted RFQs.')
      return
    }
    setModalRecord(null)
    setModalOpen(true)
  }

  const setActiveRecords = activeTab === 'purchase-orders' ? setPurchaseOrders : setRfqs

  const saveRecord = async (record: any) => {
    const isPO = activeTab === 'purchase-orders'
    const path = isPO ? '/purchase/purchase-orders' : '/purchase/rfqs'
    const payload = isPO
      ? {
          supplier_id: record.supplierId,
          rfq_id: record.rfqId || rfqOptions.find(r => r.label === record.rfqNumber)?.value || record.rfqNumber,
          order_date: record.orderDate,
          required_delivery_date: record.requiredDeliveryDate,
          actual_delivery_date: record.actualDeliveryDate,
          total_amount_before_tax: record.totalAmountBeforeTax,
          total_tax: record.totalTax,
          total_amount: record.totalAmount,
          received_amount: record.receivedAmount,
          status: record.status,
          notes: record.notes,
          lines: record.lines || [],  // FIX #5: Include PO lines if present
        }
      : {
          rfq_number: record.rfqNumber,
          issued_date: record.issuedDate,
          closing_date: record.closingDate,
          total_estimated_cost: record.totalEstimatedCost,
          notes: record.notes,
          lines: (record.lines || []).map((line: any) => ({
            ...line,
            supplier_products_id: line.supplier_products_id,
            quantity: line.quantity ?? line.quantity_required,
          })),
          quotations: record.quotations || {},  // FIX #5: Include supplier quotations
        }
    try {
      if (activeRecords.some((item) => item.id === record.id) && !record.id.startsWith(activeTab)) {
        await erpApi.put(`${path}/${record.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      showNotification('error', `Purchase save failed: ${error.message}`)
      return
    }
    setActiveRecords((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const advanceRecord = async (record: any) => {
    if (activeTab !== 'rfqs') return
    const rfqFlow: Record<string, string> = {
      new: 'accepted',
    }
    const nextStatus = rfqFlow[record.status]
    if (!nextStatus) return
    try {
      await erpApi.put(`/purchase/rfqs/${record.id}`, { ...record, status: nextStatus })
      if (nextStatus === 'accepted') {
        const records = await erpApi.get<any[]>('/purchase/purchase-orders?limit=100')
        setPurchaseOrders(records.map((po) => ({
          ...po,
          poNumber: po.purchase_order_number,
          supplierId: po.supplier_id,
          supplierName: po.supplier?.name || po.supplier_id,
          rfqNumber: po.rfq_number || po.rfq?.rfq_number || po.rfq_id?.slice(0, 8),
          productCount: po.product_count || po.lines?.length || po.items?.length || 0,
          orderDate: po.order_date,
          requiredDeliveryDate: po.required_delivery_date,
          totalAmount: po.total_amount || 0,
          notes: po.notes,
          lines: po.items || [],
        })))
      }
      setActiveRecords((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
      showNotification('success', `${title} moved to ${nextStatus}.`)
    } catch (error: any) {
      showNotification('error', `Status update failed: ${error.message}`)
    }
  }

  const deleteRecord = async (record: any) => {
    const path = activeTab === 'purchase-orders' ? '/purchase/purchase-orders' : '/purchase/rfqs'
    const recordName = record.purchase_order_number || record.rfq_number || 'this record'
    if (!window.confirm(`Delete ${recordName}?`)) return
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (error: any) {
      showNotification('error', `Purchase delete failed: ${error.message}`)
      return
    }
    setActiveRecords((current) => current.filter((item) => item.id !== record.id))
    showNotification('success', `${title} deleted.`)
  }

  const openCancelPurchaseOrder = (record: any) => {
    setCancelRecord(record)
    setCancelReason('')
  }

  const confirmCancelPurchaseOrder = async () => {
    if (!cancelRecord || !cancelReason.trim()) {
      showNotification('error', 'Please enter a cancellation reason.')
      return
    }
    try {
      await erpApi.put(`/purchase/purchase-orders/${cancelRecord.id}`, {
        status: 'cancelled',
        cancellation_reason: cancelReason.trim(),
      })
      setPurchaseOrders((current) => current.map((item) => item.id === cancelRecord.id ? { ...item, status: 'cancelled', cancellation_reason: cancelReason.trim() } : item))
      setCancelRecord(null)
      setCancelReason('')
      showNotification('success', 'Purchase order, vendor bill, and goods receipt were cancelled.')
    } catch (error: any) {
      showNotification('error', `Cancel failed: ${error.message}`)
    }
  }

  const renderActions = (record: any) => (
    activeTab === 'purchase-orders' ? (
      <div className="flex items-center gap-1">
        {!['cancelled', 'received'].includes(record.status) && (
        <button onClick={() => openCancelPurchaseOrder(record)} className="rounded p-2 text-red-600 hover:bg-red-50" title="Cancel">
          <Trash2 size={16} />
        </button>
        )}
      </div>
    ) : (
      <RecordActions
        onEdit={() => {
          setModalRecord(record)
          setModalOpen(true)
        }}
        onDelete={() => deleteRecord(record)}
        onAdvance={record.status === 'new' ? () => advanceRecord(record) : undefined}
        advanceLabel="Accept"
      />
    )
  )

  const productCountLabel = (record: any) => `${record.productCount || record.product_count || record.lines?.length || record.items?.length || 0} products`

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Purchase"
        subtitle="Manage RFQs and purchase orders for imported SmartHome and IoT devices."
        primaryLabel={activeTab === 'purchase-orders' ? 'PO from accepted RFQ' : 'New RFQ'}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load purchase data from backend: {loadError}
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab)
          setSearch('')
          setStatus('all')
        }}
        tabs={[
          { id: 'purchase-orders', label: 'Purchase Orders', count: purchaseOrders.length },
          { id: 'rfqs', label: 'RFQs', count: rfqs.length },
        ]}
      />

      <ActionToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statuses={Array.from(new Set(activeRecords.map((record) => record.status).filter(Boolean)))}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'purchase-orders' ? 'RFQ' : 'Supplier'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'purchase-orders' ? 'Products' : 'Requirement'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Estimated Cost</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.poNumber || record.rfqNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'purchase-orders' ? (record.rfqNumber || '-') : record.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'purchase-orders' ? productCountLabel(record) : (record.notes || 'Device replenishment')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.orderDate || record.issuedDate || record.closingDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(record.totalAmount || record.totalEstimatedCost || record.total_amount || record.total_estimated_cost || 0)}</td>
                  <td className="px-4 py-3">{renderActions(record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <KanbanBoard
          records={filteredRecords}
          groupBy={(record) => record.status}
          renderCard={(record) => (
            <div key={record.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-bold text-blue-700">{record.poNumber || record.rfqNumber}</p>
              <p className="mt-1 text-sm text-gray-600">{activeTab === 'purchase-orders' ? `RFQ ${record.rfqNumber || '-'}` : record.supplierName}</p>
              {activeTab === 'purchase-orders' && <p className="mt-1 text-sm text-gray-600">{productCountLabel(record)}</p>}
              <p className="mt-2 text-sm font-semibold">{formatCurrency(record.totalAmount || record.totalEstimatedCost || record.total_amount || record.total_estimated_cost || 0)}</p>
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      {/* PO Custom Modal */}
      <POModal
        isOpen={modalOpen && activeTab === 'purchase-orders'}
        record={modalRecord}
        supplierProducts={supplierProducts}
        rfqs={rfqs}
        onClose={() => setModalOpen(false)}
        onSave={saveRecord}
      />

      {/* RFQ Custom Modal */}
      <RFQModal
        isOpen={modalOpen && activeTab === 'rfqs'}
        record={modalRecord}
        suppliers={suppliers}
        supplierProducts={supplierProducts}
        products={products}
        onClose={() => setModalOpen(false)}
        onSave={saveRecord}
      />
      {cancelRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-bold text-gray-900">Cancel purchase order</h3>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-gray-600">{cancelRecord.purchase_order_number || cancelRecord.poNumber}</p>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Cancellation reason..."
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
              <button onClick={() => setCancelRecord(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Close</button>
              <button onClick={confirmCancelPurchaseOrder} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white">Cancel PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseModule

