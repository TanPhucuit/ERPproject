import { API_BASE_URL } from '../config/api'

const getAuthToken = () => localStorage.getItem('authToken')

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`,
}

export const purchaseApiService = {
  // ============= RFQs =============

  async getAllRFQs(skip = 0, limit = 10, status?: string) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())
    if (status) query.append('status', status)

    const response = await fetch(`${API_BASE_URL}/api/purchase/rfqs?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch RFQs: ${response.statusText}`)
    return response.json()
  },

  async getRFQById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfqs/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch RFQ: ${response.statusText}`)
    return response.json()
  },

  async createRFQ(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfqs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create RFQ: ${response.statusText}`)
    return response.json()
  },

  async submitRFQToSuppliers(rfqId: string, supplierIds: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfqs/${rfqId}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ supplierIds }),
    })

    if (!response.ok) throw new Error(`Failed to submit RFQ: ${response.statusText}`)
    return response.json()
  },

  // ============= QUOTES =============

  async receiveSupplierQuote(rfqLineId: string, supplierId: string, quotedPrice: number, leadTime: number) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfq-lines/${rfqLineId}/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ supplierId, quotedPrice, leadTime }),
    })

    if (!response.ok) throw new Error(`Failed to receive quote: ${response.statusText}`)
    return response.json()
  },

  async compareSupplierQuotes(rfqLineId: string) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfq-lines/${rfqLineId}/quotes`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch quotes: ${response.statusText}`)
    return response.json()
  },

  async selectSupplierForRFQLine(rfqLineId: string, supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/rfq-lines/${rfqLineId}/select-supplier`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ supplierId }),
    })

    if (!response.ok) throw new Error(`Failed to select supplier: ${response.statusText}`)
    return response.json()
  },

  // ============= PURCHASE ORDERS =============

  async getAllPurchaseOrders(skip = 0, limit = 10, status?: string) {
    const query = new URLSearchParams()
    query.append('skip', skip.toString())
    query.append('limit', limit.toString())
    if (status) query.append('status', status)

    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch purchase orders: ${response.statusText}`)
    return response.json()
  },

  async getPurchaseOrderById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch PO: ${response.statusText}`)
    return response.json()
  },

  async createPurchaseOrder(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create PO: ${response.statusText}`)
    return response.json()
  },

  async updatePurchaseOrder(id: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to update PO: ${response.statusText}`)
    return response.json()
  },

  async confirmPurchaseOrder(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders/${id}/confirm`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to confirm PO: ${response.statusText}`)
    return response.json()
  },

  async recordPOReceipt(id: string, partialQuantities: Record<string, number>) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/purchase-orders/${id}/record-receipt`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ partialQuantities }),
    })

    if (!response.ok) throw new Error(`Failed to record receipt: ${response.statusText}`)
    return response.json()
  },

  // ============= METRICS =============

  async getMetrics(startDate?: string, endDate?: string) {
    const query = new URLSearchParams()
    if (startDate) query.append('startDate', startDate)
    if (endDate) query.append('endDate', endDate)

    const response = await fetch(`${API_BASE_URL}/api/purchase/metrics?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    return response.json()
  },

  async getTopSuppliers(limit = 10) {
    const response = await fetch(`${API_BASE_URL}/api/purchase/top-suppliers?limit=${limit}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch top suppliers: ${response.statusText}`)
    return response.json()
  },
}
