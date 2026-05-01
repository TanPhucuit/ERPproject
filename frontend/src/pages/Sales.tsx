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

const quotationFields: FormField[] = [
  { name: 'quoteNumber', label: 'Quotation #', type: 'text', required: true },
  { name: 'customerName', label: 'Customer', type: 'text', required: true },
  { name: 'date', label: 'Quote Date', type: 'date', required: true },
  { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
  { name: 'total', label: 'Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const orderFields: FormField[] = [
  { name: 'orderNumber', label: 'Sales Order #', type: 'text', required: true },
  { name: 'customerName', label: 'Customer', type: 'text', required: true },
  { name: 'date', label: 'Order Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Delivery Date', type: 'date' },
  { name: 'total', label: 'Total', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const orderFlow: Record<string, string> = {
  draft: 'confirmed',
  pending: 'confirmed',
  confirmed: 'delivered',
  delivered: 'completed',
}

const quoteFlow: Record<string, string> = {
  draft: 'sent',
  sent: 'won',
}

const SalesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = usePersistentState<any[]>('novatech.sales.orders', mockData.mockSalesOrders)
  const [quotations, setQuotations] = usePersistentState<any[]>('novatech.sales.quotations', mockData.mockQuotations)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/sales-orders?limit=100')
      .then((records) => {
        if (!records.length) return
        setOrders(
          records.map((order) => ({
            ...order,
            orderNumber: order.sales_order_number || order.orderNumber,
            customerName: order.customer?.name || order.customerName || order.customer_id,
            date: order.order_date || order.date,
            dueDate: order.required_delivery_date || order.dueDate,
            total: order.total_amount || order.total || 0,
          }))
        )
      })
      .catch((error) => console.warn('Sales orders API load failed, keeping local data:', error.message))

    erpApi
      .get<any[]>('/sales-orders/quotations?limit=100')
      .then((records) => {
        if (!records.length) return
        setQuotations(
          records.map((quote) => ({
            ...quote,
            quoteNumber: quote.quotation_number || quote.quoteNumber,
            customerName: quote.customer?.name || quote.customerName || quote.customer_id,
            date: quote.quote_date || quote.date,
            expiryDate: quote.valid_until || quote.expiryDate,
            total: quote.total_amount || quote.total || 0,
          }))
        )
      })
      .catch((error) => console.warn('Quotations API load failed, keeping local data:', error.message))
  }, [setOrders, setQuotations])

  const activeRecords = activeTab === 'orders' ? orders : quotations
  const fields = activeTab === 'orders' ? orderFields : quotationFields
  const title = activeTab === 'orders' ? 'Sales Order' : 'Quotation'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.orderNumber || record.quoteNumber} ${record.customerName} ${record.status}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const prefix = activeTab === 'orders' ? 'SO' : 'QT'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      [activeTab === 'orders' ? 'orderNumber' : 'quoteNumber']: `${prefix}-${Date.now().toString().slice(-5)}`,
      customerName: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: '',
      expiryDate: '',
      status: 'draft',
      total: 0,
    })
    setModalOpen(true)
  }

  const saveRecord = async (record: any) => {
    const isOrder = activeTab === 'orders'
    const path = isOrder ? '/sales-orders' : '/sales-orders/quotations'
    const payload = isOrder
      ? {
          sales_order_number: record.orderNumber,
          customer_id: record.customer_id,
          order_date: record.date,
          required_delivery_date: record.dueDate,
          status: record.status,
          total_amount: record.total,
        }
      : {
          quotation_number: record.quoteNumber,
          customer_id: record.customer_id,
          quote_date: record.date,
          valid_until: record.expiryDate,
          status: record.status,
          total_amount: record.total,
          notes: record.description,
        }

    try {
      if (activeRecords.some((item) => item.id === record.id) && !record.id.includes('Date')) {
        await erpApi.put(`${path}/${record.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      console.warn('Sales API save failed, saving locally:', error.message)
    }
    const setter = activeTab === 'orders' ? setOrders : setQuotations
    setter((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const deleteRecord = async (record: any) => {
    const path = activeTab === 'orders' ? '/sales-orders' : '/sales-orders/quotations'
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (error: any) {
      console.warn('Sales API delete failed, deleting locally:', error.message)
    }
    const setter = activeTab === 'orders' ? setOrders : setQuotations
    setter((current) => current.filter((item) => item.id !== record.id))
  }

  const advanceRecord = (record: any) => {
    const flow = activeTab === 'orders' ? orderFlow : quoteFlow
    const nextStatus = flow[record.status]
    if (!nextStatus) return
    const setter = activeTab === 'orders' ? setOrders : setQuotations
    setter((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
  }

  const renderActions = (record: any) => {
    const flow = activeTab === 'orders' ? orderFlow : quoteFlow
    return (
      <RecordActions
        onEdit={() => {
          setModalRecord(record)
          setModalOpen(true)
        }}
        onDelete={() => deleteRecord(record)}
        onAdvance={flow[record.status] ? () => advanceRecord(record) : undefined}
        advanceLabel={activeTab === 'orders' ? 'Advance' : 'Confirm'}
      />
    )
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Sales"
        subtitle="Manage quotations and sales orders for SmartHome packages and retail device orders."
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
          { id: 'orders', label: 'Sales Orders', count: orders.length },
          { id: 'quotations', label: 'Quotations', count: quotations.length },
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Due/Expiry</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.orderNumber || record.quoteNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.customerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.dueDate || record.expiryDate || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(record.total)}</td>
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
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-blue-700">{record.orderNumber || record.quoteNumber}</p>
                  <p className="text-sm text-gray-600">{record.customerName}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(record.total)}</p>
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

export default SalesModule
