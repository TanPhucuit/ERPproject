import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, PhoneCall } from 'lucide-react'
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

const leadFields: FormField[] = [
  { name: 'first_name', label: 'First Name', type: 'text', required: true },
  { name: 'last_name', label: 'Last Name', type: 'text', required: true },
  { name: 'company', label: 'Company', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  {
    name: 'status',
    label: 'Stage',
    type: 'select',
    required: true,
    options: [
      { value: 'new', label: 'New' },
      { value: 'qualified', label: 'Site Survey' },
      { value: 'proposition', label: 'Proposition' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
    ],
  },
  {
    name: 'lead_source',
    label: 'Source',
    type: 'select',
    options: [
      { value: 'website', label: 'Website' },
      { value: 'referral', label: 'Referral' },
      { value: 'showroom', label: 'Showroom' },
      { value: 'architect', label: 'Architect Partner' },
    ],
  },
  { name: 'estimated_value', label: 'Estimated Value', type: 'number' },
  { name: 'next_follow_up', label: 'Next Follow Up', type: 'date' },
  { name: 'internal_notes', label: 'Internal Notes', type: 'textarea' },
]

const activities = [
  { id: 'act-1', type: 'Call', description: 'Follow-up site survey for apartment package', date: '2024-03-15', time: '14:30' },
  { id: 'act-2', type: 'Email', description: 'Send SmartHome proposal and device list', date: '2024-03-16', time: '09:00' },
  { id: 'act-3', type: 'Meeting', description: 'Demo camera, smart lock, and sensor package', date: '2024-03-18', time: '10:30' },
]

const nextLeadStatus: Record<string, string> = {
  new: 'qualified',
  contacted: 'qualified',
  qualified: 'proposition',
  proposition: 'won',
}

const CRMModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('leads')
  const [leads, setLeads] = usePersistentState<any[]>('novatech.crm.leads', mockData.mockLeads)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalRecord, setModalRecord] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    erpApi
      .get<any[]>('/crm/leads?limit=100')
      .then((records) => {
        if (!records.length) return
        setLeads(
          records.map((lead) => ({
            ...lead,
            first_name: lead.first_name || lead.name?.split(' ')[0] || lead.company_name || '',
            last_name: lead.last_name || '',
            name: lead.name || lead.company_name || lead.lead_number,
            company: lead.company || lead.company_name || 'N/A',
            status: lead.status || lead.stage || 'new',
            estimated_value: lead.estimated_value || 0,
          }))
        )
      })
      .catch((error) => console.warn('CRM API load failed, keeping local data:', error.message))
  }, [setLeads])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const haystack = `${lead.first_name} ${lead.last_name} ${lead.name} ${lead.company} ${lead.email} ${lead.phone}`.toLowerCase()
      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesStatus = status === 'all' || lead.status === status
      return matchesSearch && matchesStatus
    })
  }, [leads, search, status])

  const openCreate = () => {
    setModalRecord({
      id: `lead-${Date.now()}`,
      status: 'new',
      lead_source: 'website',
      estimated_value: 0,
    })
    setModalOpen(true)
  }

  const handleSave = async (record: any) => {
    const fullName = record.name || `${record.first_name || ''} ${record.last_name || ''}`.trim()
    const nextRecord = { ...record, name: fullName, value: record.estimated_value }
    const payload = {
      lead_number: nextRecord.lead_number || `LEAD-${Date.now()}`,
      company_name: nextRecord.company || nextRecord.name,
      contact_name: nextRecord.name,
      email: nextRecord.email,
      phone: nextRecord.phone,
      stage: nextRecord.status || 'new',
      estimated_value: nextRecord.estimated_value || 0,
      probability_percent: nextRecord.status === 'won' ? 100 : 50,
      lead_source: nextRecord.lead_source,
    }
    try {
      if (leads.some((lead) => lead.id === nextRecord.id) && !nextRecord.id.startsWith('lead-')) {
        await erpApi.put(`/crm/leads/${nextRecord.id}`, payload)
      } else {
        const created = await erpApi.post<any>('/crm/leads', payload)
        nextRecord.id = created.id || nextRecord.id
      }
    } catch (error: any) {
      console.warn('CRM API save failed, saving locally:', error.message)
    }
    setLeads((current) => {
      const exists = current.some((lead) => lead.id === nextRecord.id)
      return exists ? current.map((lead) => (lead.id === nextRecord.id ? nextRecord : lead)) : [nextRecord, ...current]
    })
    setModalOpen(false)
  }

  const advanceLead = async (lead: any) => {
    const nextStatus = nextLeadStatus[lead.status]
    if (!nextStatus) return
    try {
      if (!lead.id.startsWith('lead-')) {
        await erpApi.put(`/crm/leads/${lead.id}`, { stage: nextStatus })
      }
    } catch (error: any) {
      console.warn('CRM API stage update failed, updating locally:', error.message)
    }
    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, status: nextStatus } : item)))
  }

  const renderLeadActions = (lead: any) => (
    <RecordActions
      onEdit={() => {
        setModalRecord(lead)
        setModalOpen(true)
      }}
      onDelete={() => setLeads((current) => current.filter((item) => item.id !== lead.id))}
      onAdvance={nextLeadStatus[lead.status] ? () => advanceLead(lead) : undefined}
      advanceLabel="Next Stage"
    />
  )

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="CRM"
        subtitle="Track SmartHome opportunities from new lead to won deal."
        primaryLabel="New Lead"
        onCreate={openCreate}
      />

      <ModuleTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'leads', label: 'Opportunities', count: leads.length },
          { id: 'activities', label: 'Activities', count: activities.length },
        ]}
      />

      {activeTab === 'leads' && (
        <>
          <ActionToolbar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            statuses={Array.from(new Set(leads.map((lead) => lead.status)))}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {viewMode === 'list' ? (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Opportunity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stage</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Expected Revenue</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{lead.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.company}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(lead.estimated_value || lead.value)}</td>
                      <td className="px-4 py-3">{renderLeadActions(lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <KanbanBoard
              records={filteredLeads}
              groupBy={(lead) => lead.status}
              renderCard={(lead) => (
                <div key={lead.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{lead.name}</p>
                      <p className="text-sm text-gray-600">{lead.company}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="text-sm font-semibold text-blue-700">{formatCurrency(lead.estimated_value || lead.value)}</p>
                  <div className="mt-3">{renderLeadActions(lead)}</div>
                </div>
              )}
            />
          )}
        </>
      )}

      {activeTab === 'activities' && (
        <div className="grid gap-4 md:grid-cols-3">
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <PhoneCall size={18} className="text-blue-600" />
                <span className="font-semibold text-gray-900">{activity.type}</span>
              </div>
              <p className="text-sm text-gray-700">{activity.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                {activity.date} at {activity.time}
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordModal
        isOpen={modalOpen}
        title={modalRecord?.id && leads.some((lead) => lead.id === modalRecord.id) ? 'Edit Lead' : 'Create Lead'}
        record={modalRecord}
        fields={leadFields}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}

export default CRMModule
