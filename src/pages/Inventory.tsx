import React, { useEffect, useMemo, useState } from 'react'
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
} from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

const stockFieldsBase: FormField[] = [
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'productName', label: 'Product', type: 'select', required: true, options: [] },
  { name: 'binCode', label: 'Bin Location', type: 'select', options: [] },
  { name: 'quantity', label: 'On Hand', type: 'number', required: true },
  { name: 'reorderLevel', label: 'Reorder Level', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'low', label: 'Low' },
      { value: 'critical', label: 'Critical' },
    ],
  },
]

const movementFieldsBase: FormField[] = [
  { name: 'reference', label: 'Reference', type: 'text', required: true },
  { name: 'partnerName', label: 'Customer / Supplier', type: 'select', required: true, options: [] },
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'scheduledDate', label: 'Scheduled Date', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'ready', label: 'Ready' },
      { value: 'done', label: 'Done' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const countFieldsBase: FormField[] = [
  { name: 'reference', label: 'Count #', type: 'text', required: true },
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'binCode', label: 'Bin Location', type: 'select', required: true, options: [] },
  { name: 'countDate', label: 'Count Date', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'posted', label: 'Posted' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const flow: Record<string, string> = {
  draft: 'ready',
  ready: 'done',
}

const InventoryModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('stock')
  const [stock, setStock] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [counts, setCounts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [binLocations, setBinLocations] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/inventory/stock-levels?limit=100')
      .then((records) => {
        setLoadError(null)
        setStock(
          records.map((item) => ({
            ...item,
            warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
            productName: item.product?.name || item.product_id,
            quantity: item.quantity_on_hand || 0,
            reorderLevel: item.product?.reorder_level || 0,
            status: item.reorder_status || 'normal',
          }))
        )
      })
      .catch((error) => {
        setStock([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/delivery-orders?limit=100')
      .then((records) => {
        setLoadError(null)
        setDeliveries(records.map((item) => ({
          ...item,
          reference: item.delivery_order_number,
          partnerName: item.sales_order?.customer_id || 'Customer',
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          scheduledDate: item.scheduled_delivery_date,
        })))
      })
      .catch((error) => {
        setDeliveries([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/goods-receipts?limit=100')
      .then((records) => {
        setLoadError(null)
        setReceipts(records.map((item) => ({
          ...item,
          reference: item.goods_receipt_number,
          partnerName: item.purchase_order?.supplier_id || 'Supplier',
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          scheduledDate: item.received_date,
        })))
      })
      .catch((error) => {
        setReceipts([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/adjustments?limit=100')
      .then((records) => {
        setLoadError(null)
        setCounts(records.map((item) => ({
          ...item,
          reference: item.adjustment_number,
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          countDate: item.count_date,
          binCode: item.binCode || 'Multiple Bins',
        })))
      })
      .catch((error) => {
        setCounts([])
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/warehouse/warehouses'),
      erpApi.get<any[]>('/customers?limit=1000'),
      erpApi.get<any[]>('/suppliers?limit=1000'),
      erpApi.get<any[]>('/products?limit=1000'),
      erpApi.get<any[]>('/warehouse/bin-locations?limit=1000'),
    ])
      .then(([warehouseData, customerData, supplierData, productData, binData]) => {
        setWarehouses(warehouseData)
        setCustomers(customerData)
        setSuppliers(supplierData)
        setProducts(productData)
        setBinLocations(binData)
      })
      .catch(() => {
        setWarehouses([])
        setCustomers([])
        setSuppliers([])
        setProducts([])
        setBinLocations([])
      })
  }, [])

  const activeSetters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    stock: setStock,
    deliveries: setDeliveries,
    receipts: setReceipts,
    counts: setCounts,
  }
  const activeRecords = activeTab === 'stock' ? stock : activeTab === 'deliveries' ? deliveries : activeTab === 'receipts' ? receipts : counts
  const warehouseOptions = useMemo(
    () => warehouses.map((warehouse) => ({ value: warehouse.name, label: `${warehouse.name} (${warehouse.warehouseCode || warehouse.warehouse_code})` })),
    [warehouses]
  )
  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.name, label: `${product.name} (${product.sku})` })),
    [products]
  )
  const partnerOptions = useMemo(() => {
    const source = activeTab === 'deliveries' ? customers : suppliers
    return source.map((partner) => ({ value: partner.name, label: partner.name }))
  }, [activeTab, customers, suppliers])
  const filteredBinOptions = useMemo(() => {
    const selectedWarehouse = modalRecord?.warehouseName
    const source = selectedWarehouse
      ? binLocations.filter((bin) => bin.warehouseName === selectedWarehouse)
      : binLocations
    return source.map((bin) => ({ value: bin.binCode, label: `${bin.binCode} - ${bin.warehouseName}` }))
  }, [binLocations, modalRecord?.warehouseName])
  const activeFields = useMemo(() => {
    const source = activeTab === 'stock' ? stockFieldsBase : activeTab === 'counts' ? countFieldsBase : movementFieldsBase
    return source.map((field) => {
      if (field.name === 'warehouseName') return { ...field, options: warehouseOptions }
      if (field.name === 'productName') return { ...field, options: productOptions }
      if (field.name === 'partnerName') return { ...field, label: activeTab === 'deliveries' ? 'Customer' : 'Supplier', options: partnerOptions }
      if (field.name === 'binCode') return { ...field, options: filteredBinOptions }
      return field
    })
  }, [activeTab, warehouseOptions, productOptions, partnerOptions, filteredBinOptions])
  const activeTitle = activeTab === 'stock' ? 'Stock Item' : activeTab === 'deliveries' ? 'Delivery Order' : activeTab === 'receipts' ? 'Goods Receipt' : 'Stock Count'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.reference || record.productName} ${record.partnerName || ''} ${record.warehouseName} ${record.binCode || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      reference: `${activeTab.toUpperCase()}-${Date.now().toString().slice(-5)}`,
      warehouseName: '',
      productName: '',
      partnerName: '',
      binCode: '',
      quantity: 0,
      reorderLevel: 0,
      status: activeTab === 'stock' ? 'normal' : 'draft',
      scheduledDate: new Date().toISOString().slice(0, 10),
      countDate: new Date().toISOString().slice(0, 10),
    })
    setModalOpen(true)
  }

  const saveRecord = async (record: any) => {
    const path = activeTab === 'deliveries'
      ? '/inventory/delivery-orders'
      : activeTab === 'receipts'
        ? '/inventory/goods-receipts'
        : activeTab === 'counts'
          ? '/inventory/adjustments'
          : '/inventory/stock-levels'

    try {
      if (activeTab !== 'stock') {
        await erpApi.post(path, record)
      }
    } catch (error: any) {
      showNotification('error', `Inventory save failed: ${error.message}`)
      return
    }
    activeSetters[activeTab]((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const advanceRecord = (record: any) => {
    const nextStatus = activeTab === 'counts' && record.status === 'draft' ? 'posted' : flow[record.status]
    if (!nextStatus) return
    activeSetters[activeTab]((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
  }

  const renderActions = (record: any) => (
    <RecordActions
      onEdit={() => {
        setModalRecord(record)
        setModalOpen(true)
      }}
      onDelete={() => activeSetters[activeTab]((current) => current.filter((item) => item.id !== record.id))}
      onAdvance={(activeTab !== 'stock' && (flow[record.status] || (activeTab === 'counts' && record.status === 'draft'))) ? () => advanceRecord(record) : undefined}
      advanceLabel={activeTab === 'counts' ? 'Post' : 'Validate'}
    />
  )

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Inventory"
        subtitle="Control stock by warehouse, bin, delivery, receipt, and stock count."
        primaryLabel={`New ${activeTitle}`}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load inventory data from backend: {loadError}
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
          { id: 'stock', label: 'Stock Levels', count: stock.length },
          { id: 'deliveries', label: 'Delivery Orders', count: deliveries.length },
          { id: 'receipts', label: 'Goods Receipts', count: receipts.length },
          { id: 'counts', label: 'Stock Counts', count: counts.length },
        ]}
      />

      <ActionToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statuses={Array.from(new Set(activeRecords.map((record) => record.status)))}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reference / Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Warehouse</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Partner / Bin</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.reference || record.productName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.warehouseName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.partnerName || record.binCode}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{record.quantity ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
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
              <p className="font-bold text-gray-900">{record.reference || record.productName}</p>
              <p className="mt-1 text-sm text-gray-600">{record.warehouseName}</p>
              <p className="mt-2 text-sm text-gray-600">{record.partnerName || record.binCode}</p>
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      <RecordModal
        isOpen={modalOpen}
        title={`${modalRecord && activeRecords.some((item) => item.id === modalRecord.id) ? 'Edit' : 'Create'} ${activeTitle}`}
        record={modalRecord}
        fields={activeFields}
        onClose={() => setModalOpen(false)}
        onSave={saveRecord}
      />
    </div>
  )
}

export default InventoryModule
