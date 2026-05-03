import apiClient from './apiClient'
import { Lead } from '../types'
import { API_ENDPOINTS } from '../config/api'

export const crmService = {
  // Leads
  getAllLeads: async (params?: { skip?: number; limit?: number; stage?: string }) => {
    return apiClient.get<Lead[]>(API_ENDPOINTS.LEADS, { params })
  },

  getLeadById: async (id: string) => {
    return apiClient.get<Lead>(API_ENDPOINTS.LEAD(id))
  },

  createLead: async (data: Omit<Lead, 'id'>) => {
    return apiClient.post<Lead>(API_ENDPOINTS.LEADS, data)
  },

  updateLead: async (id: string, data: Partial<Lead>) => {
    return apiClient.put<Lead>(API_ENDPOINTS.LEAD(id), data)
  },

  updateLeadStage: async (id: string, stage: string) => {
    return apiClient.patch<Lead>(API_ENDPOINTS.LEAD(id), { stage })
  },

  deleteLead: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.LEAD(id))
  },

  // Get lead metrics
  getLeadMetrics: async () => {
    return apiClient.get<any>(`/metrics/leads`)
  },

  // Get leads by stage (for Kanban view)
  getLeadsByStage: async () => {
    return apiClient.get<Record<string, Lead[]>>(`/leads/by-stage`)
  },
}
