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

const invoiceFields: FormField[] = [
  { name: 'invoice_number', label: 'Invoice #', type: 'text', required: true },
  { name: 'customerName', label: 'Customer', type: 'text', required: true },
  { name: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date' },
  { name: 'total_amount', label: 'Total', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Posted' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
    ],
  },
  { name: 'payment_terms', label: 'Payment Terms', type: 'text' },
]

const billFields: FormField[] = [
  { name: 'billNumber', label: 'Bill #', type: 'text', required: true },
  { name: 'supplierName', label: 'Supplier', type: 'text', required: true },
  { name: 'billDate', label: 'Bill Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'total', label: 'Total', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'posted', label: 'Posted' },
      { value: 'paid', label: 'Paid' },
    ],
  },
]

const noteFields: FormField[] = [
  { name: 'noteNumber', label: 'Note #', type: 'text', required: true },
  { name: 'partnerName', label: 'Customer / Supplier', type: 'text', required: true },
  { name: 'noteDate', label: 'Date', type: 'date', required: true },
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  { name: 'total', label: 'Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'posted', label: 'Posted' },
    ],
  },
]

const flow: Record<string, string> = {
  draft: 'posted',
  pending: 'paid',
  posted: 'paid',
  overdue: 'paid',
}

const normalizeInvoice = (invoice: any) => ({
  ...invoice,
  customerName: invoice.customerName || invoice.customer?.name || invoice.customer || 'N/A',
})

const AccountingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState<any[]>([])
  const [vendorBills, setVendorBills] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [debits, setDebits] = useState<any[]>([])
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
        billNumber: bill.bill_number || bill.billNumber,
        supplierName: bill.supplier?.name || bill.supplierName || bill.supplier_id,
        billDate: bill.bill_date || bill.billDate,
        dueDate: bill.due_date || bill.dueDate,
        total: bill.total_amount || bill.total || 0,
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
        noteNumber: note.credit_note_number || note.noteNumber,
        partnerName: note.customer?.name || note.partnerName || note.customer_id,
        noteDate: note.credit_date || note.noteDate,
        total: note.total_amount || note.total || 0,
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
        noteNumber: note.debit_note_number || note.noteNumber,
        partnerName: note.supplier?.name || note.partnerName || note.supplier_id,
        noteDate: note.debit_date || note.noteDate,
        total: note.total_amount || note.total || 0,
      })))
      })
      .catch((error) => {
        setDebits([])
        setLoadError(error.message)
      })
  }, [])

  const activeRecords = activeTab === 'invoices' ? invoices : activeTab === 'bills' ? vendorBills : activeTab === 'credit-notes' ? credits : debits
  const activeFields = activeTab === 'invoices' ? invoiceFields : activeTab === 'bills' ? billFields : noteFields
  const activeTitle = activeTab === 'invoices' ? 'Customer Invoice' : activeTab === 'bills' ? 'Vendor Bill' : activeTab === 'credit-notes' ? 'Credit Note' : 'Debit Note'
  const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    invoices: setInvoices,
    bills: setVendorBills,
    'credit-notes': setCredits,
    'debit-notes': setDebits,
  }

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const reference = record.invoice_number || record.billNumber || record.noteNumber
      const partner = record.customerName || record.supplierName || record.partnerName
      const haystack = `${reference} ${partner} ${record.reason || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    const prefix = activeTab === 'invoices' ? 'INV' : activeTab === 'bills' ? 'BILL' : activeTab === 'credit-notes' ? 'CN' : 'DN'
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      invoice_number: `${prefix}-${Date.now().toString().slice(-5)}`,
      billNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      noteNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
      customerName: '',
      supplierName: '',
      partnerName: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      billDate: new Date().toISOString().slice(0, 10),
      noteDate: new Date().toISOString().slice(0, 10),
      due_date: '',
      dueDate: '',
      status: 'draft',
      total_amount: 0,
      total: 0,
      reason: '',
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

    try {
      const exists = activeRecords.some((item) => item.id === record.id)
      if (exists && (activeTab === 'invoices')) {
        await erpApi.put(`${path}/${record.id}`, record)
      } else if (!exists) {
        const created = await erpApi.post<any>(path, record)
        record.id = created.id || record.id
      }
    } catch (error: any) {
      console.warn('Accounting API save failed, saving locally:', error.message)
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
        onDelete={() => setters[activeTab]((current) => current.filter((item) => item.id !== record.id))}
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
