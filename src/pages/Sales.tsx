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

const quotationFieldsBase: FormField[] = [
  { name: 'quotationNumber', label: 'Quotation #', type: 'text' },
  { name: 'customerName', label: 'Customer', type: 'select', required: true, options: [] },
  { name: 'leadNumber', label: 'Lead', type: 'select', options: [] },
  { name: 'issuedDate', label: 'Quote Date', type: 'date', required: true },
  { name: 'validUntilDate', label: 'Expiry Date', type: 'date' },
  { name: 'totalAmountBeforeTax', label: 'Subtotal', type: 'number' },
  { name: 'totalDiscount', label: 'Discount', type: 'number' },
  { name: 'taxAmount', label: 'Tax', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  // NOTE: estimated_profit is AUTO-CALCULATED in backend from line items
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'expired', label: 'Expired' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'internalNotes', label: 'Internal Notes', type: 'textarea' },
]

const orderFieldsBase: FormField[] = [
  { name: 'orderNumber', label: 'Sales Order #', type: 'text' },
  { name: 'customerName', label: 'Customer', type: 'select', required: true, options: [] },
  { name: 'quotationNumber', label: 'Quotation', type: 'select', options: [] },
  { name: 'orderDate', label: 'Order Date', type: 'date', required: true },
  { name: 'requiredDeliveryDate', label: 'Required Delivery Date', type: 'date' },
  { name: 'actualDeliveryDate', label: 'Actual Delivery Date', type: 'date' },
  { name: 'totalAmountBeforeTax', label: 'Subtotal', type: 'number' },
  { name: 'totalDiscount', label: 'Discount', type: 'number' },
  { name: 'taxAmount', label: 'Tax', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  // NOTE: total_cost, estimated_profit, profit_margin_percent are AUTO-CALCULATED in backend
  { name: 'salesPersonName', label: 'Sales Person', type: 'select', options: [] },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'partially_shipped', label: 'Partially Shipped' },
      { value: 'shipped', label: 'Shipped' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'cancelled', label: 'Cancelled' },
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
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/sales-orders?limit=100')
      .then((records) => {
        setLoadError(null)
        setOrders(
          records.map((order) => ({
            ...order,
            orderNumber: order.sales_order_number,
            customerName: order.customer?.name || order.customer_id,
            orderDate: order.order_date,
            requiredDeliveryDate: order.required_delivery_date,
            actualDeliveryDate: order.actual_delivery_date,
            totalAmountBeforeTax: order.total_amount_before_tax,
            totalDiscount: order.total_discount,
            taxAmount: order.tax_amount,
            totalAmount: order.total_amount || 0,
            totalCost: order.total_cost,
            salesPersonName: order.sales_person?.full_name || order.sales_person_id,
            quotationNumber: order.quotation_id,
            notes: order.notes,
          }))
        )
      })
      .catch((error) => {
        setOrders([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/sales-orders/quotations?limit=100')
      .then((records) => {
        setLoadError(null)
        setQuotations(
          records.map((quote) => ({
            ...quote,
            quotationNumber: quote.quotation_number,
            customerName: quote.customer?.name || quote.customer_id,
            issuedDate: quote.issued_date,
            validUntilDate: quote.valid_until_date,
            totalAmountBeforeTax: quote.total_amount_before_tax,
            totalDiscount: quote.total_discount,
            taxAmount: quote.tax_amount,
            totalAmount: quote.total_amount || 0,
            leadNumber: quote.lead_id,
            notes: quote.notes,
            internalNotes: quote.internal_notes,
          }))
        )
      })
      .catch((error) => {
        setQuotations([])
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/customers?limit=1000'),
      erpApi.get<any[]>('/users?limit=100'),
      erpApi.get<any[]>('/crm/leads?limit=100'),
    ])
      .then(([customerData, userData, leadData]) => {
        setCustomers(customerData)
        setUsers(userData)
        setLeads(leadData)
      })
      .catch(() => {
        setCustomers([])
        setUsers([])
        setLeads([])
      })
  }, [])

  const activeRecords = activeTab === 'orders' ? orders : quotations
  const customerOptions = useMemo(
    () => customers.map((customer) => ({ value: customer.id, label: `${customer.name}${customer.customer_number ? ` (${customer.customer_number})` : ''}` })),
    [customers]
  )
  const quotationOptions = useMemo(
    () => quotations.map((quote) => ({ value: quote.id, label: `${quote.quotation_number} - ${quote.customerName}` })),
    [quotations]
  )
  const leadOptions = useMemo(
    () => leads.map((lead) => ({ value: lead.id, label: `${lead.lead_number || lead.id} - ${lead.company_name}` })),
    [leads]
  )
  const salesPersonOptions = useMemo(
    () => users.filter(u => ['Sales_Manager', 'user'].includes(u.role)).map((user) => ({ value: user.id, label: user.full_name || user.email })),
    [users]
  )
  const fields = useMemo(() => {
    const source = activeTab === 'orders' ? orderFieldsBase : quotationFieldsBase
    return source.map((field) => {
      if (field.name === 'customer_id') return { ...field, options: customerOptions }
      if (field.name === 'quotation_id') return { ...field, options: quotationOptions }
      if (field.name === 'lead_id') return { ...field, options: leadOptions }
      if (field.name === 'sales_person_id') return { ...field, options: salesPersonOptions }
      return field
    })
  }, [activeTab, customerOptions, quotationOptions, leadOptions, salesPersonOptions])
  const title = activeTab === 'orders' ? 'Sales Order' : 'Quotation'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.orderNumber || record.quoteNumber} ${record.customerName} ${record.status}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const prefix = activeTab === 'orders' ? 'SO' : 'QT'
    setModalError(null)
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      [activeTab === 'orders' ? 'orderNumber' : 'quotationNumber']: `${prefix}-${Date.now().toString().slice(-5)}`,
      customerName: '',
      orderDate: new Date().toISOString().slice(0, 10),
      issuedDate: new Date().toISOString().slice(0, 10),
      requiredDeliveryDate: '',
      validUntilDate: '',
      totalAmountBeforeTax: 0,
      totalDiscount: 0,
      taxAmount: 0,
      totalAmount: 0,
      status: 'draft',
      notes: '',
    })
    setModalOpen(true)
  }

  const saveRecord = async (record: any) => {
    const isOrder = activeTab === 'orders'
    const path = isOrder ? '/sales-orders' : '/sales-orders/quotations'
    const payload = isOrder
      ? {
          sales_order_number: record.orderNumber,
          customer_id: customerOptions.find(c => c.label === record.customerName)?.value || record.customerName,
          quotation_id: quotationOptions.find(q => q.label === record.quotationNumber)?.value || record.quotationNumber,
          order_date: record.orderDate,
          required_delivery_date: record.requiredDeliveryDate,
          actual_delivery_date: record.actualDeliveryDate,
          total_amount_before_tax: record.totalAmountBeforeTax,
          total_discount: record.totalDiscount,
          tax_amount: record.taxAmount,
          total_amount: record.totalAmount,
          sales_person_id: salesPersonOptions.find(s => s.label === record.salesPersonName)?.value || record.salesPersonName,
          status: record.status,
          notes: record.notes,
        }
      : {
          quotation_number: record.quotationNumber,
          customer_id: customerOptions.find(c => c.label === record.customerName)?.value || record.customerName,
          lead_id: leadOptions.find(l => l.label === record.leadNumber)?.value || record.leadNumber,
          issued_date: record.issuedDate,
          valid_until_date: record.validUntilDate,
          total_amount_before_tax: record.totalAmountBeforeTax,
          total_discount: record.totalDiscount,
          tax_amount: record.taxAmount,
          total_amount: record.totalAmount,
          status: record.status,
          notes: record.notes,
          internal_notes: record.internalNotes,
        }

    try {
      if (activeRecords.some((item) => item.id === record.id) && !record.id.includes('Date')) {
        await erpApi.put(`${path}/${record.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      setModalError(error.message)
      return
    }
    const setter = activeTab === 'orders' ? setOrders : setQuotations
    setter((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalError(null)
    setModalOpen(false)
  }

  const deleteRecord = async (record: any) => {
    const path = activeTab === 'orders' ? '/sales-orders' : '/sales-orders/quotations'
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (error: any) {
      showNotification('error', `Sales delete failed: ${error.message}`)
      return
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
          setModalError(null)
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

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load sales data from backend: {loadError}
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
        errorMessage={modalError}
        onErrorClear={() => setModalError(null)}
        onClose={() => {
          setModalError(null)
          setModalOpen(false)
        }}
        onSave={saveRecord}
      />
    </div>
  )
}

export default SalesModule
