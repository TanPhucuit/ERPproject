import { create } from 'zustand'
import { Lead } from '../types'
import { crmService } from '../services/crmService'

interface CRMStore {
  leads: Lead[]
  leadsByStage: Record<string, Lead[]>
  isLoading: boolean
  error: string | null
  fetchLeads: (params?: any) => Promise<void>
  fetchLeadsByStage: () => Promise<void>
  getLeadById: (id: string) => Lead | undefined
  createLead: (lead: Omit<Lead, 'id'>) => Promise<void>
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>
  updateLeadStage: (id: string, stage: string) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  setError: (error: string | null) => void
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  leads: [],
  leadsByStage: {},
  isLoading: false,
  error: null,

  fetchLeads: async (params?: any) => {
    try {
      set({ isLoading: true, error: null })
      const data = await crmService.getAllLeads(params)
      set({ leads: data })
    } catch (error) {
      set({ error: 'Failed to fetch leads' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchLeadsByStage: async () => {
    try {
      const data = await crmService.getLeadsByStage()
      set({ leadsByStage: data })
    } catch (error) {
      console.error('Failed to fetch leads by stage:', error)
    }
  },

  getLeadById: (id: string) => {
    return get().leads.find((l) => l.id === id)
  },

  createLead: async (lead: Omit<Lead, 'id'>) => {
    try {
      set({ isLoading: true, error: null })
      const newLead = await crmService.createLead(lead)
      set((state) => ({
        leads: [...state.leads, newLead],
      }))
    } catch (error) {
      set({ error: 'Failed to create lead' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateLead: async (id: string, lead: Partial<Lead>) => {
    try {
      set({ isLoading: true, error: null })
      const updated = await crmService.updateLead(id, lead)
      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? updated : l)),
      }))
    } catch (error) {
      set({ error: 'Failed to update lead' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateLeadStage: async (id: string, stage: string) => {
    try {
      await crmService.updateLeadStage(id, stage)
      await get().fetchLeads()
    } catch (error) {
      set({ error: 'Failed to update lead stage' })
      throw error
    }
  },

  deleteLead: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await crmService.deleteLead(id)
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id),
      }))
    } catch (error) {
      set({ error: 'Failed to delete lead' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  setError: (error) => set({ error }),
}))
