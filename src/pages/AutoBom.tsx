import React, { useEffect, useState } from 'react'
import { Package, Plus, Trash2, Search, Home, Building, X, ChevronRight, Info } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import { formatCurrency } from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

// ========== TYPES ==========
interface BomLine {
  id: string
  component_product_id: string
  component_name: string
  component_sku: string
  quantity: number
  unit_price: number
  line_total: number
}

interface BomPackage {
  id?: string
  product_id: string
  product_name: string
  product_sku: string
  category_name: string
  is_auto_bom: boolean
  min_sqm: number
  max_sqm: number
  description: string
  list_price: number
  lines: BomLine[]
  total_cost: number
  estimated_profit: number
}

// ========== PACKAGE SIZE CATEGORIES ==========
const sizeCategories = [
  { value: 'studio', label: '🏠 Căn hộ Studio (< 40m²)', min: 0, max: 40 },
  { value: '1br', label: '🏢 Căn hộ 1 Phòng ngủ (40–65m²)', min: 40, max: 65 },
  { value: '2br', label: '🏠 Căn hộ 2 Phòng ngủ (65–90m²)', min: 65, max: 90 },
  { value: '3br', label: '🏬 Căn hộ 3 Phòng ngủ (90–130m²)', min: 90, max: 130 },
  { value: 'penthouse', label: '🏙 Penthouse (130–200m²)', min: 130, max: 200 },
  { value: 'villa', label: '🏡 Villa (> 200m²)', min: 200, max: 9999 },
]

