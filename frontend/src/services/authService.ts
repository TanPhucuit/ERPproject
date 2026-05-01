import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
  }
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, payload)
    if (response.token) {
      localStorage.setItem('auth_token', response.token)
    }
    return response
  },

  logout: async () => {
    localStorage.removeItem('auth_token')
    return apiClient.post(API_ENDPOINTS.AUTH_LOGOUT, {})
  },

  getCurrentUser: async () => {
    return apiClient.get<any>(API_ENDPOINTS.AUTH_ME)
  },

  setToken: (token: string) => {
    localStorage.setItem('auth_token', token)
  },

  getToken: () => {
    return localStorage.getItem('auth_token')
  },

  clearToken: () => {
    localStorage.removeItem('auth_token')
  },
}
