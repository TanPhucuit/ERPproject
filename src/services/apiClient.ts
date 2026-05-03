import { erpApi } from './erpApi'

const buildUrl = (url: string, config?: { params?: Record<string, any> }) => {
  const params = new URLSearchParams()

  Object.entries(config?.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `${url}?${query}` : url
}

class ApiClient {
  async get<T>(url: string, config?: any): Promise<T> {
    return erpApi.get<T>(buildUrl(url, config))
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return erpApi.post<T>(url, data)
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return erpApi.put<T>(url, data)
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    return erpApi.put<T>(url, data)
  }

  async delete<T>(url: string): Promise<T> {
    return erpApi.delete<T>(url)
  }
}

export default new ApiClient()
