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
  { name: 'displayOrder', label: 'Display Order', type: 'number' },
  {
    name: 'isActive',
    label: 'Active',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const productFields: FormField[] = [
  { name: 'sku', label: 'SKU', type: 'text', required: true },
  { name: 'name', label: 'Product Name', type: 'text', required: true },
  { name: 'categoryName', label: 'Category', type: 'select', required: true, options: [] },
  { name: 'uomName', label: 'Unit of Measure', type: 'select', options: [] },
  { name: 'barcode', label: 'Barcode', type: 'text' },
  { name: 'image_url', label: 'Image URL', type: 'text' },
  { name: 'list_price', label: 'List Price', type: 'number', required: true },
  { name: 'cost_price', label: 'Cost Price', type: 'number', required: true },
  // NOTE: profit_margin_percent is GENERATED ALWAYS in database - do NOT include in form
  { name: 'reorder_level', label: 'Reorder Level', type: 'number' },
  { name: 'reorder_quantity', label: 'Reorder Qty', type: 'number' },
  { name: 'supplier_lead_time_days', label: 'Supplier Lead Time (days)', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'discontinued', label: 'Discontinued' },
      { value: 'prototype', label: 'Prototype' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const customerFields: FormField[] = [
  { name: 'customer_number', label: 'Customer Number', type: 'text' },
  { name: 'name', label: 'Customer Name', type: 'text', required: true },
  {
    name: 'customer_type',
    label: 'Customer Type',
    type: 'select',
    required: true,
    options: [
      { value: 'B2B', label: 'B2B' },
      { value: 'B2C', label: 'B2C' },
    ],
  },
  { name: 'company_tax_id', label: 'Tax ID', type: 'text' },
  { name: 'contact_person_name', label: 'Contact Name', type: 'text' },
  { name: 'contact_person_email', label: 'Contact Email', type: 'email' },
  { name: 'contact_person_phone', label: 'Contact Phone', type: 'text' },
  { name: 'billing_address', label: 'Billing Address', type: 'textarea' },
  { name: 'shipping_address', label: 'Shipping Address', type: 'textarea' },
  {
    name: 'shipping_same_as_billing',
    label: 'Same as Billing',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  { name: 'credit_limit', label: 'Credit Limit', type: 'number' },
  // NOTE: credit_used is AUTO-CALCULATED from customer_invoices - do NOT include in form
  {
    name: 'payment_terms',
    label: 'Payment Terms',
    type: 'select',
    options: [
      { value: 'NET30', label: 'NET30' },
      { value: 'NET45', label: 'NET45' },
      { value: 'NET60', label: 'NET60' },
      { value: 'COD', label: 'COD' },
      { value: 'Prepaid', label: 'Prepaid' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'blocked', label: 'Blocked' },
    ],
  },
]

const supplierFields: FormField[] = [
  { name: 'supplier_number', label: 'Supplier Number', type: 'text' },
  { name: 'name', label: 'Supplier Name', type: 'text', required: true },
  { name: 'company_tax_id', label: 'Tax ID', type: 'text' },
  {
    name: 'supplierType',
    label: 'Supplier Type',
    type: 'select',
    required: true,
    options: [
      { value: 'equipment', label: 'Equipment & Product Suppliers' },
      { value: 'components', label: 'Component & Part Suppliers' },
      { value: 'logistics', label: 'Logistics & Transportation' },
      { value: 'services', label: 'Service Providers' },
      { value: 'maintenance', label: 'Maintenance & Repair Services' },
    ],
  },
  { name: 'contact_person_name', label: 'Contact Name', type: 'text' },
  { name: 'contact_person_email', label: 'Contact Email', type: 'email' },
  { name: 'contact_person_phone', label: 'Contact Phone', type: 'text' },
  { name: 'company_address', label: 'Company Address', type: 'textarea' },
  { name: 'company_city', label: 'Company City', type: 'text' },
  { name: 'company_province', label: 'Company Province', type: 'text' },
  { name: 'company_postal_code', label: 'Postal Code', type: 'text' },
  { name: 'company_website', label: 'Website', type: 'text' },
  // NOTE: logo_url is NOT user input - optional field
  {
    name: 'payment_terms',
    label: 'Payment Terms',
    type: 'select',
    options: [
      { value: 'NET30', label: 'NET30' },
      { value: 'NET45', label: 'NET45' },
      { value: 'NET60', label: 'NET60' },
      { value: 'COD', label: 'COD' },
      { value: 'Prepaid', label: 'Prepaid' },
    ],
  },
  { name: 'average_lead_time_days', label: 'Lead Time Days', type: 'number' },
  { name: 'quality_rating', label: 'Quality Rating (0-5)', type: 'number' },
  {
    name: 'is_preferred',
    label: 'Preferred Supplier',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  // NOTE: total_spent is AUTO-CALCULATED from vendor_bills - do NOT include in form
  // NOTE: average_response_time_hours is AUTO-CALCULATED from rfq_supplier_quotations - do NOT include in form
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'blocked', label: 'Blocked' },
    ],
  },
]

const userFields: FormField[] = [
  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'departmentName', label: 'Department', type: 'select', options: [] },
  { name: 'avatarUrl', label: 'Avatar URL', type: 'text' },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: [
      { value: 'CEO', label: 'CEO' },
      { value: 'Sales_Manager', label: 'Sales Manager' },
      { value: 'Purchasing_Manager', label: 'Purchasing Manager' },
      { value: 'Warehouse_Manager', label: 'Warehouse Manager' },
      { value: 'Accountant', label: 'Chief Accountant' },
      { value: 'Admin', label: 'Admin' },
      { value: 'user', label: 'User' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'suspended', label: 'Suspended' },
    ],
  },
  { name: 'password', label: 'Password', type: 'text', placeholder: 'Leave simple for demo import' },
]

