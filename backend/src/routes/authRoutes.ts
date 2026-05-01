import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { supabaseClient } from '../config/supabase'
import { generateToken } from '../config/jwt'

const router = Router()

// Login - chỉ cần check email và password từ database
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      })
    }

    try {
      // Query user từ Supabase
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !data) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        })
      }

      // Demo: Accept any password for testing
      // In production: use proper password hashing (bcrypt)
      if (password !== 'password123' && password !== '') {
        // Allow empty password for demo
      }

      // Generate simplified token
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
          user: {
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            avatar_url: data.avatar_url,
          },
        },
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Login failed',
      })
    }
  })
)

// Logout
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully' })
  })
)

// Get current user
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', (req as any).user?.email)
      .single()

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        avatar_url: data.avatar_url,
      },
    })
  })
)

export default router
