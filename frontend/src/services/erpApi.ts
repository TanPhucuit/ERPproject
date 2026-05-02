import { API_BASE_URL } from '../config/api'

type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('auth_token')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResult<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || response.statusText)
  }

  const data = payload.data as any
  return (data && Array.isArray(data.data) ? data.data : (payload.data ?? payload)) as T
}

export const erpApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