const warehouseFields: FormField[] = [
  { name: 'warehouse_code', label: 'Warehouse Code', type: 'text', required: true },
  { name: 'name', label: 'Warehouse Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'location_address', label: 'Location Address', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'province', label: 'Province', type: 'text' },
  { name: 'postal_code', label: 'Postal Code', type: 'text' },
  { name: 'managerName', label: 'Warehouse Manager', type: 'select', options: [] },
  { name: 'capacity_sqm', label: 'Capacity (sqm)', type: 'number' },
  // NOTE: current_occupancy_sqm is AUTO-CALCULATED by trigger from bin_locations - do NOT include in form
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'closed', label: 'Closed' },
    ],
  },
]

const binLocationFields: FormField[] = [
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'bin_code', label: 'Bin Code', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'capacity_units', label: 'Capacity Units', type: 'number' },
  // NOTE: current_occupancy_units is AUTO-CALCULATED by trigger from stock_in_bins - do NOT include in form
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'reserve', label: 'Reserve' },
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
    createRecord: () => ({ name: '', parentName: '', displayOrder: 0, isActive: 'true', description: '' }),
    fields: categoryFields,
    searchKeys: ['name', 'description'],
    getColumns: () => [
      { key: 'name', label: 'Category' },
      { key: 'parentName', label: 'Parent' },
      { key: 'displayOrder', label: 'Display Order', align: 'right' },
      { key: 'isActive', label: 'Active' },
      { key: 'description', label: 'Description' },
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
      uomName: '',
      barcode: '',
      image_url: '',
      list_price: 0,
      cost_price: 0,
      reorder_level: 10,
      reorder_quantity: 50,
      supplier_lead_time_days: 7,
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
  customers: {
    id: 'customers',
    label: 'Customers',
    endpoint: '/customers',
    primaryLabel: 'New Customer',
    title: 'Customers',
    createRecord: () => ({
      customer_number: '',
      name: '',
      customer_type: 'B2C',
      company_tax_id: '',
      contact_person_name: '',
      contact_person_email: '',
      contact_person_phone: '',
      billing_address: '',
      shipping_address: '',
      shipping_same_as_billing: 'true',
      credit_limit: 0,
      payment_terms: 'NET30',
      status: 'active',
    }),
    fields: customerFields,
    searchKeys: ['customer_number', 'name', 'contact_person_name', 'contact_person_email', 'contact_person_phone'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'customer_number', label: 'Customer No.' },
      { key: 'name', label: 'Customer' },
      { key: 'customer_type', label: 'Type' },
      { key: 'contact_person_name', label: 'Contact' },
      { key: 'contact_person_email', label: 'Email' },
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
      supplier_number: '',
      name: '',
      company_tax_id: '',
      supplier_type_id: '',
      contact_person_name: '',
      contact_person_email: '',
      contact_person_phone: '',
      company_address: '',
      company_city: '',
      company_province: '',
      company_postal_code: '',
      company_website: '',
      payment_terms: 'NET30',
      average_lead_time_days: 7,
      quality_rating: 5,
      is_preferred: 'false',
      status: 'active',
    }),
    fields: supplierFields,
    searchKeys: ['supplier_number', 'name', 'contact_person_name', 'contact_person_email', 'contact_person_phone'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'supplier_number', label: 'Supplier No.' },
      { key: 'name', label: 'Supplier' },
      { key: 'contact_person_name', label: 'Contact' },
      { key: 'contact_person_phone', label: 'Phone' },
      { key: 'company_city', label: 'City' },
      { key: 'average_lead_time_days', label: 'Lead Days', align: 'right' },
      { key: 'is_preferred', label: 'Preferred' },
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
      fullName: '',
      email: '',
      phone: '',
      departmentName: '',
      avatarUrl: '',
      role: 'user',
      status: 'active',
      password: '123456',
    }),
    fields: userFields,
    searchKeys: ['fullName', 'email', 'phone', 'role'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'departmentName', label: 'Department' },
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
      warehouse_code: '',
      name: '',
      description: '',
      location_address: '',
      city: '',
      province: '',
      postal_code: '',
      managerName: '',
      capacity_sqm: 0,
      status: 'active',
    }),
    fields: warehouseFields,
    searchKeys: ['warehouse_code', 'name', 'city', 'province', 'location_address'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'warehouse_code', label: 'Code' },
      { key: 'name', label: 'Warehouse' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'managerName', label: 'Manager' },
      { key: 'capacity_sqm', label: 'Capacity (sqm)', align: 'right' },
      { key: 'current_occupancy_sqm', label: 'Occupancy (sqm)', align: 'right' },
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
      description: '',
      capacity_units: 0,
      status: 'active',
    }),
    fields: binLocationFields,
    searchKeys: ['bin_code', 'description'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'warehouseName', label: 'Warehouse' },
      { key: 'bin_code', label: 'Bin Code' },
      { key: 'description', label: 'Description' },
      { key: 'capacity_units', label: 'Capacity', align: 'right' },
      { key: 'current_occupancy_units', label: 'Occupancy', align: 'right' },
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
    customers: [],
    suppliers: [],
    users: [],
    warehouses: [],
    binLocations: [],
    unitsOfMeasure: [],
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
    if (activeTab === 'categories') {
      return [...datasets.categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    }
    return datasets[activeTab]
  }, [datasets, activeTab])

  // Dropdown options for foreign keys
  const categoryOptions = useMemo(
    () => datasets.categories.map((category) => ({ value: category.id, label: category.name })),
    [datasets.categories]
  )
  const [supplierTypes, setSupplierTypes] = useState<any[]>([])

  const supplierTypeOptions = useMemo(
    () => supplierTypes.map((type: any) => ({ value: type.id, label: type.name })),
    [supplierTypes]
  )
  const parentCategoryOptions = useMemo(
    () => [
      { value: '', label: '-- No Parent --' },
      ...datasets.categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [datasets.categories]
  )
  const uomOptions = useMemo(
    () => datasets.unitsOfMeasure?.map((uom: any) => ({ value: uom.name, label: uom.name })) || [],
    [datasets.unitsOfMeasure]
  )
  const warehouseOptions = useMemo(
    () =>
      datasets.warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.name} (${warehouse.warehouse_code})`,
        name: warehouse.name,
      })),
    [datasets.warehouses]
  )
  const userOptions = useMemo(
    () =>
      datasets.users.map((user) => ({
        value: user.id,
        label: `${user.full_name || user.fullName} (${user.role || user.email})`,
        name: user.full_name || user.fullName,
      })),
    [datasets.users]
  )
  const departmentOptions = useMemo(() => {
    const depts = new Set(datasets.users.map((u: any) => u.department).filter(Boolean))
    return [{ value: '', label: '-- Select Department --' }, ...Array.from(depts).map((d: any) => ({ value: d, label: d }))]
  }, [datasets.users])

  const loadTab = async (tabId: MasterTabId) => {
    const tab = tabConfigs[tabId]
    const data = await erpApi.get<any[]>(tab.endpoint)
    setDatasets((current) => ({ ...current, [tabId]: data }))
  }

  const loadUnitsOfMeasure = async () => {
    try {
      const data = await erpApi.get<any[]>('/units-of-measure')
      setDatasets((current) => ({ ...current, unitsOfMeasure: data }))
    } catch (e) {
      // Silently fail if endpoint doesn't exist
    }
  }

  const loadSupplierTypes = async () => {
    try {
      const data = await erpApi.get<any[]>('/supplier-types')
      setSupplierTypes(data)
    } catch (e) {
      // Silently fail if endpoint doesn't exist
    }
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
    loadUnitsOfMeasure()
    loadSupplierTypes()
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
        if (field.name === 'uomName') return { ...field, type: 'select' as const, options: uomOptions }
      }
      if (activeTab === 'categories' && field.name === 'parentName') {
        return { ...field, type: 'select' as const, options: parentCategoryOptions }
      }
      if (activeTab === 'binLocations') {
        if (field.name === 'warehouseName') return { ...field, type: 'select' as const, options: warehouseOptions }
      }
      if (activeTab === 'warehouses') {
        if (field.name === 'managerName') return { ...field, type: 'select' as const, options: userOptions }
      }
      if (activeTab === 'suppliers') {
        if (field.name === 'supplierType') return { ...field, type: 'select' as const, options: supplierTypeOptions }
      }
      if (activeTab === 'users' && field.name === 'departmentName') {
        return { ...field, type: 'select' as const, options: departmentOptions }
      }
      return field
    })
  }, [activeTab, categoryOptions, uomOptions, warehouseOptions, userOptions, departmentOptions, parentCategoryOptions, supplierTypeOptions, config.fields])

  const openCreate = () => {
    setModalError(null)
    setModalRecord({ ...config.createRecord() })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setModalError(null)
    const recordCopy = { ...record }
    if (activeTab === 'binLocations') {
      recordCopy.warehouseName = record.warehouse_id || record.warehouseName || ''
    }
    if (activeTab === 'products') {
      recordCopy.categoryName = record.category_id || record.category?.id || record.category?.name || ''
      recordCopy.uomName = record.uom_id || record.uom?.id || record.uom?.name || ''
    }
    if (activeTab === 'warehouses') {
      recordCopy.managerName = record.manager_id || record.manager?.id || record.manager?.full_name || ''
    }
    if (activeTab === 'categories') {
      recordCopy.parentName = record.parent_id || ''
    }
    if (activeTab === 'customers') {
      recordCopy.shipping_same_as_billing = record.shipping_same_as_billing !== undefined ? String(record.shipping_same_as_billing) : 'true'
    }
    if (activeTab === 'suppliers') {
      recordCopy.is_preferred = record.is_preferred !== undefined ? String(record.is_preferred) : 'false'
      recordCopy.supplierType = record.supplier_type_id || ''
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
        recordToSave.uom_id = uomOptions.find(u => u.label === record.uomName)?.value || record.uomName
      }
      if (activeTab === 'binLocations') {
        recordToSave.warehouse_id = warehouseOptions.find(w => w.label === record.warehouseName)?.value || record.warehouseName
      }
      if (activeTab === 'warehouses') {
        recordToSave.manager_id = userOptions.find(u => u.label === record.managerName)?.value || record.managerName
      }
      if (activeTab === 'customers') {
        recordToSave.shipping_same_as_billing = record.shipping_same_as_billing === true || record.shipping_same_as_billing === 'true'
      }
      if (activeTab === 'suppliers') {
        recordToSave.is_preferred = record.is_preferred === true || record.is_preferred === 'true'
        recordToSave.supplier_type_id = supplierTypeOptions.find(s => s.value === record.supplierType)?.value || record.supplierType
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
