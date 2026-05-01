import React, { useEffect, useMemo, useState } from 'react'
import * as mockData from '../services/mockData'
import { usePersistentState } from '../hooks/usePersistentState'
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

const stockFields: FormField[] = [
  { name: 'warehouseName', label: 'Warehouse', type: 'text', required: true },
  { name: 'productName', label: 'Product', type: 'text', required: true },
  { name: 'binCode', label: 'Bin Location', type: 'text' },
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

const movementFields: FormField[] = [
  { name: 'reference', label: 'Reference', type: 'text', required: true },
  { name: 'partnerName', label: 'Customer / Supplier', type: 'text', required: true },
  { name: 'warehouseName', label: 'Warehouse', type: 'text', required: true },
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

const countFields: FormField[] = [
  { name: 'reference', label: 'Count #', type: 'text', required: true },
  { name: 'warehouseName', label: 'Warehouse', type: 'text', required: true },
  { name: 'binCode', label: 'Bin Location', type: 'text', required: true },
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

const deliveryOrders = [
  { id: 'do-1', reference: 'DO-2024-001', partnerName: 'TechCorp Vietnam', warehouseName: 'Kho Tong Mien Nam', scheduledDate: '2024-03-20', status: 'ready' },
  { id: 'do-2', reference: 'DO-2024-002', partnerName: 'Global Solutions', warehouseName: 'Kho Tong Mien Bac', scheduledDate: '2024-03-22', status: 'draft' },
]

const goodsReceipts = [
  { id: 'gr-1', reference: 'GR-2024-001', partnerName: 'Vietnam Tech Supplier', warehouseName: 'Kho Tong Mien Nam', scheduledDate: '2024-03-18', status: 'done' },
  { id: 'gr-2', reference: 'GR-2024-002', partnerName: 'International Components', warehouseName: 'Kho Lap dat & Bao hanh', scheduledDate: '2024-03-23', status: 'ready' },
]

const stockCounts = [
  { id: 'cnt-1', reference: 'CNT-2024-001', warehouseName: 'Kho Tong Mien Nam', binCode: 'A1', countDate: '2024-03-28', status: 'draft' },
  { id: 'cnt-2', reference: 'CNT-2024-002', warehouseName: 'Kho Tong Mien Bac', binCode: 'B4', countDate: '2024-03-29', status: 'posted' },
]

const flow: Record<string, string> = {
  draft: 'ready',
  ready: 'done',
}

const InventoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stock')
  const [stock, setStock] = usePersistentState<any[]>('novatech.inventory.stock', mockData.mockInventoryItems.map((item, index) => ({ ...item, binCode: index === 0 ? 'A1' : index === 1 ? 'B2' : 'C3' })))
  const [deliveries, setDeliveries] = usePersistentState<any[]>('novatech.inventory.deliveries', deliveryOrders)
  const [receipts, setReceipts] = usePersistentState<any[]>('novatech.inventory.receipts', goodsReceipts)
  const [counts, setCounts] = usePersistentState<any[]>('novatech.inventory.counts', stockCounts)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/inventory/stock-levels?limit=100')
      .then((records) => {
        if (!records.length) return
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
      .catch((error) => console.warn('Stock API load failed, keeping local data:', error.message))

    erpApi
      .get<any[]>('/inventory/delivery-orders?limit=100')
      .then((records) => {
        if (!records.length) return
        setDeliveries(records.map((item) => ({
          ...item,
          reference: item.delivery_order_number,
          partnerName: item.sales_order?.customer_id || 'Customer',
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          scheduledDate: item.scheduled_delivery_date,
        })))
      })
      .catch((error) => console.warn('Delivery API load failed, keeping local data:', error.message))

    erpApi
      .get<any[]>('/inventory/goods-receipts?limit=100')
      .then((records) => {
        if (!records.length) return
        setReceipts(records.map((item) => ({
          ...item,
          reference: item.goods_receipt_number,
          partnerName: item.purchase_order?.supplier_id || 'Supplier',
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          scheduledDate: item.received_date,
        })))
      })
      .catch((error) => console.warn('Goods receipt API load failed, keeping local data:', error.message))

    erpApi
      .get<any[]>('/inventory/adjustments?limit=100')
      .then((records) => {
        if (!records.length) return
        setCounts(records.map((item) => ({
          ...item,
          reference: item.adjustment_number,
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          countDate: item.adjustment_date,
          binCode: item.binCode || 'Multiple Bins',
        })))
      })
      .catch((error) => console.warn('Inventory adjustment API load failed, keeping local data:', error.message))
  }, [setCounts, setDeliveries, setReceipts, setStock])

  const activeSetters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    stock: setStock,
    deliveries: setDeliveries,
    receipts: setReceipts,
    counts: setCounts,
  }
  const activeRecords = activeTab === 'stock' ? stock : activeTab === 'deliveries' ? deliveries : activeTab === 'receipts' ? receipts : counts
  const activeFields = activeTab === 'stock' ? stockFields : activeTab === 'counts' ? countFields : movementFields
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
      console.warn('Inventory API save failed, saving locally:', error.message)
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
