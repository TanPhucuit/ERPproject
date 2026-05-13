import React, { useEffect, useMemo, useState } from 'react'
import { Database } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import {
  ActionToolbar,
  FormField,
  KanbanBoard,
  ModuleHeader,
  ModuleTabs,
  RecordActions,
  RecordModal,
  StatusBadge,
  ViewMode,
  formatCurrency,
} from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

type MasterTabId =
  | 'categories'
  | 'products'
  | 'supplierProducts'
  | 'customers'
  | 'suppliers'
  | 'users'
  | 'warehouses'
  | 'binLocations'

type TabConfig = {
  id: MasterTabId
  label: string
  endpoint: string
  primaryLabel: string
  title: string
  createRecord: () => Record<string, any>
  fields: FormField[]
  searchKeys: string[]
  statusKey?: string
  getColumns: () => Array<{ key: string; label: string; align?: 'left' | 'right' }>
}

const categoryFields: FormField[] = [
  { name: 'name', label: 'Category Name', type: 'text', required: true },
  { name: 'parentName', label: 'Parent Category', type: 'select', options: [] },
]

const productFields: FormField[] = [
  { name: 'sku', label: 'SKU', type: 'text', required: true },
  { name: 'name', label: 'Product Name', type: 'text', required: true },
  { name: 'categoryName', label: 'Category', type: 'select', required: true, options: [] },
  { name: 'uom', label: 'Unit of Measure', type: 'text' },
  { name: 'list_price', label: 'List Price', type: 'number', required: true },
  { name: 'cost_price', label: 'Cost Price', type: 'number', required: true },
  { name: 'warranty_period', label: 'Warranty Period (days)', type: 'number' },
  { name: 'repair_fee', label: 'Repair Fee', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const customerFields: FormField[] = [
  { name: 'name', label: 'Customer Name', type: 'text', required: true },
  {
    name: 'customer_type',
    label: 'Customer Type',
    type: 'select',
    required: true,
    options: [
      { value: 'individual', label: 'Individual' },
      { value: 'company', label: 'Company' },
    ],
  },
  { name: 'company_name', label: 'Company Name', type: 'text' },
  { name: 'tax_id', label: 'Tax ID', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

const supplierFields: FormField[] = [
  { name: 'name', label: 'Supplier Name', type: 'text', required: true },
  { name: 'contact_person_name', label: 'Contact Name', type: 'text' },
  { name: 'contact_person_email', label: 'Contact Email', type: 'email' },
  { name: 'contact_person_phone', label: 'Contact Phone', type: 'text' },
  { name: 'company_address', label: 'Address', type: 'textarea' },
  { name: 'tax_id', label: 'Tax ID', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

const supplierProductFields: FormField[] = [
  { name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: [] },
  { name: 'productId', label: 'Product', type: 'select', required: true, options: [] },
  { name: 'sku', label: 'Supplier SKU', type: 'text', required: true },
  { name: 'price', label: 'Supplier Price', type: 'number', required: true },
]

const userFields: FormField[] = [
  { name: 'username', label: 'Username', type: 'text', required: true },
  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'sales', label: 'Sales' },
      { value: 'purchasing', label: 'Purchasing' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'manager', label: 'Manager' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  { name: 'password', label: 'Password', type: 'text', placeholder: 'Leave simple for demo import' },
]

const warehouseFields: FormField[] = [
  { name: 'name', label: 'Warehouse Name', type: 'text', required: true },
  { name: 'location_address', label: 'Address', type: 'textarea' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

const binLocationFields: FormField[] = [
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'bin_code', label: 'Bin Code', type: 'text', required: true },
  { name: 'name', label: 'Bin Name', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

const tabConfigs: Record<MasterTabId, TabConfig> = {
  categories: {
    id: 'categories',
    label: 'Categories',
    endpoint: '/product-categories',
    primaryLabel: 'New Category',
    title: 'Product Categories',
    createRecord: () => ({ name: '', parentName: '' }),
    fields: categoryFields,
    searchKeys: ['name', 'parentName'],
    getColumns: () => [
      { key: 'name', label: 'Category' },
      { key: 'parentName', label: 'Parent' },
    ],
  },
  products: {
    id: 'products',
    label: 'Products',
    endpoint: '/products',
    primaryLabel: 'New Product',
    title: 'Products',
    createRecord: () => ({
      sku: '',
      name: '',
      categoryName: '',
      uom: 'pcs',
      list_price: 0,
      cost_price: 0,
      warranty_period: 365,
      repair_fee: 0,
      status: 'active',
      description: '',
    }),
    fields: productFields,
    searchKeys: ['sku', 'name', 'description'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product' },
      { key: 'categoryName', label: 'Category' },
      { key: 'list_price', label: 'List Price', align: 'right' },
      { key: 'cost_price', label: 'Cost Price', align: 'right' },
      { key: 'status', label: 'Status' },
    ],
  },
  supplierProducts: {
    id: 'supplierProducts',
    label: 'Supplier Products',
    endpoint: '/supplier-products',
    primaryLabel: 'New Supplier Product',
    title: 'Supplier Products',
    createRecord: () => ({
      supplierId: '',
      productId: '',
      sku: '',
      price: 0,
    }),
    fields: supplierProductFields,
    searchKeys: ['supplierName', 'productName', 'sku'],
    getColumns: () => [
      { key: 'supplierName', label: 'Supplier' },
      { key: 'productName', label: 'Product' },
      { key: 'sku', label: 'Supplier SKU' },
      { key: 'price', label: 'Price', align: 'right' },
    ],
  },
  customers: {
    id: 'customers',
    label: 'Customers',
    endpoint: '/customers',
    primaryLabel: 'New Customer',
    title: 'Customers',
    createRecord: () => ({
      name: '',
      customer_type: 'individual',
      company_name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
    }),
    fields: customerFields,
    searchKeys: ['name', 'company_name', 'email', 'phone', 'tax_id'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'name', label: 'Customer' },
      { key: 'customer_type', label: 'Type' },
      { key: 'company_name', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
    ],
  },
  suppliers: {
    id: 'suppliers',
    label: 'Suppliers',
    endpoint: '/suppliers',
    primaryLabel: 'New Supplier',
    title: 'Suppliers',
    createRecord: () => ({
      name: '',
      contact_person_name: '',
      contact_person_email: '',
      contact_person_phone: '',
      company_address: '',
      tax_id: '',
      status: 'active',
    }),
    fields: supplierFields,
    searchKeys: ['name', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'tax_id'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'name', label: 'Supplier' },
      { key: 'contact_person_name', label: 'Contact' },
      { key: 'contact_person_email', label: 'Email' },
      { key: 'contact_person_phone', label: 'Phone' },
      { key: 'tax_id', label: 'Tax ID' },
      { key: 'status', label: 'Status' },
    ],
  },
  users: {
    id: 'users',
    label: 'Users',
    endpoint: '/users',
    primaryLabel: 'New User',
    title: 'Users',
    createRecord: () => ({
      username: '',
      fullName: '',
      email: '',
      role: 'sales',
      status: 'active',
      password: '123456',
    }),
    fields: userFields,
    searchKeys: ['username', 'fullName', 'email', 'role'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'username', label: 'Username' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
    ],
  },
  warehouses: {
    id: 'warehouses',
    label: 'Warehouses',
    endpoint: '/warehouse/warehouses',
    primaryLabel: 'New Warehouse',
    title: 'Warehouses',
    createRecord: () => ({
      name: '',
      location_address: '',
      status: 'active',
    }),
    fields: warehouseFields,
    searchKeys: ['name', 'location_address'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'name', label: 'Warehouse' },
      { key: 'location_address', label: 'Address' },
      { key: 'status', label: 'Status' },
    ],
  },
  binLocations: {
    id: 'binLocations',
    label: 'Bin Locations',
    endpoint: '/warehouse/bin-locations',
    primaryLabel: 'New Bin',
    title: 'Bin Locations',
    createRecord: () => ({
      warehouseName: '',
      bin_code: '',
      name: '',
      status: 'active',
    }),
    fields: binLocationFields,
    searchKeys: ['bin_code', 'name', 'warehouseName'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'warehouseName', label: 'Warehouse' },
      { key: 'bin_code', label: 'Bin Code' },
      { key: 'name', label: 'Bin Name' },
      { key: 'status', label: 'Status' },
    ],
  },
}

const renderValue = (key: string, value: any) => {
  if (key.toLowerCase().includes('price')) return formatCurrency(Number(value || 0))
  if (typeof value === 'number') return value.toLocaleString('en-US')
  return value || '-'
}

const MasterDataPage: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState<MasterTabId>('categories')
  const [datasets, setDatasets] = useState<Record<MasterTabId, any[]>>({
    categories: [],
    products: [],
    supplierProducts: [],
    customers: [],
    suppliers: [],
    users: [],
    warehouses: [],
    binLocations: [],
  })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalRecord, setModalRecord] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const config = tabConfigs[activeTab]
  const records = useMemo(() => {
    let data = datasets[activeTab]
    if (activeTab === 'categories') return [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (activeTab === 'products') {
      return [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    if (activeTab === 'supplierProducts') {
      return [...data].sort((a, b) => (`${a.supplierName || ''} ${a.productName || ''}`).localeCompare(`${b.supplierName || ''} ${b.productName || ''}`))
    }
    if (activeTab === 'customers' || activeTab === 'suppliers' || activeTab === 'users') {
      return [...data].sort((a, b) => (a.name || a.fullName || '').localeCompare(b.name || b.fullName || ''))
    }
    if (activeTab === 'warehouses') return [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (activeTab === 'binLocations') {
      return [...data].sort((a, b) => (a.bin_code || '').localeCompare(b.bin_code || ''))
    }
    return data
  }, [datasets, activeTab])

  // Dropdown options for foreign keys
  const categoryOptions = useMemo(
    () => datasets.categories.map((category) => ({ value: category.id, label: category.name })),
    [datasets.categories]
  )
  const parentCategoryOptions = useMemo(
    () => [
      { value: '', label: '-- No Parent --' },
      ...datasets.categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [datasets.categories]
  )
  const warehouseOptions = useMemo(
    () =>
      datasets.warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name || warehouse.warehouse_name,
      })),
    [datasets.warehouses]
  )
  const supplierOptions = useMemo(
    () => datasets.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name || supplier.supplier_name || supplier.supplierName })),
    [datasets.suppliers]
  )
  const productIdOptions = useMemo(
    () => datasets.products.map((product) => ({ value: product.id, label: `${product.name || product.product_name} (${product.sku})` })),
    [datasets.products]
  )
  const loadTab = async (tabId: MasterTabId) => {
    const tab = tabConfigs[tabId]
    const data = await erpApi.get<any[]>(tab.endpoint)
    setDatasets((current) => ({ ...current, [tabId]: data }))
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      await Promise.all((Object.keys(tabConfigs) as MasterTabId[]).map(loadTab))
      setLoadError(null)
    } catch (error: any) {
      setLoadError(error.message || 'Failed to load master data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setSearch('')
    setStatus('all')
    setViewMode('list')
  }, [activeTab])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const haystack = config.searchKeys
        .map((key) => String(record[key] ?? ''))
        .join(' ')
        .toLowerCase()
      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesStatus =
        !config.statusKey || status === 'all' || String(record[config.statusKey] || '').toLowerCase() === status.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [config.searchKeys, config.statusKey, records, search, status])

  const statuses = useMemo(() => {
    if (!config.statusKey) return []
    return Array.from(
      new Set(records.map((record) => String(record[config.statusKey!] || '')).filter(Boolean))
    )
  }, [config.statusKey, records])

  const modalFields = useMemo(() => {
    return config.fields.map((field) => {
      if (activeTab === 'products') {
        if (field.name === 'categoryName') return { ...field, type: 'select' as const, options: categoryOptions }
      }
      if (activeTab === 'supplierProducts') {
        if (field.name === 'supplierId') return { ...field, type: 'select' as const, options: supplierOptions }
        if (field.name === 'productId') return { ...field, type: 'select' as const, options: productIdOptions }
      }
      if (activeTab === 'categories' && field.name === 'parentName') {
        return { ...field, type: 'select' as const, options: parentCategoryOptions }
      }
      if (activeTab === 'binLocations') {
        if (field.name === 'warehouseName') return { ...field, type: 'select' as const, options: warehouseOptions }
      }
      return field
    })
  }, [activeTab, categoryOptions, warehouseOptions, parentCategoryOptions, supplierOptions, productIdOptions, config.fields])

  const openCreate = () => {
    setModalError(null)
    setModalRecord({ ...config.createRecord() })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setModalError(null)
    const recordCopy = { ...record }
    if (activeTab === 'binLocations') {
      recordCopy.warehouseName = record.warehouseName || record.warehouse?.name || record.warehouse_id || ''
    }
    if (activeTab === 'products') {
      recordCopy.uom = record.uom || 'pcs'
    }
    if (activeTab === 'supplierProducts') {
      recordCopy.supplierId = record.supplier_id || record.supplierId || ''
      recordCopy.productId = record.product_id || record.productId || ''
    }
    if (activeTab === 'categories') {
      recordCopy.parentName = record.parent_id || ''
    }
    setModalRecord(recordCopy)
    setModalOpen(true)
  }

  const handleSave = async (record: any) => {
    try {
      const recordToSave = { ...record }
      
      // Map FK fields to proper names for API
      if (activeTab === 'products') {
        recordToSave.category_id = categoryOptions.find(c => c.label === record.categoryName)?.value || record.categoryName
      }
      if (activeTab === 'supplierProducts') {
        recordToSave.supplier_id = record.supplierId
        recordToSave.product_id = record.productId
      }
      if (activeTab === 'binLocations') {
        const wh = warehouseOptions.find(w => w.label === record.warehouseName || w.value === record.warehouseName)
        recordToSave.warehouse_id = wh?.value || record.warehouseName
      }
      
      if (recordToSave.id) {
        await erpApi.put(`${config.endpoint}/${recordToSave.id}`, recordToSave)
      } else {
        await erpApi.post(config.endpoint, recordToSave)
      }
      await loadTab(activeTab)
      setModalError(null)
      setModalOpen(false)
      showNotification('success', `${config.title} saved successfully.`)
    } catch (error: any) {
      setModalError(error.message)
      return
    }
  }

  const handleDelete = async (record: any) => {
    const confirmed = window.confirm(`Delete ${record.name || record.fullName || record.binCode || 'this record'}?`)
    if (!confirmed) return
    try {
      await erpApi.delete(`${config.endpoint}/${record.id}`)
      await loadTab(activeTab)
      showNotification('success', `${config.label.slice(0, -1)} deleted.`)
    } catch (error: any) {
      showNotification('error', `Master Data delete failed: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Master Data"
        subtitle="Maintain the core ERP records for categories, products, customers, suppliers, users, warehouses, and bin locations."
        primaryLabel={config.primaryLabel}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load master data: {loadError}
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as MasterTabId)}
        tabs={(Object.keys(tabConfigs) as MasterTabId[]).map((tabId) => ({
          id: tabId,
          label: tabConfigs[tabId].label,
          count: datasets[tabId].length,
        }))}
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

      {loading ? (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Loading master data...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Database size={22} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No {config.title.toLowerCase()} yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create records here before importing or running transactions in Sales, Purchase, Inventory, and Accounting.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                {config.getColumns().map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-sm font-semibold text-gray-900 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {config.getColumns().map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${column.align === 'right' ? 'text-right font-medium text-gray-900' : 'text-gray-700'}`}
                    >
                      {column.key === 'status' ? <StatusBadge status={record[column.key]} /> : renderValue(column.key, record[column.key])}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <RecordActions onEdit={() => openEdit(record)} onDelete={() => handleDelete(record)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <KanbanBoard
          records={filteredRecords}
          groupBy={(record) => (config.statusKey ? record[config.statusKey] || 'unclassified' : 'records')}
          renderCard={(record) => (
            <div key={record.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">
                    {record.name || record.fullName || record.binCode || record.warehouseCode || record.sku}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.categoryName || record.customerNumber || record.supplierNumber || record.email || record.warehouseName || record.city || ''}
                  </p>
                </div>
                {config.statusKey ? <StatusBadge status={record[config.statusKey] || 'active'} /> : null}
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {config.getColumns().slice(0, 4).map((column) => (
                  column.key !== 'status' ? (
                    <p key={column.key}>
                      <span className="font-medium text-gray-700">{column.label}:</span> {renderValue(column.key, record[column.key])}
                    </p>
                  ) : null
                ))}
              </div>
              <div className="mt-3">
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => handleDelete(record)} />
              </div>
            </div>
          )}
        />
      )}

      <RecordModal
        isOpen={modalOpen}
        title={modalRecord?.id ? `Edit ${config.label}` : config.primaryLabel}
        record={modalRecord}
        fields={modalFields}
        errorMessage={modalError}
        onErrorClear={() => setModalError(null)}
        onClose={() => {
          setModalError(null)
          setModalOpen(false)
        }}
        onSave={handleSave}
      />
    </div>
  )
}

export default MasterDataPage