// ========== BOM PACKAGE EDITOR MODAL ==========
const BomEditorModal: React.FC<{
  isOpen: boolean
  bom: BomPackage | null
  products: any[]
  categories: any[]
  onClose: () => void
  onSave: (bom: BomPackage) => void
  errorMessage?: string | null
}> = ({ isOpen, bom, products, categories, onClose, onSave, errorMessage }) => {
  const [form, setForm] = useState<BomPackage>({
    product_id: '',
    product_name: '',
    product_sku: '',
    category_name: '',
    is_auto_bom: true,
    min_sqm: 0,
    max_sqm: 40,
    description: '',
    list_price: 0,
    lines: [],
    total_cost: 0,
    estimated_profit: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (bom) {
      setForm(bom)
    } else {
      setForm({
        product_id: '', product_name: '', product_sku: '',
        category_name: '', is_auto_bom: true,
        min_sqm: 0, max_sqm: 40, description: '',
        list_price: 0, lines: [], total_cost: 0, estimated_profit: 0,
      })
    }
    setErrors({})
  }, [bom, isOpen])

  const addComponent = (product: any) => {
    if (form.lines.some(l => l.component_product_id === product.id)) return
    const line: BomLine = {
      id: `bom-${Date.now()}`,
      component_product_id: product.id,
      component_name: product.name,
      component_sku: product.sku,
      quantity: 1,
      unit_price: Number(product.cost_price || 0),
      line_total: Number(product.cost_price || 0),
    }
    setForm(f => {
      const lines = [...f.lines, line]
      const total_cost = lines.reduce((s, l) => s + l.line_total, 0)
      const estimated_profit = f.list_price - total_cost
      return { ...f, lines, total_cost, estimated_profit }
    })
    setShowDropdown(false)
    setProductSearch('')
  }

  const updateLine = (id: string, key: keyof BomLine, value: number) => {
    setForm(f => {
      const lines = f.lines.map(l => {
        if (l.id !== id) return l
        const next = { ...l, [key]: value }
        next.line_total = next.quantity * next.unit_price
        return next
      })
      const total_cost = lines.reduce((s, l) => s + l.line_total, 0)
      const estimated_profit = f.list_price - total_cost
      return { ...f, lines, total_cost, estimated_profit }
    })
  }

  const removeLine = (id: string) => {
    setForm(f => {
      const lines = f.lines.filter(l => l.id !== id)
      const total_cost = lines.reduce((s, l) => s + l.line_total, 0)
      const estimated_profit = f.list_price - total_cost
      return { ...f, lines, total_cost, estimated_profit }
    })
  }

  const updateField = (key: keyof BomPackage, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!form.product_name.trim()) errs.product_name = 'Tên gói là bắt buộc'
    if (!form.category_name) errs.category_name = 'Danh mục là bắt buộc'
    if (form.lines.length === 0) errs.lines = 'Phải có ít nhất 1 sản phẩm trong gói'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(form)
  }

  const filteredProducts = products.filter(p =>
    !form.lines.some(l => l.component_product_id === p.id) &&
    ((p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
     (p.sku || '').toLowerCase().includes(productSearch.toLowerCase()))
  )

  const categoryOptions = categories.filter((c: any) => !c.parent_id).map((c: any) => ({ value: c.id, label: c.name }))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {bom?.id ? 'Sửa gói sản phẩm (Auto-BOM)' : 'Tạo gói sản phẩm (Auto-BOM)'}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">Lỗi: {errorMessage}</p>
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Package Info */}
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">Thông tin gói</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Tên gói sản phẩm <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.product_name}
                  onChange={e => updateField('product_name', e.target.value)}
                  placeholder="VD: Gói Chung cư 2PN Cao cấp"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.product_name ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.product_name && <p className="mt-1 text-xs text-red-600">{errors.product_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Danh mục <span className="text-red-500">*</span></label>
                <select value={form.category_name}
                  onChange={e => updateField('category_name', e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.category_name ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">-- Chọn danh mục --</option>
                  {categoryOptions.map(o => <option key={o.value} value={o.label}>{o.label}</option>)}
                </select>
                {errors.category_name && <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Giá bán (VNĐ)</label>
                <input type="number" min={0} value={form.list_price}
                  onChange={e => {
                    const lp = Number(e.target.value)
                    setForm(f => ({ ...f, list_price: lp, estimated_profit: lp - f.total_cost }))
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Diện tích tối thiểu (m²)</label>
                <input type="number" min={0} value={form.min_sqm}
                  onChange={e => updateField('min_sqm', Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Diện tích tối đa (m²)</label>
                <input type="number" min={0} value={form.max_sqm}
                  onChange={e => updateField('max_sqm', Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Mô tả</label>
                <textarea value={form.description}
                  onChange={e => updateField('description', e.target.value)} rows={2}
                  placeholder="Mô tả chi tiết gói sản phẩm..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          {/* BOM Components */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">
              📦 Thành phần BOM ({form.lines.length})
            </h3>

            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Tìm sản phẩm để thêm vào gói..."
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none" />
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                  {filteredProducts.slice(0, 12).map(p => (
                    <button key={p.id} onClick={() => addComponent(p)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{formatCurrency(p.cost_price || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.lines.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Sản phẩm</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">SL</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Giá vốn</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Thành tiền</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.lines.map(line => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{line.component_name}</p>
                          <p className="text-xs text-gray-400">{line.component_sku}</p>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min={1} value={line.quantity}
                            onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min={0} value={line.unit_price}
                            onChange={e => updateLine(line.id, 'unit_price', Number(e.target.value))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-gray-700">
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
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Tổng giá vốn (Total Cost):</td>
                      <td className="px-2 py-2 text-right font-bold text-red-600">{formatCurrency(form.total_cost)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-1 text-right font-semibold text-gray-700">Giá bán (List Price):</td>
                      <td className="px-2 py-1 text-right font-bold text-blue-700">{formatCurrency(form.list_price)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-green-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-900">Lợi nhuận ước tính:</td>
                      <td className={`px-2 py-2 text-right font-bold ${form.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(form.estimated_profit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Chưa có thành phần nào. Tìm và thêm sản phẩm ở ô trên.
              </div>
            )}
            {errors.lines && <p className="mt-1 text-xs text-red-600">{errors.lines}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {bom?.id ? 'Cập nhật gói' : 'Tạo gói'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== MAIN AUTO-BOM MODULE ==========
const AutoBomModule: React.FC<{
  onAddToLead?: (lines: BomLine[], packageName: string) => void
}> = ({ onAddToLead }) => {
  const showNotification = useUIStore(s => s.showNotification)
  const [packages, setPackages] = useState<BomPackage[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>('2br')
  const [suggestionOpen, setSuggestionOpen] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBom, setEditorBom] = useState<BomPackage | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadAll = async () => {
    try {
      const [productData, categoryData] = await Promise.all([
        erpApi.get<any[]>('/products?limit=1000'),
        erpApi.get<any[]>('/product-categories?limit=100'),
      ])
      setProducts(productData)
      setCategories(categoryData)
      // Load BOM packages: products with is_auto_bom = true that have BOM lines
      const bomResponse = await erpApi.get<any[]>('/product-bom?limit=500')
      const bomMap: Record<string, BomLine[]> = {}
      for (const row of bomResponse) {
        if (!bomMap[row.parent_product_id]) bomMap[row.parent_product_id] = []
        bomMap[row.parent_product_id].push({
          id: row.id,
          component_product_id: row.component_product_id,
          component_name: row.product?.name || '',
          component_sku: row.product?.sku || '',
          quantity: row.quantity,
          unit_price: row.product?.cost_price || 0,
          line_total: row.quantity * (row.product?.cost_price || 0),
        })
      }
      // Also load all products with is_auto_bom = true
      const autoBomProducts = productData.filter((p: any) => p.is_auto_bom)
      const pkgs: BomPackage[] = autoBomProducts.map((p: any) => {
        const lines = bomMap[p.id] || []
        const total_cost = lines.reduce((s: number, l: BomLine) => s + l.line_total, 0)
        return {
          id: p.id,
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          category_name: p.category?.name || '',
          is_auto_bom: p.is_auto_bom,
          min_sqm: p.min_sqm || 0,
          max_sqm: p.max_sqm || 40,
          description: p.description || '',
          list_price: p.list_price || 0,
          lines,
          total_cost,
          estimated_profit: (p.list_price || 0) - total_cost,
        }
      })
      setPackages(pkgs)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e.message)
    }
  }

  useEffect(() => { loadAll() }, [])

  const sizeCat = sizeCategories.find(s => s.value === selectedSize)!

  const suggestedPackages = packages.filter(p =>
    p.min_sqm <= sizeCat.max &&
    p.max_sqm > sizeCat.min
  )

  const filteredPackages = packages.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.product_sku.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveBom = async (bom: BomPackage) => {
    setEditorError(null)
    try {
      // Upsert the product as an auto-BOM package
      const productPayload = {
        sku: bom.product_sku || `BOM-${Date.now().toString().slice(-6)}`,
        name: bom.product_name,
        category_id: categories.find((c: any) => c.name === bom.category_name)?.id,
        list_price: bom.list_price,
        cost_price: bom.total_cost,
        is_auto_bom: true,
        physical_size_sqm: 1,
        status: 'active',
        description: bom.description || `Goi Auto-BOM cho ${bom.category_name}`,
        is_iot_device: false,
        requires_serial_scan: false,
      }
      let savedProduct: any
      if (bom.id) {
        await erpApi.put(`/products/${bom.id}`, productPayload)
        savedProduct = { id: bom.id, ...productPayload }
      } else {
        savedProduct = await erpApi.post<any>('/products', productPayload)
      }
      // Persist BOM lines
      const parentId = savedProduct.id
      // Delete existing BOM lines for this parent
      // Then insert new lines
      if (bom.lines.length > 0) {
        await erpApi.post('/product-bom', {
          parent_product_id: parentId,
          lines: bom.lines.map(l => ({
            component_product_id: l.component_product_id,
            quantity: l.quantity,
          })),
        })
      }
      await loadAll()
      setEditorOpen(false)
      setEditorBom(null)
      showNotification('success', 'Gói BOM đã được lưu.')
    } catch (e: any) {
      setEditorError(e.message)
    }
  }

  const addSuggestedToLead = (pkg: BomPackage) => {
    if (onAddToLead) {
      onAddToLead(pkg.lines, pkg.product_name)
      showNotification('success', `Đã thêm gói "${pkg.product_name}" vào lead.`)
    } else {
      showNotification('info', `Gói "${pkg.product_name}" có ${pkg.lines.length} thành phần, tổng giá vốn: ${formatCurrency(pkg.total_cost)}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-purple-600" />
            Auto-BOM — Gói sản phẩm tự động
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tạo gói thiết bị SmartHome theo diện tích căn hộ. Hệ thống gợi ý gói phù hợp khi tạo Lead.
          </p>
        </div>
        <button onClick={() => { setEditorBom(null); setEditorError(null); setEditorOpen(true) }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 flex items-center gap-2">
          <Plus size={16} />
          Tạo gói mới
        </button>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lỗi tải dữ liệu: {loadError}
        </div>
      )}

      {/* Size Selector + Suggestions */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Size Category Selector */}
        <div className="col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg">
              <h3 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                <Home size={14} />
                Chọn loại căn hộ
              </h3>
            </div>
            <div className="p-3 space-y-1">
              {sizeCategories.map(cat => {
                const count = packages.filter(p =>
                  p.min_sqm <= cat.max && p.max_sqm > cat.min
                ).length
                return (
                  <button key={cat.value}
                    onClick={() => setSelectedSize(cat.value)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      selectedSize === cat.value
                        ? 'bg-blue-50 border border-blue-200 text-blue-700 font-semibold'
                        : 'hover:bg-gray-50 border border-transparent text-gray-700'
                    }`}>
                    <span>{cat.label}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      selectedSize === cat.value ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'
                    }`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Suggested Packages for Selected Size */}
        <div className="col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                <Building size={14} />
                Gói đề xuất cho {sizeCat.label}
                <span className="ml-2 text-xs font-normal text-gray-400">({suggestedPackages.length} gói)</span>
              </h3>
              {suggestedPackages.length > 0 && (
                <button onClick={() => setSuggestionOpen(o => !o)}
                  className="text-xs text-gray-500 hover:text-gray-700">
                  {suggestionOpen ? 'Thu gọn' : 'Mở rộng'}
                </button>
              )}
            </div>
            {suggestedPackages.length === 0 ? (
              <div className="p-8 text-center">
                <Info size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Chưa có gói nào cho {sizeCat.label}.<br />
                  <button onClick={() => { setSelectedSize(sizeCat.value); setEditorBom(null); setEditorOpen(true) }}
                    className="mt-2 text-blue-600 hover:underline text-sm font-semibold">
                    Tạo gói mới cho loại này →
                  </button>
                </p>
              </div>
            ) : suggestionOpen ? (
              <div className="divide-y divide-gray-100">
                {suggestedPackages.map(pkg => (
                  <div key={pkg.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{pkg.product_name}</p>
                        <p className="text-xs text-gray-400">{pkg.product_sku} • {pkg.category_name}</p>
                        <p className="mt-1 text-xs text-gray-600">{pkg.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {pkg.lines.length} sản phẩm
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {pkg.min_sqm}–{pkg.max_sqm}m²
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-blue-700">{formatCurrency(pkg.list_price)}</p>
                        <p className="text-xs text-gray-400">vốn: {formatCurrency(pkg.total_cost)}</p>
                        <p className={`text-xs font-semibold ${pkg.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          lợi: {formatCurrency(pkg.estimated_profit)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => addSuggestedToLead(pkg)}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                        + Thêm vào Lead
                      </button>
                      <button onClick={() => {
                        setEditorBom(pkg)
                        setEditorError(null)
                        setEditorOpen(true)
                      }}
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                        Sửa gói
                      </button>
                    </div>
                    {/* Component Preview */}
                    <div className="mt-2 rounded bg-gray-50 p-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Thành phần:</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.lines.slice(0, 6).map(l => (
                          <span key={l.id} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                            {l.quantity}× {l.component_name}
                          </span>
                        ))}
                        {pkg.lines.length > 6 && (
                          <span className="text-xs text-gray-400">+{pkg.lines.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {suggestedPackages.length} gói cho {sizeCat.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Packages Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50 rounded-t-lg">
          <h3 className="text-sm font-bold text-gray-800 uppercase">Tất cả gói BOM ({packages.length})</h3>
          <input type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm gói..."
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-64" />
        </div>
        {filteredPackages.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Chưa có gói BOM nào. Click "Tạo gói mới" để bắt đầu.
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Gói</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Danh mục</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Thành phần</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Giá bán</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Giá vốn</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Lợi nhuận</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPackages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{pkg.product_name}</p>
                    <p className="text-xs text-gray-400">{pkg.product_sku}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pkg.category_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-700">{pkg.lines.length}</span>
                    <span className="text-xs text-gray-400 ml-1">sản phẩm</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(pkg.list_price)}</td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">{formatCurrency(pkg.total_cost)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${pkg.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pkg.estimated_profit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => addSuggestedToLead(pkg)}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Thêm vào Lead">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => { setEditorBom(pkg); setEditorError(null); setEditorOpen(true) }}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Sửa">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BomEditorModal
        isOpen={editorOpen}
        bom={editorBom}
        products={products}
        categories={categories}
        onClose={() => { setEditorOpen(false); setEditorBom(null) }}
        onSave={handleSaveBom}
        errorMessage={editorError}
      />
    </div>
  )
}

export default AutoBomModule
