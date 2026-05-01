import { API_BASE_URL } from '../config/api'

const getAuthToken = () => localStorage.getItem('authToken')

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`,
}

export const inventoryApiService = {
  // ============= GOODS RECEIPTS =============

  async createGoodsReceipt(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/goods-receipts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create goods receipt: ${response.statusText}`)
    return response.json()
  },

  async getGoodsReceiptById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/goods-receipts/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch goods receipt: ${response.statusText}`)
    return response.json()
  },

  async recordGoodsReceiptLine(lineId: string, quantityReceived: number, binLocationId: string, serialNumbers?: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/goods-receipt-lines/${lineId}/record`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ quantityReceived, binLocationId, serialNumbers }),
    })

    if (!response.ok) throw new Error(`Failed to record receipt: ${response.statusText}`)
    return response.json()
  },

  async completeGoodsReceipt(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/goods-receipts/${id}/complete`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to complete goods receipt: ${response.statusText}`)
    return response.json()
  },

  // ============= DELIVERY ORDERS =============

  async createDeliveryOrder(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/delivery-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create delivery order: ${response.statusText}`)
    return response.json()
  },

  async pickItemsForDelivery(lineId: string, binLocationId: string, quantity: number) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/delivery-order-lines/${lineId}/pick`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ binLocationId, quantity }),
    })

    if (!response.ok) throw new Error(`Failed to pick items: ${response.statusText}`)
    return response.json()
  },

  async completeDelivery(id: string, trackingNumber?: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/delivery-orders/${id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trackingNumber }),
    })

    if (!response.ok) throw new Error(`Failed to complete delivery: ${response.statusText}`)
    return response.json()
  },

  // ============= ADJUSTMENTS =============

  async createAdjustment(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/adjustments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create adjustment: ${response.statusText}`)
    return response.json()
  },

  async postAdjustment(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/adjustments/${id}/post`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to post adjustment: ${response.statusText}`)
    return response.json()
  },

  // ============= SERIAL NUMBERS =============

  async getSerialNumbersByProduct(productId: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/serial-numbers/product/${productId}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch serial numbers: ${response.statusText}`)
    return response.json()
  },

  async getSerialNumberDetails(serialNumber: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/serial-numbers/${serialNumber}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch serial number: ${response.statusText}`)
    return response.json()
  },

  // ============= WARRANTIES =============

  async createWarranty(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/warranties`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create warranty: ${response.statusText}`)
    return response.json()
  },

  async submitWarrantyClaim(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/warranty-claims`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to submit warranty claim: ${response.statusText}`)
    return response.json()
  },

  // ============= STOCK LEVELS & METRICS =============

  async getStockLevelsByWarehouse(warehouseId: string) {
    const response = await fetch(`${API_BASE_URL}/api/inventory/stock-levels/warehouse/${warehouseId}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch stock levels: ${response.statusText}`)
    return response.json()
  },

  async getLowStockItems(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const response = await fetch(`${API_BASE_URL}/api/inventory/low-stock${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch low stock items: ${response.statusText}`)
    return response.json()
  },
}
