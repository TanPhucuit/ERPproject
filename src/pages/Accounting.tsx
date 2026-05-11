import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import { exportInvoiceToPDF } from '../services/pdfExportService'
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

const invoiceFieldsBase: FormField[] = [
  { name: 'invoiceNumber', label: 'Invoice #', type: 'text', required: true },
  { name: 'customerName', label: 'Customer', type: 'select', required: true, options: [] },
  { name: 'salesOrderNumber', label: 'Sales Order', type: 'select', options: [] },
  { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'totalAmountBeforeTax', label: 'Subtotal', type: 'number' },
  { name: 'totalTax', label: 'Tax', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  { name: 'paidAmount', label: 'Paid Amount', type: 'number' },
  // NOTE: outstandingAmount is AUTO-CALCULATED (totalAmount - paidAmount) - do NOT include in form
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'issued', label: 'Issued' },
      { value: 'sent', label: 'Sent' },
      { value: 'partial_paid', label: 'Partial Paid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'paymentTerms', label: 'Payment Terms', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const billFieldsBase: FormField[] = [
  { name: 'billNumber', label: 'Bill #', type: 'text', required: true },
  { name: 'supplierName', label: 'Supplier', type: 'select', required: true, options: [] },
  { name: 'purchaseOrderNumber', label: 'Purchase Order', type: 'select', options: [] },
  { name: 'billDate', label: 'Bill Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'totalAmountBeforeTax', label: 'Subtotal', type: 'number' },
  { name: 'totalTax', label: 'Tax', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  { name: 'paidAmount', label: 'Paid Amount', type: 'number' },
  // NOTE: outstandingAmount is AUTO-CALCULATED (totalAmount - paidAmount) - do NOT include in form
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'received', label: 'Received' },
      { value: 'verified', label: 'Verified' },
      { value: 'partial_paid', label: 'Partial Paid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const noteFieldsBase: FormField[] = [
  { name: 'noteNumber', label: 'Note #', type: 'text', required: true },
  { name: 'partnerName', label: 'Customer / Supplier', type: 'select', required: true, options: [] },
  { name: 'referenceDocument', label: 'Reference Invoice/Bill', type: 'select', options: [] },
  { name: 'noteDate', label: 'Date', type: 'date', required: true },
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  { name: 'totalAmount', label: 'Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'issued', label: 'Issued' },
      { value: 'applied', label: 'Applied' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
]

const flow: Record<string, string> = {
  draft: 'posted',
  pending: 'paid',
  posted: 'paid',
  overdue: 'paid',
}

const normalizeInvoice = (invoice: any) => ({
  ...invoice,
  invoiceNumber: invoice.invoice_number,
  customerName: invoice.customer?.name || invoice.customer_id,
  invoiceDate: invoice.invoice_date,
  dueDate: invoice.due_date,
  totalAmountBeforeTax: invoice.total_amount_before_tax,
  totalTax: invoice.total_tax,
  totalAmount: invoice.total_amount || invoice.total,
  paidAmount: invoice.paid_amount,
  outstandingAmount: invoice.outstanding_amount,
})

const AccountingModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState<any[]>([])
  const [vendorBills, setVendorBills] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [debits, setDebits] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/accounting/invoices?limit=100')
      .then((records) => {
        setLoadError(null)
        setInvoices(records.map(normalizeInvoice))
      })
      .catch((error) => {
        setInvoices([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/accounting/bills?limit=100')
      .then((records) => {
        setLoadError(null)
        setVendorBills(records.map((bill) => ({
          ...bill,
          billNumber: bill.bill_number,
          supplierName: bill.supplier?.name || bill.supplier_id,
          billDate: bill.bill_date,
          dueDate: bill.due_date,
          totalAmountBeforeTax: bill.total_amount_before_tax,
          totalTax: bill.total_tax,
          totalAmount: bill.total_amount || 0,
          paidAmount: bill.paid_amount,
          outstandingAmount: bill.outstanding_amount,
        })))
      })
      .catch((error) => {
        setVendorBills([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/accounting/credit-notes?limit=100')
      .then((records) => {
        setLoadError(null)
        setCredits(records.map((note) => ({
          ...note,
          noteNumber: note.credit_note_number,
          customerName: note.customer?.name || note.customer_id,
          noteDate: note.credit_date,
          totalAmount: note.total_amount || 0,
          referenceDocument: note.invoice_id,
        })))
      })
      .catch((error) => {
        setCredits([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/accounting/debit-notes?limit=100')
      .then((records) => {
        setLoadError(null)
        setDebits(records.map((note) => ({
          ...note,
          noteNumber: note.debit_note_number,
          supplierName: note.supplier?.name || note.supplier_id,
          noteDate: note.debit_date,
          totalAmount: note.total_amount || 0,
          referenceDocument: note.bill_id,
        })))
      })
      .catch((error) => {
        setDebits([])
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/customers?limit=1000'),
      erpApi.get<any[]>('/suppliers?limit=1000'),
      erpApi.get<any[]>('/sales-orders?limit=100'),
      erpApi.get<any[]>('/purchase/purchase-orders?limit=100'),
    ])
      .then(([customerData, supplierData, soData, poData]) => {
        setCustomers(customerData)
        setSuppliers(supplierData)
        setSalesOrders(soData)
        setPurchaseOrders(poData)
      })
      .catch(() => {
        setCustomers([])
        setSuppliers([])
        setSalesOrders([])
        setPurchaseOrders([])
      })
  }, [])

  const activeRecords = activeTab === 'invoices' ? invoices : activeTab === 'bills' ? vendorBills : activeTab === 'credit-notes' ? credits : debits
  const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: `${customer.name}${customer.customer_number ? ` (${customer.customer_number})` : ''}` })), [customers])
  const supplierOptions = useMemo(() => suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.name}${supplier.supplier_number ? ` (${supplier.supplier_number})` : ''}` })), [suppliers])
  const salesOrderOptions = useMemo(() => salesOrders.map((so) => ({ value: so.id, label: `${so.sales_order_number} - ${so.customer?.name || 'Customer'}` })), [salesOrders])
  const purchaseOrderOptions = useMemo(() => purchaseOrders.map((po) => ({ value: po.id, label: `${po.purchase_order_number} - ${po.supplier?.name || 'Supplier'}` })), [purchaseOrders])

  const activeFields = useMemo(() => {
    if (activeTab === 'invoices') {
      return invoiceFieldsBase.map((field) => {
        if (field.name === 'customerName') return { ...field, options: customerOptions }
        if (field.name === 'salesOrderNumber') return { ...field, options: salesOrderOptions }
        return field
      })
    }
    if (activeTab === 'bills') {
      return billFieldsBase.map((field) => {
        if (field.name === 'supplierName') return { ...field, options: supplierOptions }
        if (field.name === 'purchaseOrderNumber') return { ...field, options: purchaseOrderOptions }
        return field
      })
    }
    if (activeTab === 'credit-notes') {
      return noteFieldsBase.map((field) => {
        if (field.name === 'partnerName') return { ...field, options: customerOptions }
        if (field.name === 'referenceDocument') return { ...field, options: salesOrderOptions }
        return field
      })
    }
    return noteFieldsBase.map((field) => {
      if (field.name === 'partnerName') return { ...field, options: supplierOptions }
      if (field.name === 'referenceDocument') return { ...field, options: purchaseOrderOptions }
      return field
    })
  }, [activeTab, customerOptions, supplierOptions, salesOrderOptions, purchaseOrderOptions])
  const activeTitle = activeTab === 'invoices' ? 'Customer Invoice' : activeTab === 'bills' ? 'Vendor Bill' : activeTab === 'credit-notes' ? 'Credit Note' : 'Debit Note'
  const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    invoices: setInvoices,
    bills: setVendorBills,
    'credit-notes': setCredits,
    'debit-notes': setDebits,
  }

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const reference = record.invoiceNumber || record.billNumber || record.noteNumber
      const partner = record.customerName || record.supplierName || record.partnerName
      const haystack = `${reference} ${partner} ${record.reason || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const prefix = activeTab === 'invoices' ? 'INV' : activeTab === 'bills' ? 'BILL' : activeTab === 'credit-notes' ? 'CN' : 'DN'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      invoiceNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      billNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      noteNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      customerName: '',
      supplierName: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      billDate: new Date().toISOString().slice(0, 10),
      noteDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      totalAmountBeforeTax: 0,
      totalTax: 0,
      totalAmount: 0,
      paidAmount: 0,
      status: 'draft',
      reason: '',
      description: '',
    })
    setModalOpen(true)
  }

  const saveRecord = async (record: any) => {
    const path = activeTab === 'invoices'
      ? '/accounting/invoices'
      : activeTab === 'bills'
        ? '/accounting/bills'
        : activeTab === 'credit-notes'
          ? '/accounting/credit-notes'
          : '/accounting/debit-notes'

    const payload = activeTab === 'invoices' ? {
      invoice_number: record.invoiceNumber,
      customer_id: customerOptions.find(c => c.label === record.customerName)?.value || record.customerName,
      sales_order_id: salesOrderOptions.find(s => s.label === record.salesOrderNumber)?.value || record.salesOrderNumber,
      invoice_date: record.invoiceDate,
      due_date: record.dueDate,
      total_amount_before_tax: record.totalAmountBeforeTax,
      total_tax: record.totalTax,
      total_amount: record.totalAmount,
      paid_amount: record.paidAmount,
      status: record.status,
      payment_terms: record.paymentTerms,
      description: record.description,
    } : activeTab === 'bills' ? {
      bill_number: record.billNumber,
      supplier_id: supplierOptions.find(s => s.label === record.supplierName)?.value || record.supplierName,
      purchase_order_id: purchaseOrderOptions.find(p => p.label === record.purchaseOrderNumber)?.value || record.purchaseOrderNumber,
      bill_date: record.billDate,
      due_date: record.dueDate,
      total_amount_before_tax: record.totalAmountBeforeTax,
      total_tax: record.totalTax,
      total_amount: record.totalAmount,
      paid_amount: record.paidAmount,
      status: record.status,
      notes: record.notes,
    } : activeTab === 'credit-notes' ? {
      credit_note_number: record.noteNumber,
      customer_id: customerOptions.find(c => c.label === record.partnerName)?.value || record.partnerName,
      invoice_id: record.referenceDocument,
      reason: record.reason,
      credit_date: record.noteDate,
      status: record.status,
      total_amount: record.totalAmount,
      description: record.description,
    } : {
      debit_note_number: record.noteNumber,
      supplier_id: supplierOptions.find(s => s.label === record.partnerName)?.value || record.partnerName,
      bill_id: record.referenceDocument,
      reason: record.reason,
      debit_date: record.noteDate,
      status: record.status,
      total_amount: record.totalAmount,
      description: record.description,
    }

    try {
      const exists = activeRecords.some((item) => item.id === record.id)
      if (exists) {
        await erpApi.put(`${path}/${record.id}`, payload)
      } else {
        const created = await erpApi.post<any>(path, payload)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      showNotification('error', `Accounting save failed: ${error.message}`)
      return
    }
    setters[activeTab]((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const advanceRecord = (record: any) => {
    const nextStatus = activeTab.includes('notes') && record.status === 'draft' ? 'posted' : flow[record.status]
    if (!nextStatus) return
    setters[activeTab]((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
  }

  const deleteRecord = async (record: any) => {
    const pathMap: Record<string, string> = {
      invoices: '/accounting/invoices',
      bills: '/accounting/bills',
      'credit-notes': '/accounting/credit-notes',
      'debit-notes': '/accounting/debit-notes',
    }
    const path = pathMap[activeTab]
    const recordName = record.invoice_number || record.bill_number || record.note_number || 'this record'
    if (!window.confirm(`Delete ${recordName}?`)) return
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (error: any) {
      showNotification('error', `Accounting delete failed: ${error.message}`)
      return
    }
    setters[activeTab]((current) => current.filter((item) => item.id !== record.id))
    showNotification('success', `${activeTitle} deleted.`)
  }

  const renderActions = (record: any) => (
    <div className="flex items-center gap-1">
      {activeTab === 'invoices' && (
        <button onClick={() => exportInvoiceToPDF(record)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Download PDF">
          <Download size={16} />
        </button>
      )}
      <RecordActions
        onEdit={() => {
          setModalRecord(record)
          setModalOpen(true)
        }}
        onDelete={() => deleteRecord(record)}
        onAdvance={(flow[record.status] || (activeTab.includes('notes') && record.status === 'draft')) ? () => advanceRecord(record) : undefined}
        advanceLabel={activeTab.includes('notes') ? 'Post' : 'Pay'}
      />
    </div>
  )

  const totalReceivable = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
  const totalPayable = vendorBills.filter((bill) => bill.status !== 'paid').reduce((sum, bill) => sum + (bill.total || 0), 0)

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Accounting"
        subtitle="Review invoices, vendor bills, credit notes, debit notes, and payment state."
        primaryLabel={`New ${activeTitle}`}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load accounting data from backend: {loadError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Outstanding Receivable</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalReceivable)}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Outstanding Payable</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(totalPayable)}</p>
        </div>
      </div>

      <ModuleTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab)
          setSearch('')
          setStatus('all')
        }}
        tabs={[
          { id: 'invoices', label: 'Customer Invoices', count: invoices.length },
          { id: 'bills', label: 'Vendor Bills', count: vendorBills.length },
          { id: 'credit-notes', label: 'Credit Notes', count: credits.length },
          { id: 'debit-notes', label: 'Debit Notes', count: debits.length },
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Partner</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.invoice_number || record.billNumber || record.noteNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.customerName || record.supplierName || record.partnerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.invoice_date || record.billDate || record.noteDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(record.total_amount || record.total)}</td>
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
              <p className="font-bold text-blue-700">{record.invoice_number || record.billNumber || record.noteNumber}</p>
              <p className="mt-1 text-sm text-gray-600">{record.customerName || record.supplierName || record.partnerName}</p>
              <p className="mt-2 text-sm font-semibold">{formatCurrency(record.total_amount || record.total)}</p>
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

export default AccountingModule
