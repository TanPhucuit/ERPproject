import React, { useEffect, useMemo, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
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
  { name: 'invoiceNumber', label: 'Invoice #', type: 'text' },
  { name: 'salesOrderId', label: 'Sales Order', type: 'select', required: true, options: [] },
  { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'netAmount', label: 'Net Amount', type: 'number' },
  { name: 'taxAmount', label: 'Tax Amount', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  { name: 'warrantyOrderId', label: 'Warranty Order', type: 'select', options: [] },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'sent', label: 'Sent' },
      { value: 'partial_paid', label: 'Partial Paid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const billFieldsBase: FormField[] = [
  { name: 'billNumber', label: 'Bill #', type: 'text' },
  { name: 'purchaseOrderId', label: 'Purchase Order', type: 'select', required: true, options: [] },
  { name: 'billDate', label: 'Bill Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'subtotal', label: 'Subtotal', type: 'number' },
  { name: 'taxAmount', label: 'Tax Amount', type: 'number' },
  { name: 'totalAmount', label: 'Total', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'posted', label: 'Posted' },
      { value: 'partial_paid', label: 'Partial Paid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const noteFieldsBase: FormField[] = [
  { name: 'referenceDocument', label: 'Reference Invoice/Bill', type: 'select', options: [] },
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  { name: 'totalAmount', label: 'Amount', type: 'number', required: true },
]

const accountFieldsBase: FormField[] = [
  { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
  { name: 'bank', label: 'Bank', type: 'text' },
  { name: 'name', label: 'Account Name', type: 'text', required: true },
  { name: 'balance', label: 'Balance', type: 'number', required: true },
]

const paymentFieldsBase: FormField[] = [
  { name: 'documentType', label: 'Payment For', type: 'select', required: true, options: [
    { value: 'invoice', label: 'Customer Invoice' },
    { value: 'vendor_bill', label: 'Vendor Bill' },
  ] },
  { name: 'documentId', label: 'Document', type: 'select', required: true, options: [] },
  { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true },
  { name: 'paymentMethod', label: 'Payment Method', type: 'select', required: true, options: [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
  ] },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'paymentAccount', label: 'Source Account', type: 'select', options: [] },
  { name: 'targetAccount', label: 'Target Account', type: 'select', options: [] },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const normalizeInvoice = (invoice: any) => ({
  ...invoice,
  invoiceNumber: invoice.invoice_number,
  salesOrderId: invoice.sales_order_id,
  customerName: invoice.customer?.name || invoice.sales_order?.customer?.full_name || invoice.customer_id,
  invoiceDate: invoice.issue_date,
  dueDate: invoice.due_date,
  netAmount: invoice.net_amount,
  subtotal: invoice.subtotal || invoice.net_amount,
  taxAmount: Number(invoice.tax_amount) > 0 ? invoice.tax_amount : Math.round(Number(invoice.subtotal || invoice.net_amount || 0) * 0.1),
  totalAmount: Number(invoice.subtotal || invoice.net_amount || 0) + (Number(invoice.tax_amount) > 0 ? Number(invoice.tax_amount) : Math.round(Number(invoice.subtotal || invoice.net_amount || 0) * 0.1)),
  warrantyOrderId: invoice.warranty_orders_id,
  notes: invoice.notes,
  lines: invoice.lines || invoice.items || [],
  items: invoice.items || invoice.lines || [],
})

const normalizeBill = (bill: any) => ({
  ...bill,
  billNumber: bill.bill_number,
  purchaseOrderId: bill.purchase_order_id,
  supplierName: bill.purchase_order?.supplier?.supplier_name || bill.purchase_order?.supplier?.name || bill.purchase_order?.vendor_id,
  billDate: bill.issue_date,
  dueDate: bill.due_date,
  subtotal: bill.subtotal,
  taxAmount: bill.tax_amount,
  totalAmount: bill.total,
  notes: bill.notes,
})

const normalizeNote = (note: any, isCredit: boolean) => ({
  ...note,
  noteNumber: note.id?.slice(0, 8),
  referenceDocument: isCredit ? note.invoices_id : note.vendor_bills_id,
  partnerName: isCredit ? (note.invoice?.invoice_number || note.invoices_id) : (note.vendor_bill?.bill_number || note.vendor_bills_id),
  noteDate: '',
  reason: note.reason,
  totalAmount: note.total_amount,
  status: 'posted',
})

const buildAdjustmentMap = (notes: any[]) => notes.reduce((map, note) => {
  const key = note.referenceDocument
  if (!key) return map
  const current = map.get(key) || { amount: 0, reasons: [] as string[] }
  map.set(key, {
    amount: current.amount + Number(note.totalAmount || note.total_amount || 0),
    reasons: note.reason ? [...current.reasons, note.reason] : current.reasons,
  })
  return map
}, new Map<string, { amount: number; reasons: string[] }>())

const applyAdjustment = (record: any, adjustmentMap: Map<string, { amount: number; reasons: string[] }>) => {
  const adjustment = adjustmentMap.get(record.id)
  const baseAmount = Number(record.totalAmount || record.total || 0)
  const adjustmentAmount = adjustment?.amount || 0
  return {
    ...record,
    adjustmentAmount,
    adjustmentReason: adjustment?.reasons.join('; ') || '',
    amountDue: Math.max(baseAmount - adjustmentAmount, 0),
  }
}

const normalizePayment = (payment: any) => ({
  ...payment,
  paymentNumber: payment.id?.slice(0, 8),
  documentType: payment.invoice_id ? 'invoice' : 'vendor_bill',
  documentId: payment.invoice_id || payment.vendor_bill_id,
  documentName: payment.invoice?.invoice_number || payment.vendor_bill?.bill_number || payment.invoice_id || payment.vendor_bill_id,
  paymentDate: payment.payment_date,
  paymentMethod: payment.payment_method,
  paymentAccount: payment.payment_account,
  targetAccount: payment.target_account,
  status: 'posted',
})

const normalizeAccount = (account: any) => ({
  ...account,
  accountNumber: account.account_number,
  status: 'active',
})

const AccountingModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState<any[]>([])
  const [vendorBills, setVendorBills] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [debits, setDebits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  const loadAccounting = async () => {
    try {
      const [invoiceData, billData, creditData, debitData, accountData, paymentData] = await Promise.all([
        erpApi.get<any[]>('/accounting/invoices?limit=100'),
        erpApi.get<any[]>('/accounting/bills?limit=100'),
        erpApi.get<any[]>('/accounting/credit-notes?limit=100'),
        erpApi.get<any[]>('/accounting/debit-notes?limit=100'),
        erpApi.get<any[]>('/accounting/accounts'),
        erpApi.get<any[]>('/accounting/payments?limit=100'),
      ])
      setLoadError(null)
      const normalizedCredits = creditData.map((note) => normalizeNote(note, true))
      const normalizedDebits = debitData.map((note) => normalizeNote(note, false))
      const creditMap = buildAdjustmentMap(normalizedCredits)
      const debitMap = buildAdjustmentMap(normalizedDebits)
      setInvoices(invoiceData.map(normalizeInvoice).map((invoice) => applyAdjustment(invoice, creditMap)))
      setVendorBills(billData.map(normalizeBill).map((bill) => applyAdjustment(bill, debitMap)))
      setCredits(normalizedCredits)
      setDebits(normalizedDebits)
      setAccounts(accountData.map(normalizeAccount))
      setPayments(paymentData.map(normalizePayment))
    } catch (error: any) {
      setLoadError(error.message)
    }
  }

  useEffect(() => {
    loadAccounting()
  }, [])

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/sales-orders?limit=100'),
      erpApi.get<any[]>('/purchase/purchase-orders?limit=100'),
    ])
      .then(([soData, poData]) => {
        setSalesOrders(soData)
        setPurchaseOrders(poData)
      })
      .catch(() => {
        setSalesOrders([])
        setPurchaseOrders([])
      })
  }, [])

  const activeRecords = activeTab === 'invoices' ? invoices : activeTab === 'bills' ? vendorBills : activeTab === 'credit-notes' ? credits : activeTab === 'debit-notes' ? debits : activeTab === 'payments' ? payments : accounts
  const salesOrderOptions = useMemo(() => salesOrders.map((so) => ({ value: so.id, label: `${so.sales_order_number} - ${so.customer?.name || 'Customer'}` })), [salesOrders])
  const purchaseOrderOptions = useMemo(() => purchaseOrders.map((po) => ({ value: po.id, label: `${po.purchase_order_number} - ${po.supplier?.name || 'Supplier'}` })), [purchaseOrders])
  const accountOptions = useMemo(() => accounts.map((account) => ({ value: account.id, label: `${account.account_number} - ${account.name}` })), [accounts])
  const invoiceOptions = useMemo(() => invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoiceNumber} - ${invoice.customerName || 'Customer'}` })), [invoices])
  const billOptions = useMemo(() => vendorBills.map((bill) => ({ value: bill.id, label: `${bill.billNumber} - ${bill.supplierName || 'Supplier'}` })), [vendorBills])

  const activeFields = useMemo(() => {
    if (activeTab === 'invoices') {
      return invoiceFieldsBase.map((field) => {
        if (field.name === 'salesOrderId') return { ...field, options: salesOrderOptions }
        return field
      })
    }
    if (activeTab === 'bills') {
      return billFieldsBase.map((field) => {
        if (field.name === 'purchaseOrderId') return { ...field, options: purchaseOrderOptions }
        return field
      })
    }
    if (activeTab === 'credit-notes') {
      return noteFieldsBase.map((field) => {
        if (field.name === 'referenceDocument') return { ...field, options: invoiceOptions }
        return field
      })
    }
    if (activeTab === 'payments') {
      return paymentFieldsBase.map((field) => {
        if (field.name === 'documentId') return { ...field, options: [...invoiceOptions, ...billOptions] }
        if (field.name === 'paymentAccount' || field.name === 'targetAccount') return { ...field, options: accountOptions }
        return field
      })
    }
    if (activeTab === 'accounts') return accountFieldsBase
    return noteFieldsBase.map((field) => {
      if (field.name === 'referenceDocument') return { ...field, options: billOptions }
      return field
    })
  }, [activeTab, salesOrderOptions, purchaseOrderOptions, invoiceOptions, billOptions, accountOptions])
  const activeTitle = activeTab === 'invoices' ? 'Customer Invoice' : activeTab === 'bills' ? 'Vendor Bill' : activeTab === 'credit-notes' ? 'Credit Note' : activeTab === 'debit-notes' ? 'Debit Note' : activeTab === 'payments' ? 'Payment' : 'Account'
  const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    invoices: setInvoices,
    bills: setVendorBills,
    'credit-notes': setCredits,
    'debit-notes': setDebits,
    payments: setPayments,
    accounts: setAccounts,
  }

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const reference = record.invoiceNumber || record.billNumber || record.noteNumber || record.paymentNumber
      const partner = record.customerName || record.supplierName || record.partnerName || record.documentName
      const account = `${record.accountNumber || ''} ${record.bank || ''} ${record.name || ''}`
      const haystack = `${reference || ''} ${partner || ''} ${record.reason || ''} ${account}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const prefix = activeTab === 'invoices' ? 'INV' : activeTab === 'bills' ? 'BILL' : activeTab === 'credit-notes' ? 'CN' : activeTab === 'debit-notes' ? 'DN' : activeTab === 'payments' ? 'PAY' : 'ACC'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      invoiceNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      billNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      noteNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      salesOrderId: '',
      purchaseOrderId: '',
      documentType: 'invoice',
      documentId: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      billDate: new Date().toISOString().slice(0, 10),
      noteDate: new Date().toISOString().slice(0, 10),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'cash',
      dueDate: '',
      netAmount: 0,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      status: activeTab === 'bills' ? 'posted' : 'sent',
      accountNumber: '',
      bank: '',
      name: '',
      balance: 0,
      paymentAccount: '',
      targetAccount: '',
      reason: '',
      notes: '',
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
          : activeTab === 'debit-notes'
            ? '/accounting/debit-notes'
            : activeTab === 'payments'
              ? '/accounting/payments'
              : '/accounting/accounts'
    const invoiceNet = Number(record.netAmount || record.subtotal || 0)
    const invoiceTax = Number(record.taxAmount) || Math.round(invoiceNet * 0.1)
    const invoiceTotal = Number(record.totalAmount) || invoiceNet + invoiceTax
    const billSubtotal = Number(record.subtotal || 0)
    const billTax = Number(record.taxAmount) || Math.round(billSubtotal * 0.1)
    const billTotal = Number(record.totalAmount) || billSubtotal + billTax

    const payload = activeTab === 'invoices' ? {
      invoice_number: record.invoiceNumber,
      sales_order_id: record.salesOrderId,
      invoice_date: record.invoiceDate,
      due_date: record.dueDate,
      net_amount: invoiceNet,
      tax_amount: invoiceTax,
      total_amount: invoiceTotal,
      status: record.status,
      warranty_orders_id: record.warrantyOrderId || null,
      notes: record.notes,
    } : activeTab === 'bills' ? {
      bill_number: record.billNumber,
      purchase_order_id: record.purchaseOrderId,
      bill_date: record.billDate,
      due_date: record.dueDate,
      subtotal: billSubtotal,
      tax_amount: billTax,
      total_amount: billTotal,
      status: record.status,
      notes: record.notes,
    } : activeTab === 'credit-notes' ? {
      invoice_id: record.referenceDocument,
      reason: record.reason,
      total_amount: record.totalAmount,
    } : activeTab === 'debit-notes' ? {
      bill_id: record.referenceDocument,
      reason: record.reason,
      total_amount: record.totalAmount,
    } : activeTab === 'payments' ? {
      invoice_id: invoices.some((invoice) => invoice.id === record.documentId) ? record.documentId : null,
      vendor_bill_id: vendorBills.some((bill) => bill.id === record.documentId) ? record.documentId : null,
      payment_date: record.paymentDate,
      payment_method: record.paymentMethod,
      amount: record.amount,
      payment_account: record.paymentMethod === 'cash' ? null : record.paymentAccount || null,
      target_account: record.paymentMethod === 'cash' ? null : record.targetAccount || null,
      notes: record.notes,
    } : {
      account_number: record.accountNumber,
      bank: record.bank,
      name: record.name,
      balance: record.balance,
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
    if (activeTab === 'payments') {
      await loadAccounting()
      setModalOpen(false)
      showNotification('success', 'Payment posted and document status updated.')
      return
    }
    if (activeTab === 'credit-notes' || activeTab === 'debit-notes') {
      await loadAccounting()
      setModalOpen(false)
      showNotification('success', `${activeTitle} saved.`)
      return
    }
    setters[activeTab]((current) => {
      const exists = current.some((item) => item.id === record.id)
      return exists ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]
    })
    setModalOpen(false)
  }

  const openPaymentFor = (record: any) => {
    const isInvoice = activeTab === 'invoices'
    setActiveTab('payments')
    setModalRecord({
      id: `payments-${Date.now()}`,
      documentType: isInvoice ? 'invoice' : 'vendor_bill',
      documentId: record.id,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      amount: record.amountDue ?? record.totalAmount ?? record.total_amount ?? record.total ?? 0,
      paymentAccount: '',
      targetAccount: '',
      notes: `Payment for ${record.invoiceNumber || record.billNumber || record.id}`,
    })
    setModalOpen(true)
  }

  const deleteRecord = async (record: any) => {
    const pathMap: Record<string, string> = {
      invoices: '/accounting/invoices',
      bills: '/accounting/bills',
      'credit-notes': '/accounting/credit-notes',
      'debit-notes': '/accounting/debit-notes',
      payments: '/accounting/payments',
      accounts: '/accounting/accounts',
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

  const renderAmount = (record: any) => {
    if (activeTab === 'accounts') return formatCurrency(record.balance)
    if ((activeTab === 'invoices' || activeTab === 'bills') && record.adjustmentAmount > 0) {
      const label = activeTab === 'invoices' ? 'Credit note' : 'Debit note'
      return (
        <div className="space-y-1 text-right">
          <p>{formatCurrency(record.totalAmount || record.total || 0)}</p>
          <p className="text-xs font-medium text-emerald-700">{label}: -{formatCurrency(record.adjustmentAmount)}</p>
          <p className="font-bold text-gray-900">Due: {formatCurrency(record.amountDue)}</p>
          {record.adjustmentReason && <p className="text-xs font-normal text-gray-500">Reason: {record.adjustmentReason}</p>}
        </div>
      )
    }
    return formatCurrency(record.amountDue ?? record.totalAmount ?? record.total ?? record.amount)
  }

  const renderActions = (record: any) => (
    <div className="flex items-center gap-1">
      {activeTab === 'invoices' && (
        <button onClick={() => exportInvoiceToPDF(record)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Download PDF">
          <Download size={16} />
        </button>
      )}
      {['invoices', 'bills'].includes(activeTab) && !['paid', 'cancelled'].includes(record.status) && (
        <button onClick={() => openPaymentFor(record)} className="rounded px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50" title="Create payment">
          Pay
        </button>
      )}
      {activeTab === 'invoices' ? (
        <button onClick={() => deleteRecord(record)} className="rounded p-2 text-red-600 hover:bg-red-50" title="Delete">
          <Trash2 size={16} />
        </button>
      ) : (
        <RecordActions
          onEdit={() => {
            setModalRecord(record)
            setModalOpen(true)
          }}
          onDelete={() => deleteRecord(record)}
          onAdvance={undefined}
        />
      )}
    </div>
  )

  const totalReceivable = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + (invoice.amountDue ?? invoice.total_amount ?? 0), 0)
  const totalPayable = vendorBills.filter((bill) => bill.status !== 'paid').reduce((sum, bill) => sum + (bill.amountDue ?? bill.total ?? 0), 0)

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
          { id: 'payments', label: 'Payments', count: payments.length },
          { id: 'accounts', label: 'Accounts', count: accounts.length },
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Account Number' : 'Reference'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Bank' : 'Partner'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Account Name' : 'Date'}</th>
                {activeTab !== 'accounts' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>}
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Balance' : 'Amount'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.accountNumber || record.invoiceNumber || record.billNumber || record.noteNumber || record.paymentNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'accounts' ? (record.bank || '-') : (record.customerName || record.supplierName || record.partnerName || record.documentName)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'accounts' ? record.name : (record.invoiceDate || record.billDate || record.noteDate || record.paymentDate)}</td>
                  {activeTab !== 'accounts' && <td className="px-4 py-3"><StatusBadge status={record.status} /></td>}
                  <td className="px-4 py-3 text-right text-sm font-semibold">{renderAmount(record)}</td>
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
              <p className="font-bold text-blue-700">{record.invoiceNumber || record.billNumber || record.noteNumber || record.paymentNumber}</p>
              <p className="mt-1 text-sm text-gray-600">{activeTab === 'accounts' ? `${record.bank || '-'} - ${record.name}` : (record.customerName || record.supplierName || record.partnerName || record.documentName)}</p>
              <div className="mt-2 text-sm font-semibold">{renderAmount(record)}</div>
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

