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
  { name: 'imageUrl', label: 'Image URL', type: 'text' },
  { name: 'listPrice', label: 'List Price', type: 'number', required: true },
  { name: 'costPrice', label: 'Cost Price', type: 'number', required: true },
  { name: 'weightKg', label: 'Weight (kg)', type: 'number' },
  { name: 'supplierLeadTimeDays', label: 'Supplier Lead Time (days)', type: 'number' },
  { name: 'reorderLevel', label: 'Reorder Level', type: 'number' },
  { name: 'reorderQuantity', label: 'Reorder Qty', type: 'number' },
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
  { name: 'customerNumber', label: 'Customer Number', type: 'text' },
  { name: 'name', label: 'Customer Name', type: 'text', required: true },
  {
    name: 'customerType',
    label: 'Customer Type',
    type: 'select',
    required: true,
    options: [
      { value: 'B2B', label: 'B2B' },
      { value: 'B2C', label: 'B2C' },
    ],
  },
  { name: 'companyTaxId', label: 'Tax ID', type: 'text' },
  { name: 'contactName', label: 'Contact Name', type: 'text' },
  { name: 'contactEmail', label: 'Contact Email', type: 'email' },
  { name: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { name: 'billingAddress', label: 'Billing Address', type: 'textarea' },
  { name: 'billingCity', label: 'Billing City', type: 'text' },
  { name: 'billingProvince', label: 'Billing Province', type: 'text' },
  { name: 'billingPostalCode', label: 'Billing Postal Code', type: 'text' },
  { name: 'shippingAddress', label: 'Shipping Address', type: 'textarea' },
  {
    name: 'shippingSameAsBilling',
    label: 'Same as Billing',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
  {
    name: 'paymentTerms',
    label: 'Payment Terms',
    type: 'select',
    options: [
      { value: 'NET30', label: 'NET30' },
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
  { name: 'supplierNumber', label: 'Supplier Number', type: 'text' },
  { name: 'name', label: 'Supplier Name', type: 'text', required: true },
  { name: 'companyTaxId', label: 'Tax ID', type: 'text' },
  {
    name: 'supplierTypeId',
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
  { name: 'contactName', label: 'Contact Name', type: 'text' },
  { name: 'contactEmail', label: 'Contact Email', type: 'email' },
  { name: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { name: 'companyAddress', label: 'Company Address', type: 'textarea' },
  { name: 'companyCity', label: 'Company City', type: 'text' },
  { name: 'companyProvince', label: 'Company Province', type: 'text' },
  { name: 'companyPostalCode', label: 'Postal Code', type: 'text' },
  { name: 'companyWebsite', label: 'Website', type: 'text' },
  {
    name: 'paymentTerms',
    label: 'Payment Terms',
    type: 'select',
    options: [
      { value: 'NET30', label: 'NET30' },
      { value: 'NET60', label: 'NET60' },
      { value: 'COD', label: 'COD' },
      { value: 'Prepaid', label: 'Prepaid' },
    ],
  },
  { name: 'averageLeadTimeDays', label: 'Lead Time Days', type: 'number' },
  { name: 'qualityRating', label: 'Quality Rating (0-5)', type: 'number' },
  {
    name: 'isPreferred',
    label: 'Preferred Supplier',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
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
  { name: 'warehouseCode', label: 'Warehouse Code', type: 'text', required: true },
  { name: 'name', label: 'Warehouse Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'locationAddress', label: 'Location Address', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'province', label: 'Province', type: 'text' },
  { name: 'postalCode', label: 'Postal Code', type: 'text' },
  { name: 'managerName', label: 'Warehouse Manager', type: 'select', options: [] },
  { name: 'capacitySqm', label: 'Capacity (sqm)', type: 'number' },
  { name: 'currentOccupancySqm', label: 'Current Occupancy (sqm)', type: 'number' },
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
  { name: 'binCode', label: 'Bin Code', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'capacityUnits', label: 'Capacity Units', type: 'number' },
  { name: 'currentOccupancyUnits', label: 'Current Occupancy', type: 'number' },
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
      imageUrl: '',
      listPrice: 0,
      costPrice: 0,
      weightKg: 0,
      supplierLeadTimeDays: 7,
      reorderLevel: 10,
      reorderQuantity: 50,
      status: 'active',
      description: '',
    }),
    fields: productFields,
    searchKeys: ['sku', 'name', 'categoryName', 'description'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product' },
      { key: 'categoryName', label: 'Category' },
      { key: 'listPrice', label: 'List Price', align: 'right' },
      { key: 'costPrice', label: 'Cost Price', align: 'right' },
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
      customerNumber: '',
      name: '',
      customerType: 'B2C',
      companyTaxId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
      billingCity: '',
      billingProvince: '',
      billingPostalCode: '',
      shippingAddress: '',
      shippingSameAsBilling: 'true',
      creditLimit: 0,
      paymentTerms: 'NET30',
      status: 'active',
    }),
    fields: customerFields,
    searchKeys: ['customerNumber', 'name', 'contactName', 'contactEmail', 'contactPhone'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'customerNumber', label: 'Customer No.' },
      { key: 'name', label: 'Customer' },
      { key: 'customerType', label: 'Type' },
      { key: 'contactName', label: 'Contact' },
      { key: 'contactEmail', label: 'Email' },
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
      supplierNumber: '',
      name: '',
      companyTaxId: '',
      supplierTypeId: 'equipment',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      companyAddress: '',
      companyCity: '',
      companyProvince: '',
      companyPostalCode: '',
      companyWebsite: '',
      paymentTerms: 'NET30',
      averageLeadTimeDays: 7,
      qualityRating: 3,
      isPreferred: 'false',
      status: 'active',
    }),
    fields: supplierFields,
    searchKeys: ['supplierNumber', 'name', 'contactName', 'contactEmail', 'contactPhone'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'supplierNumber', label: 'Supplier No.' },
      { key: 'name', label: 'Supplier' },
      { key: 'contactName', label: 'Contact' },
      { key: 'contactPhone', label: 'Phone' },
      { key: 'companyCity', label: 'City' },
      { key: 'averageLeadTimeDays', label: 'Lead Days', align: 'right' },
      { key: 'isPreferred', label: 'Preferred' },
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
      warehouseCode: '',
      name: '',
      description: '',
      locationAddress: '',
      city: '',
      province: '',
      postalCode: '',
      managerName: '',
      capacitySqm: 0,
      currentOccupancySqm: 0,
      status: 'active',
    }),
    fields: warehouseFields,
    searchKeys: ['warehouseCode', 'name', 'city', 'province', 'locationAddress'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'warehouseCode', label: 'Code' },
      { key: 'name', label: 'Warehouse' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'managerName', label: 'Manager' },
      { key: 'capacitySqm', label: 'Capacity (sqm)', align: 'right' },
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
      binCode: '',
      description: '',
      capacityUnits: 0,
      currentOccupancyUnits: 0,
      status: 'active',
    }),
    fields: binLocationFields,
    searchKeys: ['warehouseName', 'binCode', 'description'],
    statusKey: 'status',
    getColumns: () => [
      { key: 'warehouseName', label: 'Warehouse' },
      { key: 'binCode', label: 'Bin Code' },
      { key: 'description', label: 'Description' },
      { key: 'capacityUnits', label: 'Capacity', align: 'right' },
      { key: 'currentOccupancyUnits', label: 'Occupancy', align: 'right' },
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
    () => datasets.categories.map((category) => ({ value: category.name, label: category.name })),
    [datasets.categories]
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
        label: `${warehouse.name} (${warehouse.warehouseCode || warehouse.warehouse_code})`,
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
      if (activeTab === 'warehouses' && field.name === 'managerName') {
        return { ...field, type: 'select' as const, options: userOptions }
      }
      if (activeTab === 'users' && field.name === 'departmentName') {
        return { ...field, type: 'select' as const, options: departmentOptions }
      }
      return field
    })
  }, [activeTab, categoryOptions, uomOptions, warehouseOptions, userOptions, departmentOptions, parentCategoryOptions, config.fields])

  const openCreate = () => {
    setModalError(null)
    setModalRecord({ ...config.createRecord() })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setModalError(null)
    const recordCopy = { ...record }
    if (activeTab === 'binLocations') {
      recordCopy.warehouseName = record.warehouse_id || ''
    }
    if (activeTab === 'products') {
      recordCopy.categoryName = record.category?.name || record.categoryName || ''
      recordCopy.uomName = record.uom?.name || record.uomName || ''
    }
    if (activeTab === 'warehouses') {
      recordCopy.managerName = record.manager?.full_name || record.managerName || record.manager_id || ''
    }
    if (activeTab === 'categories') {
      recordCopy.parentName = record.parent_id || ''
      recordCopy.isActive = record.is_active !== undefined ? String(record.is_active) : 'true'
    }
    if (activeTab === 'customers') {
      recordCopy.shippingSameAsBilling = record.shipping_same_as_billing !== undefined ? String(record.shipping_same_as_billing) : 'true'
    }
    if (activeTab === 'suppliers') {
      recordCopy.isPreferred = record.is_preferred !== undefined ? String(record.is_preferred) : 'false'
    }
    setModalRecord(recordCopy)
    setModalOpen(true)
  }

  const handleSave = async (record: any) => {
    try {
      const recordToSave = { ...record }
      if (activeTab === 'binLocations') {
        recordToSave.warehouseName = warehouseOptions.find(w => w.value === record.warehouseName)?.name || record.warehouseName
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
