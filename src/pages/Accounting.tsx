import React, { useEffect, useMemo, useState } from 'react'
import { Download, Trash2, X } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import { exportInvoiceToPDF, exportVendorBillToPDF } from '../services/pdfExportService'
import {
  ActionToolbar,
  formatCurrency,
  FormField,
  KanbanBoard,
  ModuleHeader,
  ModuleTabs,
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
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
    { value: 'cash', label: 'Cash' },
  ] },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'sourceAccountId', label: 'Source Account', type: 'select', options: [] },
  { name: 'targetAccountId', label: 'Target Account', type: 'select', options: [] },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const accountLabel = (account: any) =>
  account ? `${account.account_number || account.accountNumber} - ${account.name}` : ''

const normalizeInvoice = (invoice: any) => ({
  ...invoice,
  invoiceNumber: invoice.invoice_number,
  salesOrderId: invoice.sales_order_id,
  customerName: invoice.customer?.name || invoice.sales_order?.customer?.full_name || invoice.customer_id,
  customerAccountId: invoice.customer?.account_id || invoice.sales_order?.customer?.account_id || '',
  customerAccount: invoice.customer?.account || invoice.sales_order?.customer?.account,
  invoiceDate: invoice.issue_date,
  dueDate: invoice.due_date,
  netAmount: invoice.net_amount,
  subtotal: invoice.subtotal || invoice.net_amount,
  taxAmount: Number(invoice.tax_amount) > 0 ? invoice.tax_amount : Math.round(Number(invoice.subtotal || invoice.net_amount || 0) * 0.1),
  totalAmount: Number(invoice.total_amount) > 0
    ? Number(invoice.total_amount)
    : Number(invoice.subtotal || invoice.net_amount || 0) + (Number(invoice.tax_amount) > 0 ? Number(invoice.tax_amount) : Math.round(Number(invoice.subtotal || invoice.net_amount || 0) * 0.1)),
  warrantyOrderId: invoice.warranty_orders_id,
  notes: invoice.notes,
  cancellationReason: invoice.cancellation_reason,
  lines: invoice.lines || invoice.items || [],
  items: invoice.items || invoice.lines || [],
})

const normalizeBill = (bill: any) => ({
  ...bill,
  billNumber: bill.bill_number,
  purchaseOrderId: bill.purchase_order_id,
  purchaseOrderNumber: bill.purchase_order_number || bill.purchase_order?.order_number || bill.purchase_order_id?.slice(0, 8),
  productCount: bill.product_count || bill.lines?.length || bill.items?.length || 0,
  supplierAccountId: bill.supplier?.account_id || bill.purchase_order?.supplier?.account_id || '',
  supplierAccount: bill.supplier?.account || bill.purchase_order?.supplier?.account,
  billDate: bill.issue_date,
  dueDate: bill.due_date,
  subtotal: bill.subtotal,
  taxAmount: Number(bill.tax_amount) > 0 ? bill.tax_amount : Math.round(Number(bill.subtotal || 0) * 0.1),
  totalAmount: Number(bill.subtotal || 0) + (Number(bill.tax_amount) > 0 ? Number(bill.tax_amount) : Math.round(Number(bill.subtotal || 0) * 0.1)),
  cancellationReason: bill.cancellation_reason,
  notes: bill.notes,
  lines: bill.lines || bill.items || [],
  items: bill.items || bill.lines || [],
})

