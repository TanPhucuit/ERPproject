import { API_BASE_URL } from '../config/api'

const getAuthToken = () => localStorage.getItem('authToken')

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`,
}

export const warehouseApiService = {
  // ============= WAREHOUSES =============

  async getAllWarehouses() {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/warehouses`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch warehouses: ${response.statusText}`)
    return response.json()
  },

  async getWarehouseById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/warehouses/${id}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch warehouse: ${response.statusText}`)
    return response.json()
  },

  async getWarehouseCapacity(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/warehouses/${id}/capacity`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch capacity: ${response.statusText}`)
    return response.json()
  },

  // ============= BIN LOCATIONS =============

  async createBinLocation(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/bin-locations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create bin: ${response.statusText}`)
    return response.json()
  },

  async getBinLocationsByWarehouse(warehouseId: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/warehouses/${warehouseId}/bin-locations`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch bins: ${response.statusText}`)
    return response.json()
  },

  async findAvailableBin(warehouseId: string, productId: string, quantityNeeded: number) {
    const query = new URLSearchParams()
    query.append('productId', productId)
    query.append('quantityNeeded', quantityNeeded.toString())

    const response = await fetch(
      `${API_BASE_URL}/api/warehouse/warehouses/${warehouseId}/find-bin?${query}`,
      { headers }
    )

    if (!response.ok) throw new Error(`Failed to find bin: ${response.statusText}`)
    return response.json()
  },

  async updateBinLocation(id: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/bin-locations/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to update bin: ${response.statusText}`)
    return response.json()
  },

  // ============= PUTAWAY TASKS =============

  async createPutawayTask(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/putaway-tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create putaway task: ${response.statusText}`)
    return response.json()
  },

  async getPutawayTasksForUser(userId: string, warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const response = await fetch(`${API_BASE_URL}/api/warehouse/putaway-tasks/user/${userId}${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch putaway tasks: ${response.statusText}`)
    return response.json()
  },

  async completePutawayTask(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/putaway-tasks/${id}/complete`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to complete putaway task: ${response.statusText}`)
    return response.json()
  },

  // ============= PICKING TASKS =============

  async createPickingTask(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/picking-tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create picking task: ${response.statusText}`)
    return response.json()
  },

  async getPickingTasksForUser(userId: string, warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const response = await fetch(`${API_BASE_URL}/api/warehouse/picking-tasks/user/${userId}${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch picking tasks: ${response.statusText}`)
    return response.json()
  },

  async completePickingTask(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/picking-tasks/${id}/complete`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to complete picking task: ${response.statusText}`)
    return response.json()
  },

  // ============= STOCK TRANSFERS =============

  async createStockTransfer(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/stock-transfers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Failed to create stock transfer: ${response.statusText}`)
    return response.json()
  },

  async confirmStockTransfer(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/warehouse/stock-transfers/${id}/confirm`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) throw new Error(`Failed to confirm stock transfer: ${response.statusText}`)
    return response.json()
  },

  // ============= METRICS =============

  async getUtilization(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const response = await fetch(`${API_BASE_URL}/api/warehouse/utilization${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch utilization: ${response.statusText}`)
    return response.json()
  },

  async getActivityLog(warehouseId: string, days = 30) {
    const query = new URLSearchParams()
    query.append('days', days.toString())

    const response = await fetch(
      `${API_BASE_URL}/api/warehouse/warehouses/${warehouseId}/activity-log?${query}`,
      { headers }
    )

    if (!response.ok) throw new Error(`Failed to fetch activity log: ${response.statusText}`)
    return response.json()
  },

  async getReceivingMetrics(warehouseId: string, startDate: string, endDate: string) {
    const query = new URLSearchParams()
    query.append('startDate', startDate)
    query.append('endDate', endDate)

    const response = await fetch(
      `${API_BASE_URL}/api/warehouse/warehouses/${warehouseId}/receiving-metrics?${query}`,
      { headers }
    )

    if (!response.ok) throw new Error(`Failed to fetch receiving metrics: ${response.statusText}`)
    return response.json()
  },

  async getShippingMetrics(warehouseId: string, startDate: string, endDate: string) {
    const query = new URLSearchParams()
    query.append('startDate', startDate)
    query.append('endDate', endDate)

    const response = await fetch(
      `${API_BASE_URL}/api/warehouse/warehouses/${warehouseId}/shipping-metrics?${query}`,
      { headers }
    )

    if (!response.ok) throw new Error(`Failed to fetch shipping metrics: ${response.statusText}`)
    return response.json()
  },

  async getTaskCompletionMetrics(warehouseId: string, userId?: string) {
    const query = new URLSearchParams()
    query.append('warehouseId', warehouseId)
    if (userId) query.append('userId', userId)

    const response = await fetch(`${API_BASE_URL}/api/warehouse/task-completion-metrics?${query}`, {
      headers,
    })

    if (!response.ok) throw new Error(`Failed to fetch task metrics: ${response.statusText}`)
    return response.json()
  },
}
