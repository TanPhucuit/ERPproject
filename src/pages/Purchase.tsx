import React, { useEffect, useMemo, useState } from 'react'
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
import { useUIStore } from '../stores/uiStore'

const poFieldsBase: FormField[] = [
  { name: 'poNumber', label: 'PO #', type: 'text', required: true },
  { name: 'supplierName', label: 'Supplier', type: 'select', required: true, options: [] },
  { name: 'rfqNumber', label: 'RFQ', type: 'select', options: [] },
  { name: 'orderDate', label: 'PO Date', type: 'date', required: true },
  { name: 'requiredDeliveryDate', label: 'Required Delivery Date', type: 'date' },
  { name: 'actualDeliveryDate', label: 'Actual Delivery Date', type: 'date' },
  { name: 'totalAmountBeforeTax', label: 'Subtotal', type: 'number' },
  { name: 'totalTax', label: 'Tax', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  { name: 'receivedAmount', label: 'Received Amount', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'partial_received', label: 'Partial Received' },
      { value: 'received', label: 'Received' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const rfqFieldsBase: FormField[] = [
  { name: 'rfqNumber', label: 'RFQ #', type: 'text', required: true },
  { name: 'issuedDate', label: 'Issued Date', type: 'date', required: true },
  { name: 'closingDate', label: 'Closing Date', type: 'date' },
  { name: 'totalEstimatedCost', label: 'Total Estimated Cost', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'closed', label: 'Closed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const flow: Record<string, string> = {
  draft: 'confirmed',
  confirmed: 'partial_received',
  partial_received: 'received',
  received: 'received',
}

const PurchaseModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('purchase-orders')
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [rfqs, setRfqs] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [rfqList, setRfqList] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/purchase/purchase-orders?limit=100')
      .then((records) => {
        setLoadError(null)
        setPurchaseOrders(
          records.map((po) => ({
            ...po,
            poNumber: po.purchase_order_number,
            supplierName: po.supplier?.name || po.supplier_id,
            orderDate: po.order_date,
            requiredDeliveryDate: po.required_delivery_date,
            actualDeliveryDate: po.actual_delivery_date,
            totalAmountBeforeTax: po.total_amount_before_tax,
            totalTax: po.total_tax,
            totalAmount: po.total_amount || 0,
            receivedAmount: po.received_amount,
            notes: po.notes,
            rfqNumber: po.rfq_id,
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
  }, [])

  const activeRecords = activeTab === 'purchase-orders' ? purchaseOrders : rfqs
  const supplierOptions = useMemo(
    () => suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.name}${supplier.supplier_number ? ` (${supplier.supplier_number})` : ''}` })),
    [suppliers]
  )
  const rfqOptions = useMemo(
    () => rfqList.map((rfq) => ({ value: rfq.id, label: `${rfq.rfq_number} - ${rfq.supplier?.name || 'Supplier'}` })),
    [rfqList]
  )
  const fields = useMemo(() => {
    const source = activeTab === 'purchase-orders' ? poFieldsBase : rfqFieldsBase
    return source.map((field) => {
      if (field.name === 'supplierName') return { ...field, options: supplierOptions }
      if (field.name === 'rfqNumber') return { ...field, options: rfqOptions }
      return field
    })
  }, [activeTab, supplierOptions, rfqOptions])
  const title = activeTab === 'purchase-orders' ? 'Purchase Order' : 'RFQ'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.purchase_order_number || record.rfq_number} ${record.supplierName || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const isPO = activeTab === 'purchase-orders'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      [isPO ? 'poNumber' : 'rfqNumber']: `${isPO ? 'PO' : 'RFQ'}-${Date.now().toString().slice(-5)}`,
      orderDate: new Date().toISOString().slice(0, 10),
      issuedDate: new Date().toISOString().slice(0, 10),
      requiredDeliveryDate: '',
      closingDate: '',
      totalAmountBeforeTax: 0,
      totalTax: 0,
      totalAmount: 0,
      totalEstimatedCost: 0,
      receivedAmount: 0,
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
          supplier_id: supplierOptions.find(s => s.label === record.supplierName)?.value || record.supplierName,
          rfq_id: rfqOptions.find(r => r.label === record.rfqNumber)?.value || record.rfqNumber,
          order_date: record.orderDate,
          required_delivery_date: record.requiredDeliveryDate,
          actual_delivery_date: record.actualDeliveryDate,
          total_amount_before_tax: record.totalAmountBeforeTax,
          total_tax: record.totalTax,
          total_amount: record.totalAmount,
          received_amount: record.receivedAmount,
          status: record.status,
          notes: record.notes,
        }
      : {
          rfq_number: record.rfqNumber,
          issued_date: record.issuedDate,
          closing_date: record.closingDate,
          status: record.status,
          notes: record.notes,
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

  const advanceRecord = (record: any) => {
    // Different flow for PO and RFQ
    const poFlow: Record<string, string> = {
      draft: 'confirmed',
      confirmed: 'partial_received',
      partial_received: 'received',
    }
    const rfqFlow: Record<string, string> = {
      draft: 'sent',
      sent: 'closed',
    }
    const currentFlow = activeTab === 'purchase-orders' ? poFlow : rfqFlow
    const nextStatus = currentFlow[record.status]
    if (!nextStatus) return
    setActiveRecords((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
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

  const renderActions = (record: any) => (
    <RecordActions
      onEdit={() => {
        setModalRecord(record)
        setModalOpen(true)
      }}
      onDelete={() => deleteRecord(record)}
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
