import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../config/jwt'

export interface AuthRequest extends Request {
  user?: JWTPayload
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (token) {
    const payload = verifyToken(token)

    if (payload) {
      req.user = payload
      return next()
    }
  }

  if (process.env.DEMO_PUBLIC_API === 'true') {
    req.user = {
      id: process.env.DEMO_USER_ID || 'demo-user',
      userId: process.env.DEMO_USER_ID || 'demo-user',
      email: process.env.DEMO_USER_EMAIL || 'admin@novatech.com',
      role: process.env.DEMO_USER_ROLE || 'CEO',
    }
    return next()
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }
  return res.status(401).json({ success: false, error: 'Invalid or expired token' })
}

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      req.user = payload
    }
  }

  next()
}
