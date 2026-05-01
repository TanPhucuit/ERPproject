import { API_BASE_URL } from '../config/api'

const getAuthToken = () => localStorage.getItem('authToken')

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`,
}

export const accountingApiService = {
  // ============= INVOICES =============

  async getAllInvoices(skip = 0, limit = 10, status?: string) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())
    if (status) query.append('status', status)

    const response = await fetch(`${API_BASE_URL}/accounting/invoices?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch invoices: ${response.statusText}`)
    return response.json()
  },

  async getInvoiceById(id: string) {
    const response = await fetch(`${API_BASE_URL}/accounting/invoices/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch invoice: ${response.statusText}`)
    return response.json()
  },

  async createInvoice(payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create invoice: ${response.statusText}`)
    return response.json()
  },

  async updateInvoice(id: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/invoices/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to update invoice: ${response.statusText}`)
    return response.json()
  },

  // ============= BILLS =============

  async getAllBills(skip = 0, limit = 10, status?: string) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())
    if (status) query.append('status', status)

    const response = await fetch(`${API_BASE_URL}/accounting/bills?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch bills: ${response.statusText}`)
    return response.json()
  },

  async getBillById(id: string) {
    const response = await fetch(`${API_BASE_URL}/accounting/bills/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch bill: ${response.statusText}`)
    return response.json()
  },

  async createBill(payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/bills`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create bill: ${response.statusText}`)
    return response.json()
  },

  // ============= CREDIT NOTES =============

  async createCreditNote(payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/credit-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create credit note: ${response.statusText}`)
    return response.json()
  },

  async getAllCreditNotes(skip = 0, limit = 10) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())

    const response = await fetch(`${API_BASE_URL}/accounting/credit-notes?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch credit notes: ${response.statusText}`)
    return response.json()
  },

  // ============= DEBIT NOTES =============

  async createDebitNote(payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/debit-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create debit note: ${response.statusText}`)
    return response.json()
  },

  async getAllDebitNotes(skip = 0, limit = 10) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())

    const response = await fetch(`${API_BASE_URL}/accounting/debit-notes?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch debit notes: ${response.statusText}`)
    return response.json()
  },

  // ============= PAYMENTS =============

  async recordPayment(payload: any) {
    const response = await fetch(`${API_BASE_URL}/accounting/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to record payment: ${response.statusText}`)
    return response.json()
  },

  async getOutstandingInvoices(customerId: string) {
    const response = await fetch(`${API_BASE_URL}/accounting/outstanding-invoices/${customerId}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch outstanding invoices: ${response.statusText}`)
    return response.json()
  },

  // ============= METRICS =============

  async getMetrics(startDate?: string, endDate?: string) {
    const query = new URLSearchParams()
    if (startDate) query.append('startDate', startDate)
    if (endDate) query.append('endDate', endDate)

    const response = await fetch(`${API_BASE_URL}/accounting/metrics?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    return response.json()
  },
}
