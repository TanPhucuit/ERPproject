import React, { useEffect, useMemo, useState } from 'react'
import * as mockData from '../services/mockData'
import { usePersistentState } from '../hooks/usePersistentState'
import { erpApi } from '../services/erpApi'
import {
  ActionToolbar,
  formatCurrency,
  FormField,
  KanbanBoard,
  ModuleHeader,
  ModuleTabs,
  RecordActions,
  RecordModal,
  StatusBadge,
  ViewMode,
} from '../components/OdooLite'

const poFields: FormField[] = [
  { name: 'poNumber', label: 'PO #', type: 'text', required: true },
  { name: 'supplierName', label: 'Supplier', type: 'text', required: true },
  { name: 'date', label: 'PO Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Expected Delivery', type: 'date' },
  { name: 'total', label: 'Total', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'received', label: 'Received' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const rfqFields: FormField[] = [
  { name: 'rfqNumber', label: 'RFQ #', type: 'text', required: true },
  { name: 'supplierName', label: 'Supplier', type: 'text', required: true },
  { name: 'productName', label: 'Product / Requirement', type: 'text', required: true },
  { name: 'date', label: 'Issued Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Deadline', type: 'date' },
  { name: 'targetPrice', label: 'Target Price', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'awarded', label: 'Awarded' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
]

const initialRfqs = [
  {
    id: 'rfq-1',
    rfqNumber: 'RFQ-2024-001',
    supplierName: 'Shenzhen Smart Device OEM',
    productName: 'Robot Vacuum Batch',
    date: '2024-03-08',
    dueDate: '2024-03-16',
    targetPrice: 220000000,
    status: 'sent',
  },
  {
    id: 'rfq-2',
    rfqNumber: 'RFQ-2024-002',
    supplierName: 'Tuya Sensor Factory',
    productName: 'Door Sensor and Motion Sensor Bundle',
    date: '2024-03-11',
    dueDate: '2024-03-20',
    targetPrice: 150000000,
    status: 'draft',
  },
]

const flow: Record<string, string> = {
  draft: 'sent',
  pending: 'confirmed',
  sent: 'awarded',
  confirmed: 'received',
}

const PurchaseModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('purchase-orders')
  const [purchaseOrders, setPurchaseOrders] = usePersistentState<any[]>('novatech.purchase.orders', mockData.mockPurchaseOrders)
  const [rfqs, setRfqs] = usePersistentState<any[]>('novatech.purchase.rfqs', initialRfqs)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/purchase/purchase-orders?limit=100')
      .then((records) => {
        if (!records.length) return
        setPurchaseOrders(
          records.map((po) => ({
            ...po,
            poNumber: po.purchase_order_number || po.poNumber,
            supplierName: po.supplier?.name || po.supplierName || po.supplier_id,
            date: po.order_date || po.date,
            dueDate: po.expected_delivery_date || po.dueDate,
            total: po.total_amount || po.total || 0,
          }))
        )
      })
      .catch((error) => console.warn('Purchase orders API load failed, keeping local data:', error.message))

    erpApi
      .get<any[]>('/purchase/rfqs?limit=100')
      .then((records) => {
        if (!records.length) return
        setRfqs(
          records.map((rfq) => ({
            ...rfq,
            rfqNumber: rfq.rfq_number || rfq.rfqNumber,
            supplierName: rfq.supplier?.name || rfq.supplierName || 'Multiple Suppliers',
            productName: rfq.description || rfq.productName || 'RFQ items',
            date: rfq.issued_date || rfq.date,
            dueDate: rfq.due_date || rfq.dueDate,
            targetPrice: rfq.estimated_total || rfq.targetPrice || 0,
          }))
        )
      })
      .catch((error) => console.warn('RFQ API load failed, keeping local data:', error.message))
  }, [setPurchaseOrders, setRfqs])

  const activeRecords = activeTab === 'purchase-orders' ? purchaseOrders : rfqs
  const fields = activeTab === 'purchase-orders' ? poFields : rfqFields
  const title = activeTab === 'purchase-orders' ? 'Purchase Order' : 'RFQ'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.poNumber || record.rfqNumber} ${record.supplierName} ${record.productName || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const isPO = activeTab === 'purchase-orders'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      [isPO ? 'poNumber' : 'rfqNumber']: `${isPO ? 'PO' : 'RFQ'}-${Date.now().toString().slice(-5)}`,
      supplierName: '',
      productName: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: '',
      total: 0,
      targetPrice: 0,
      status: 'draft',
    })
    setModalOpen(true)
  }

  const setActiveRecords = activeTab === 'purchase-orders' ? setPurchaseOrders : setRfqs

  const saveRecord = async (record: any) => {
    const isPO = activeTab === 'purchase-orders'
    const path = isPO ? '/purchase/purchase-orders' : '/purchase/rfqs'
    const payload = isPO
      ? {
          purchase_order_number: record.poNumber,
          supplier_id: record.supplier_id,
          order_date: record.date,
          expected_delivery_date: record.dueDate,
          status: record.status,
          total_amount: record.total,
        }
      : {
          rfq_number: record.rfqNumber,
          issued_date: record.date,
          due_date: record.dueDate,
          status: record.status,
          description: record.productName,
          estimated_total: record.targetPrice,
        }
    try {
      if (activeRecords.some((item) => item.id === record.id) && !record.id.startsWith(activeTab)) {
        await erpApi.put(`${path}/${record.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      console.warn('Purchase API save failed, saving locally:', error.message)
    }
    setActiveRecords((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const advanceRecord = (record: any) => {
    const nextStatus = flow[record.status]
    if (!nextStatus) return
    setActiveRecords((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
  }

  const renderActions = (record: any) => (
    <RecordActions
      onEdit={() => {
        setModalRecord(record)
        setModalOpen(true)
      }}
      onDelete={() => setActiveRecords((current) => current.filter((item) => item.id !== record.id))}
      onAdvance={flow[record.status] ? () => advanceRecord(record) : undefined}
      advanceLabel={activeTab === 'purchase-orders' ? 'Receive' : 'Award'}
    />
  )

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Purchase"
        subtitle="Manage RFQs and purchase orders for imported SmartHome and IoT devices."
        primaryLabel={`New ${title}`}
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
          { id: 'purchase-orders', label: 'Purchase Orders', count: purchaseOrders.length },
          { id: 'rfqs', label: 'RFQs', count: rfqs.length },
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Requirement</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.poNumber || record.rfqNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.productName || 'Device replenishment'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(record.total || record.targetPrice)}</td>
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
              <p className="mt-1 text-sm text-gray-600">{record.supplierName}</p>
              <p className="mt-2 text-sm font-semibold">{formatCurrency(record.total || record.targetPrice)}</p>
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      <RecordModal
        isOpen={modalOpen}
        title={`${modalRecord && activeRecords.some((item) => item.id === modalRecord.id) ? 'Edit' : 'Create'} ${title}`}
        record={modalRecord}
        fields={fields}
        onClose={() => setModalOpen(false)}
        onSave={saveRecord}
      />
    </div>
  )
}

export default PurchaseModule
