import { supabase } from '../lib/supabase'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
  role: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
    status?: string
    avatar_url?: string | null
  }
}

type AuthTokenPayload = {
  id: string
  email: string
  role: string
}

const buildToken = (payload: AuthTokenPayload) => btoa(JSON.stringify(payload))

const parseToken = (token: string | null): AuthTokenPayload | null => {
  if (!token) return null

  try {
    return JSON.parse(atob(token)) as AuthTokenPayload
  } catch {
    return null
  }
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const normalizedEmail = payload.email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, avatar_url, password_hash')
      .eq('email', normalizedEmail)
      .eq('is_deleted', false)
      .single()

    if (error || !data || data.password_hash !== payload.password) {
      throw new Error('Invalid email or password')
    }

    const token = buildToken({
      id: data.id,
      email: data.email,
      role: data.role,
    })

    localStorage.setItem('auth_token', token)

    return {
      token,
      user: {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
        avatar_url: data.avatar_url,
      },
    }
  },

  register: async (payload: RegisterPayload): Promise<LoginResponse> => {
    const normalizedEmail = payload.email.trim().toLowerCase()

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_deleted', false)
      .maybeSingle()

    if (existingUser) {
      throw new Error('Email already exists')
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: payload.password,
        full_name: payload.full_name.trim(),
        role: payload.role,
        status: 'active',
        is_deleted: false,
        login_attempts: 0,
      })
      .select('id, email, full_name, role, status, avatar_url')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Unable to create account')
    }

    const token = buildToken({
      id: data.id,
      email: data.email,
      role: data.role,
    })

    localStorage.setItem('auth_token', token)

    return {
      token,
      user: data,
    }
  },

  logout: async () => {
    localStorage.removeItem('auth_token')
    return { success: true }
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('auth_token')
    const payload = parseToken(token)

    if (!payload) {
      throw new Error('Missing auth token')
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, avatar_url')
      .eq('id', payload.id)
      .eq('is_deleted', false)
      .single()

    if (error || !data) {
      throw new Error('User not found')
    }

    return data
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
