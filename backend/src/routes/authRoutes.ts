import { randomUUID } from 'crypto'
import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { supabaseServiceClient } from '../config/supabase'
import { generateToken } from '../config/jwt'

const router = Router()

const allowedRoles = [
  'CEO',
  'Sales_Manager',
  'Purchasing_Manager',
  'Warehouse_Manager',
  'Accountant',
]

const shapeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  avatar_url: user.avatar_url,
  status: user.status,
})

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { full_name, email, password, role } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const selectedRole = allowedRoles.includes(role) ? role : 'Sales_Manager'

    const { data: existingUser } = await supabaseServiceClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_deleted', false)
      .maybeSingle()

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
      })
    }

    const newUser = {
      id: randomUUID(),
      email: normalizedEmail,
      password_hash: password,
      full_name: String(full_name).trim(),
      role: selectedRole,
      status: 'active',
      is_deleted: false,
      login_attempts: 0,
      avatar_url: null,
    }

    const { data, error } = await supabaseServiceClient
      .from('users')
      .insert(newUser)
      .select('*')
      .single()

    if (error || !data) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Unable to create account',
      })
    }

    const token = generateToken({
      id: data.id,
      userId: data.id,
      email: data.email,
      role: data.role,
    })

    res.status(201).json({
      success: true,
      data: {
        token,
        user: shapeUser(data),
      },
    })
  })
)

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const { data, error } = await supabaseServiceClient
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('is_deleted', false)
      .single()

    if (error || !data) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
    }

    if (data.status && ['inactive', 'suspended', 'deleted'].includes(data.status)) {
      return res.status(403).json({
        success: false,
        error: 'This account is not active',
      })
    }

    if (data.password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
    }

    await supabaseServiceClient
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        login_attempts: 0,
      })
      .eq('id', data.id)

    const token = generateToken({
      id: data.id,
      userId: data.id,
      email: data.email,
      role: data.role,
    })

    res.json({
      success: true,
      data: {
        token,
        user: shapeUser(data),
      },
    })
  })
)

router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: { message: 'Logged out successfully' } })
  })
)

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const email = req.user?.email
    const userId = req.user?.id || req.user?.userId

    if (!email && !userId) {
      return res.status(401).json({
        success: false,
        error: 'Unable to resolve current user',
      })
    }

    let query = supabaseServiceClient.from('users').select('*').eq('is_deleted', false)
    query = userId ? query.eq('id', userId) : query.eq('email', email as string)

    const { data, error } = await query.single()

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    res.json({
      success: true,
      data: shapeUser(data),
    })
  })
)

export default router
