import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Edit2,
  Grid3X3,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

export type ViewMode = 'list' | 'kanban'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
}

export const formatCurrency = (value: number) =>
  (value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  })

export const statusTone = (status: string = '') => {
  const normalized = status.toLowerCase()
  if (['won', 'paid', 'completed', 'received', 'delivered', 'normal', 'active', 'cleared'].includes(normalized)) {
    return 'bg-green-100 text-green-700 border-green-200'
  }
  if (['confirmed', 'sent', 'qualified', 'in_transit', 'issued', 'shipped'].includes(normalized)) {
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }
  if (['pending', 'draft', 'contacted', 'new', 'open'].includes(normalized)) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
  if (['low', 'critical', 'overdue', 'lost', 'cancelled', 'rejected'].includes(normalized)) {
    return 'bg-red-100 text-red-700 border-red-200'
  }
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>
    {status || 'draft'}
  </span>
)

export const ModuleHeader: React.FC<{
  title: string
  subtitle: string
  primaryLabel: string
  onCreate: () => void
}> = ({ title, subtitle, primaryLabel, onCreate }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-gray-600">{subtitle}</p>
    </div>
    <button
      onClick={onCreate}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
    >
      <Plus size={18} />
      {primaryLabel}
    </button>
  </div>
)

export const ModuleTabs: React.FC<{
  tabs: Array<{ id: string; label: string; count: number }>
  activeTab: string
  onChange: (tab: string) => void
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
          activeTab === tab.id
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900'
        }`}
      >
        {tab.label} ({tab.count})
      </button>
    ))}
  </div>
)

export const ActionToolbar: React.FC<{
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  statuses: string[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}> = ({ search, onSearchChange, status, onStatusChange, statuses, viewMode, onViewModeChange }) => (
  <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search records..."
        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <option value="all">All Statuses</option>
        {statuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <div className="inline-flex rounded-md border border-gray-300 bg-white p-1">
        <button
          onClick={() => onViewModeChange('list')}
          className={`rounded px-3 py-1.5 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          title="List view"
        >
          <List size={17} />
        </button>
        <button
          onClick={() => onViewModeChange('kanban')}
          className={`rounded px-3 py-1.5 ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          title="Kanban view"
        >
          <Grid3X3 size={17} />
        </button>
      </div>
    </div>
  </div>
)

export const RecordActions: React.FC<{
  onEdit: () => void
  onDelete: () => void
  onAdvance?: () => void
  advanceLabel?: string
}> = ({ onEdit, onDelete, onAdvance, advanceLabel = 'Next' }) => (
  <div className="flex items-center gap-1">
    {onAdvance && (
      <button
        onClick={onAdvance}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
      >
        <Check size={14} />
        {advanceLabel}
      </button>
    )}
    <button onClick={onEdit} className="rounded p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700" title="Edit">
      <Edit2 size={16} />
    </button>
    <button onClick={onDelete} className="rounded p-2 text-red-600 hover:bg-red-50" title="Delete">
      <Trash2 size={16} />
    </button>
  </div>
)

export const KanbanBoard: React.FC<{
  records: any[]
  groupBy: (record: any) => string
  renderCard: (record: any) => React.ReactNode
}> = ({ records, groupBy, renderCard }) => {
  const groups = useMemo(() => {
    return records.reduce<Record<string, any[]>>((acc, record) => {
      const key = groupBy(record) || 'draft'
      acc[key] = acc[key] || []
      acc[key].push(record)
      return acc
    }, {})
  }, [records, groupBy])

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="rounded-md border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{group}</h3>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-600">{items.length}</span>
          </div>
          <div className="space-y-3 p-3">{items.map(renderCard)}</div>
        </div>
      ))}
    </div>
  )
}

export const RecordModal: React.FC<{
  isOpen: boolean
  title: string
  record: any
  fields: FormField[]
  onClose: () => void
  onSave: (record: any) => void
}> = ({ isOpen, title, record, fields, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(record || {})
    setErrors({})
  }, [record, isOpen])

  if (!isOpen) return null

  const handleChange = (field: FormField, value: string) => {
    const nextValue = field.type === 'number' ? Number(value) : value
    setFormData((current: any) => ({ ...current, [field.name]: nextValue }))
    if (errors[field.name]) {
      setErrors((current) => ({ ...current, [field.name]: '' }))
    }
  }

  const handleSave = () => {
    const nextErrors: Record<string, string> = {}
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        nextErrors[field.name] = `${field.label} is required`
      }
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    disabled={field.disabled}
                    onChange={(event) => handleChange(field, event.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    disabled={field.disabled}
                    onChange={(event) => handleChange(field, event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    disabled={field.disabled}
                    onChange={(event) => handleChange(field, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  />
                )}
                {errors[field.name] && <p className="mt-1 text-xs font-medium text-red-600">{errors[field.name]}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