const normalizeRefundRequest = (refund: any) => ({
  ...refund,
  refundNumber: refund.refund_number || refund.refundNumber,
  customerName: refund.customer?.name || refund.customer?.full_name || refund.customer_name,
  customerAccountId: refund.customer?.account_id || '',
  customerAccount: refund.customer?.account,
  salesReturnNumber: refund.sales_return?.return_number || refund.salesReturnNumber,
  salesOrderNumber: refund.sales_return?.sales_order?.order_number || refund.sales_order_number,
  requestDate: refund.request_date || refund.requestDate,
  totalAmount: Number(refund.totalAmount ?? refund.total_amount ?? refund.amount ?? 0),
  amountDue: Number(refund.amountDue ?? refund.amount_due ?? refund.totalAmount ?? refund.total_amount ?? refund.amount ?? 0),
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

const buildPaymentMap = (payments: any[], documentType: 'invoice' | 'vendor_bill' | 'refund_request') => payments.reduce((map, payment) => {
  const key = documentType === 'invoice'
    ? payment.invoice_id
    : documentType === 'vendor_bill'
      ? payment.vendor_bill_id
      : payment.refund_request_id
  if (!key) return map
  map.set(key, (map.get(key) || 0) + Number(payment.amount || 0))
  return map
}, new Map<string, number>())

const applyRefundPayments = (refund: any, paymentMap: Map<string, number>) => {
  const paidAmount = paymentMap.get(refund.id) || 0
  const totalAmount = Number(refund.totalAmount ?? refund.total_amount ?? refund.amount ?? 0)
  return {
    ...refund,
    totalAmount,
    paidAmount,
    amountDue: Math.max(totalAmount - paidAmount, 0),
  }
}

const applyAdjustment = (
  record: any,
  adjustmentMap: Map<string, { amount: number; reasons: string[] }>,
  paymentMap = new Map<string, number>(),
) => {
  const adjustment = adjustmentMap.get(record.id)
  const baseAmount = Number(record.totalAmount || record.total || 0)
  const adjustmentAmount = adjustment?.amount || 0
  const paidAmount = paymentMap.get(record.id) || 0
  return {
    ...record,
    adjustmentAmount,
    adjustmentReason: adjustment?.reasons.join('; ') || '',
    paidAmount,
    amountDue: Math.max(baseAmount - adjustmentAmount - paidAmount, 0),
  }
}

const normalizePayment = (payment: any) => ({
  ...payment,
  paymentNumber: payment.id?.slice(0, 8),
  documentType: payment.invoice_id ? 'invoice' : payment.vendor_bill_id ? 'vendor_bill' : 'refund_request',
  documentId: payment.invoice_id || payment.vendor_bill_id || payment.refund_request_id,
  documentName: payment.invoice?.invoice_number || payment.vendor_bill?.bill_number || payment.refund_request?.refund_number || payment.invoice_id || payment.vendor_bill_id || payment.refund_request_id,
  paymentDate: payment.payment_date,
  paymentMethod: payment.payment_method,
  paymentAccount: payment.payment_account,
  targetAccount: payment.target_account,
  sourceAccountName: accountLabel(payment.source_account),
  targetAccountName: accountLabel(payment.destination_account),
  status: 'posted',
})

const normalizeAccount = (account: any) => ({
  ...account,
  accountNumber: account.account_number,
  status: 'active',
})

const PaymentModal: React.FC<{
  isOpen: boolean
  record: any
  invoices: any[]
  vendorBills: any[]
  refundRequests: any[]
  accounts: any[]
  companyAccount: any
  onClose: () => void
  onSave: (record: any) => void
}> = ({ isOpen, record, invoices, vendorBills, refundRequests, companyAccount, onClose, onSave }) => {
  const [form, setForm] = useState<any>(record || {})

  useEffect(() => {
    setForm(record || {})
  }, [record, isOpen])

  if (!isOpen) return null

  const documentType = form.documentType || 'invoice'
  const documents = documentType === 'invoice'
    ? invoices
    : documentType === 'vendor_bill'
      ? vendorBills
      : refundRequests
  const selectedDocument = documents.find((item) => item.id === form.documentId)
  const isCash = form.paymentMethod === 'cash'
  const isRefund = documentType === 'refund_request'
  const sourceAccount = isCash
    ? null
    : documentType === 'invoice'
      ? selectedDocument?.customerAccount
      : companyAccount
  const targetAccount = isCash
    ? null
    : documentType === 'invoice'
      ? companyAccount
      : isRefund
        ? selectedDocument?.customerAccount
        : selectedDocument?.supplierAccount

  const updateDocumentType = (nextType: string) => {
    setForm((current: any) => ({
      ...current,
      documentType: nextType,
      documentId: '',
      paymentMethod: nextType === 'refund_request' ? 'bank_transfer' : current.paymentMethod || 'bank_transfer',
      amount: 0,
      sourceAccountId: '',
      targetAccountId: '',
    }))
  }

  const updateDocument = (documentId: string) => {
    const doc = documents.find((item) => item.id === documentId)
    setForm((current: any) => ({
      ...current,
      documentId,
      amount: doc?.amountDue ?? doc?.totalAmount ?? doc?.total_amount ?? doc?.total ?? doc?.amount ?? 0,
      sourceAccountId: '',
      targetAccountId: '',
      notes: `Payment for ${doc?.invoiceNumber || doc?.billNumber || doc?.refundNumber || doc?.id || ''}`,
    }))
  }

  const updatePaymentMethod = (paymentMethod: string) => {
    setForm((current: any) => ({
      ...current,
      paymentMethod,
      sourceAccountId: paymentMethod === 'cash' ? '' : current.sourceAccountId,
      targetAccountId: paymentMethod === 'cash' ? '' : current.targetAccountId,
    }))
  }

  const handleSave = () => {
    onSave({
      ...form,
      sourceAccountId: isCash ? null : sourceAccount?.id,
      targetAccountId: isCash ? null : targetAccount?.id,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Create Payment</h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Payment For *</label>
              <select value={documentType} onChange={(event) => updateDocumentType(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="invoice">Customer Invoice</option>
                <option value="vendor_bill">Vendor Bill</option>
                <option value="refund_request">Refund Request</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Document *</label>
              <select value={form.documentId || ''} onChange={(event) => updateDocument(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select document</option>
                {documents.filter((doc) => !['paid', 'cancelled'].includes(String(doc.status || '').toLowerCase())).map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.invoiceNumber || doc.billNumber || doc.refundNumber} - {doc.customerName || doc.purchaseOrderNumber || doc.salesReturnNumber || 'Document'} - due {formatCurrency(doc.amountDue ?? doc.totalAmount ?? doc.total_amount ?? doc.total ?? doc.amount ?? 0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Payment Date *</label>
              <input type="date" value={form.paymentDate || ''} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Payment Method *</label>
              <select value={form.paymentMethod || 'bank_transfer'} disabled={isRefund} onChange={(event) => updatePaymentMethod(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="bank_transfer">Bank Transfer</option>
                {!isRefund && <option value="cash">Cash</option>}
                {!isRefund && <option value="card">Card</option>}
                {!isRefund && <option value="other">Other</option>}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Amount *</label>
              <input type="number" min={0} value={form.amount || 0} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Source Account</label>
              <input readOnly value={isCash ? 'Cash payment - bank account not used' : accountLabel(sourceAccount) || 'Missing required source account'}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Target Account</label>
              <input readOnly value={isCash ? 'Cash payment - bank account not used' : accountLabel(targetAccount) || 'Missing required target account'}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Notes</label>
              <textarea value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={handleSave} disabled={!form.documentId || !Number(form.amount) || (!isCash && (!sourceAccount?.id || !targetAccount?.id))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            Post Payment
          </button>
        </div>
      </div>
    </div>
  )
}

const AccountingModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState<any[]>([])
  const [vendorBills, setVendorBills] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [debits, setDebits] = useState<any[]>([])
  const [refundRequests, setRefundRequests] = useState<any[]>([])
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
  const [cancelRecord, setCancelRecord] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')

  const loadAccounting = async () => {
    try {
      const [invoiceData, billData, creditData, debitData, refundData, accountData, paymentData] = await Promise.all([
        erpApi.get<any[]>('/accounting/invoices?limit=100'),
        erpApi.get<any[]>('/accounting/bills?limit=100'),
        erpApi.get<any[]>('/accounting/credit-notes?limit=100'),
        erpApi.get<any[]>('/accounting/debit-notes?limit=100'),
        erpApi.get<any[]>('/accounting/refund-requests?limit=100'),
        erpApi.get<any[]>('/accounting/accounts'),
        erpApi.get<any[]>('/accounting/payments?limit=100'),
      ])
      setLoadError(null)
      const normalizedCredits = creditData.map((note) => normalizeNote(note, true))
      const normalizedDebits = debitData.map((note) => normalizeNote(note, false))
      const normalizedPayments = paymentData.map(normalizePayment)
      const creditMap = buildAdjustmentMap(normalizedCredits)
      const debitMap = buildAdjustmentMap(normalizedDebits)
      const invoicePaymentMap = buildPaymentMap(normalizedPayments, 'invoice')
      const billPaymentMap = buildPaymentMap(normalizedPayments, 'vendor_bill')
      const refundPaymentMap = buildPaymentMap(normalizedPayments, 'refund_request')
      setInvoices(invoiceData.map(normalizeInvoice).map((invoice) => applyAdjustment(invoice, creditMap, invoicePaymentMap)))
      setVendorBills(billData.map(normalizeBill).map((bill) => applyAdjustment(bill, debitMap, billPaymentMap)))
      setCredits(normalizedCredits)
      setDebits(normalizedDebits)
      setRefundRequests(refundData.map(normalizeRefundRequest).map((refund) => applyRefundPayments(refund, refundPaymentMap)))
      setAccounts(accountData.map(normalizeAccount))
      setPayments(normalizedPayments)
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

  const activeRecords = activeTab === 'invoices' ? invoices : activeTab === 'bills' ? vendorBills : activeTab === 'credit-notes' ? credits : activeTab === 'debit-notes' ? debits : activeTab === 'refund-requests' ? refundRequests : activeTab === 'payments' ? payments : accounts
  const salesOrderOptions = useMemo(() => salesOrders.map((so) => ({ value: so.id, label: `${so.sales_order_number} - ${so.customer?.name || 'Customer'}` })), [salesOrders])
  const purchaseOrderOptions = useMemo(() => purchaseOrders.map((po) => ({ value: po.id, label: `${po.purchase_order_number} - ${po.supplier?.name || 'Supplier'}` })), [purchaseOrders])
  const invoiceOptions = useMemo(() => invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoiceNumber} - ${invoice.customerName || 'Customer'}` })), [invoices])
  const billOptions = useMemo(() => vendorBills.map((bill) => ({ value: bill.id, label: `${bill.billNumber} - ${bill.purchaseOrderNumber || 'Purchase Order'}` })), [vendorBills])
  const refundOptions = useMemo(() => refundRequests.map((refund) => ({ value: refund.id, label: `${refund.refundNumber} - ${refund.customerName || 'Customer'}` })), [refundRequests])
  const companyAccount = useMemo(() => accounts.find((account) => account.is_novatech_default), [accounts])
  const paymentDocument = useMemo(() => {
    if (!modalRecord?.documentId) return null
    return invoices.find((invoice) => invoice.id === modalRecord.documentId)
      || vendorBills.find((bill) => bill.id === modalRecord.documentId)
      || refundRequests.find((refund) => refund.id === modalRecord.documentId)
      || null
  }, [modalRecord?.documentId, invoices, vendorBills, refundRequests])
  const paymentDocumentType = modalRecord?.documentType
    || (paymentDocument && 'invoiceNumber' in paymentDocument ? 'invoice' : paymentDocument && 'billNumber' in paymentDocument ? 'vendor_bill' : paymentDocument ? 'refund_request' : 'invoice')
  const sourceAccountOptions = useMemo(() => {
    if (!modalRecord || modalRecord.paymentMethod === 'cash') return []
    if (paymentDocumentType === 'invoice') {
      const account = paymentDocument?.customerAccount
      return account ? [{ value: account.id, label: accountLabel(account) }] : []
    }
    return companyAccount ? [{ value: companyAccount.id, label: accountLabel(companyAccount) }] : []
  }, [modalRecord, paymentDocumentType, paymentDocument, companyAccount])
  const targetAccountOptions = useMemo(() => {
    if (!modalRecord || modalRecord.paymentMethod === 'cash') return []
    if (paymentDocumentType === 'invoice') {
      return companyAccount ? [{ value: companyAccount.id, label: accountLabel(companyAccount) }] : []
    }
    const account = paymentDocumentType === 'refund_request' ? paymentDocument?.customerAccount : paymentDocument?.supplierAccount
    return account ? [{ value: account.id, label: accountLabel(account) }] : []
  }, [modalRecord, paymentDocumentType, paymentDocument, companyAccount])

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
        if (field.name === 'documentId') return { ...field, options: [...invoiceOptions, ...billOptions, ...refundOptions] }
        if (field.name === 'paymentMethod' && paymentDocumentType === 'refund_request') return { ...field, options: [{ value: 'bank_transfer', label: 'Bank Transfer' }], disabled: true }
        if (field.name === 'sourceAccountId') return { ...field, options: sourceAccountOptions, disabled: modalRecord?.paymentMethod === 'cash' }
        if (field.name === 'targetAccountId') return { ...field, options: targetAccountOptions, disabled: modalRecord?.paymentMethod === 'cash' }
        return field
      })
    }
    if (activeTab === 'accounts') return accountFieldsBase
    return noteFieldsBase.map((field) => {
      if (field.name === 'referenceDocument') return { ...field, options: billOptions }
      return field
    })
  }, [activeTab, salesOrderOptions, purchaseOrderOptions, invoiceOptions, billOptions, refundOptions, paymentDocumentType, sourceAccountOptions, targetAccountOptions, modalRecord?.paymentMethod])
  const activeTitle = activeTab === 'invoices' ? 'Customer Invoice' : activeTab === 'bills' ? 'Vendor Bill' : activeTab === 'credit-notes' ? 'Credit Note' : activeTab === 'debit-notes' ? 'Debit Note' : activeTab === 'refund-requests' ? 'Refund Request' : activeTab === 'payments' ? 'Payment' : 'Account'
  const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    invoices: setInvoices,
    bills: setVendorBills,
    'credit-notes': setCredits,
    'debit-notes': setDebits,
    'refund-requests': setRefundRequests,
    payments: setPayments,
    accounts: setAccounts,
  }

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const reference = record.invoiceNumber || record.billNumber || record.noteNumber || record.refundNumber || record.paymentNumber
      const partner = record.customerName || record.purchaseOrderNumber || record.partnerName || record.documentName || record.salesReturnNumber
      const account = `${record.accountNumber || ''} ${record.bank || ''} ${record.name || ''}`
      const haystack = `${reference || ''} ${partner || ''} ${record.reason || ''} ${account}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    if (activeTab === 'refund-requests') {
      showNotification('info', 'Refund requests are created automatically from sales returns.')
      return
    }
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
      paymentMethod: 'bank_transfer',
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
              : activeTab === 'refund-requests'
                ? '/accounting/refund-requests'
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
      refund_request_id: refundRequests.some((refund) => refund.id === record.documentId) ? record.documentId : null,
      payment_date: record.paymentDate,
      payment_method: record.paymentMethod,
      payment_account: record.sourceAccountId || record.paymentAccount || null,
      target_account: record.targetAccountId || record.targetAccount || null,
      amount: record.amount,
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
    const isRefund = activeTab === 'refund-requests'
    setActiveTab('payments')
    setModalRecord({
      id: `payments-${Date.now()}`,
      documentType: isRefund ? 'refund_request' : isInvoice ? 'invoice' : 'vendor_bill',
      documentId: record.id,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      amount: record.amountDue ?? record.totalAmount ?? record.total_amount ?? record.total ?? 0,
      sourceAccountId: isInvoice ? record.customerAccountId : companyAccount?.id || '',
      targetAccountId: isInvoice ? companyAccount?.id || '' : record.customerAccountId || record.supplierAccountId || '',
      notes: `Payment for ${record.invoiceNumber || record.billNumber || record.refundNumber || record.id}`,
    })
    setModalOpen(true)
  }

  const openCancel = (record: any) => {
    setCancelRecord(record)
    setCancelReason('')
  }

  const confirmCancel = async () => {
    if (!cancelRecord || !cancelReason.trim()) {
      showNotification('error', 'Please enter a cancellation reason.')
      return
    }
    const path = activeTab === 'invoices' ? '/accounting/invoices' : '/accounting/bills'
    try {
      await erpApi.put(`${path}/${cancelRecord.id}`, {
        status: 'cancelled',
        cancellation_reason: cancelReason.trim(),
      })
      await loadAccounting()
      setCancelRecord(null)
      setCancelReason('')
      showNotification('success', `${activeTitle} cancelled.`)
    } catch (error: any) {
      showNotification('error', `Cancel failed: ${error.message}`)
    }
  }

  const renderAmount = (record: any) => {
    if (activeTab === 'accounts') return formatCurrency(record.balance)
    if (activeTab === 'payments') return formatCurrency(record.amount)
    if (['invoices', 'bills', 'refund-requests'].includes(activeTab)) {
      const label = activeTab === 'invoices' ? 'Credit note' : 'Debit note'
      const totalAmount = Number(record.totalAmount ?? record.total_amount ?? record.total ?? record.amount ?? 0)
      const paidAmount = Number(record.paidAmount ?? 0)
      const amountDue = Number(record.amountDue ?? totalAmount)
      return (
        <div className="space-y-1 text-right">
          <p className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
          {(activeTab === 'invoices' || activeTab === 'bills') && record.adjustmentAmount > 0 && (
            <p className="text-xs font-medium text-emerald-700">{label}: -{formatCurrency(record.adjustmentAmount)}</p>
          )}
          {paidAmount > 0 && <p className="text-xs font-medium text-blue-700">Paid: {formatCurrency(paidAmount)}</p>}
          <p className="text-xs font-medium text-gray-600">Due: {formatCurrency(amountDue)}</p>
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
      {activeTab === 'bills' && (
        <button onClick={() => exportVendorBillToPDF(record)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Download PDF">
          <Download size={16} />
        </button>
      )}
      {['invoices', 'bills', 'refund-requests'].includes(activeTab) && !['paid', 'cancelled'].includes(record.status) && (
        <button onClick={() => openPaymentFor(record)} className="rounded px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50" title="Create payment">
          {activeTab === 'refund-requests' ? 'Refund' : 'Pay'}
        </button>
      )}
      {['invoices', 'bills'].includes(activeTab) && !['paid', 'cancelled'].includes(record.status) ? (
        <button onClick={() => openCancel(record)} className="rounded p-2 text-red-600 hover:bg-red-50" title="Cancel">
          <Trash2 size={16} />
        </button>
      ) : activeTab === 'refund-requests' || activeTab === 'invoices' || activeTab === 'bills' || activeTab === 'payments' || activeTab === 'credit-notes' || activeTab === 'debit-notes' ? (
        null
      ) : (
        <button onClick={() => {
          setModalRecord(record)
          setModalOpen(true)
        }} className="rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
          Edit
        </button>
      )}
    </div>
  )

  const productCountLabel = (record: any) => `${record.productCount || record.product_count || record.lines?.length || record.items?.length || 0} products`
  const partnerDisplay = (record: any) => activeTab === 'bills'
    ? (record.purchaseOrderNumber || record.purchase_order_number || record.purchase_order_id || '-')
    : activeTab === 'refund-requests'
      ? (record.customerName || '-')
    : (record.customerName || record.partnerName || record.documentName)
  const dateDisplay = (record: any) => activeTab === 'bills'
    ? productCountLabel(record)
    : activeTab === 'refund-requests'
      ? (record.salesReturnNumber || record.sales_return_id || '-')
    : (record.invoiceDate || record.billDate || record.noteDate || record.paymentDate)

  const totalReceivable = invoices
    .filter((invoice) => !['paid', 'cancelled'].includes(String(invoice.status || '').toLowerCase()))
    .reduce((sum, invoice) => sum + (invoice.amountDue ?? invoice.total_amount ?? 0), 0)
  const totalPayable = vendorBills
    .filter((bill) => !['paid', 'cancelled'].includes(String(bill.status || '').toLowerCase()))
    .reduce((sum, bill) => sum + (bill.amountDue ?? bill.total ?? 0), 0)

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
          { id: 'refund-requests', label: 'Refund Requests', count: refundRequests.length },
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Bank' : activeTab === 'bills' ? 'Purchase Order' : 'Partner'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Account Name' : activeTab === 'bills' ? 'Products' : activeTab === 'refund-requests' ? 'Sales Return' : 'Date'}</th>
                {activeTab !== 'accounts' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>}
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{activeTab === 'accounts' ? 'Balance' : 'Amount'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.accountNumber || record.invoiceNumber || record.billNumber || record.noteNumber || record.refundNumber || record.paymentNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'accounts' ? (record.bank || '-') : partnerDisplay(record)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'accounts' ? record.name : dateDisplay(record)}</td>
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
              <p className="mt-1 text-sm text-gray-600">{activeTab === 'accounts' ? `${record.bank || '-'} - ${record.name}` : partnerDisplay(record)}</p>
              {activeTab === 'bills' && <p className="mt-1 text-sm text-gray-600">{productCountLabel(record)}</p>}
              <div className="mt-2 text-sm font-semibold">{renderAmount(record)}</div>
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      {cancelRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Cancel {activeTab === 'invoices' ? 'Invoice' : 'Vendor Bill'}</h2>
            </div>
            <div className="space-y-3 p-6">
              <p className="text-sm text-gray-600">
                {cancelRecord.invoiceNumber || cancelRecord.billNumber}
              </p>
              <label className="block text-sm font-semibold text-gray-700">Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button onClick={() => setCancelRecord(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
                Close
              </button>
              <button onClick={confirmCancel} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' ? (
        <PaymentModal
          isOpen={modalOpen}
          record={modalRecord}
          invoices={invoices}
          vendorBills={vendorBills}
          refundRequests={refundRequests}
          accounts={accounts}
          companyAccount={companyAccount}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      ) : (
        <RecordModal
          isOpen={modalOpen}
          title={`${modalRecord && activeRecords.some((item) => item.id === modalRecord.id) ? 'Edit' : 'Create'} ${activeTitle}`}
          record={modalRecord}
          fields={activeFields}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  )
}

export default AccountingModule

