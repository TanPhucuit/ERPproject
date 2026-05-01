import { API_BASE_URL } from '../config/api'

const getAuthToken = () => localStorage.getItem('authToken')

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`,
}

export const crmApiService = {
  // ============= LEADS =============

  async getAllLeads(skip = 0, limit = 10, stage?: string) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())
    if (stage) query.append('stage', stage)

    const response = await fetch(`${API_BASE_URL}/api/crm/leads?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch leads: ${response.statusText}`)
    return response.json()
  },

  async getLeadById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/crm/leads/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch lead: ${response.statusText}`)
    return response.json()
  },

  async createLead(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/crm/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create lead: ${response.statusText}`)
    return response.json()
  },

  async updateLead(id: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/crm/leads/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to update lead: ${response.statusText}`)
    return response.json()
  },

  async changeLeadStage(id: string, stageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/crm/leads/${id}/stage`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ stageId }),
    })

    if (!response.ok) throw new Error(`Failed to change lead stage: ${response.statusText}`)
    return response.json()
  },

  // ============= ACTIVITIES =============

  async createActivity(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/crm/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create activity: ${response.statusText}`)
    return response.json()
  },

  async getActivitiesForLead(leadId: string) {
    const response = await fetch(`${API_BASE_URL}/api/crm/leads/${leadId}/activities`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch activities: ${response.statusText}`)
    return response.json()
  },

  async updateActivity(id: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/crm/activities/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to update activity: ${response.statusText}`)
    return response.json()
  },

  async completeActivity(id: string, outcome?: string) {
    const response = await fetch(`${API_BASE_URL}/api/crm/activities/${id}/complete`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ outcome }),
    })

    if (!response.ok) throw new Error(`Failed to complete activity: ${response.statusText}`)
    return response.json()
  },

  // ============= PIPELINE & STAGES =============

  async getLeadStages() {
    const response = await fetch(`${API_BASE_URL}/api/crm/lead-stages`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch lead stages: ${response.statusText}`)
    return response.json()
  },

  async getPipelineSummary() {
    const response = await fetch(`${API_BASE_URL}/api/crm/pipeline`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch pipeline: ${response.statusText}`)
    return response.json()
  },

  // ============= METRICS =============

  async getMetrics(period = 'month') {
    const response = await fetch(`${API_BASE_URL}/api/crm/metrics?period=${period}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    return response.json()
  },
}
