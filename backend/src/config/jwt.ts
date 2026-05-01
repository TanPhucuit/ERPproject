import dotenv from 'dotenv'

dotenv.config()

export interface JWTPayload {
  id?: string
  userId: string
  email: string
  role: string
}

// Simplified token - just base64 encode the user info
export const generateToken = (payload: JWTPayload): string => {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    return JSON.parse(decoded) as JWTPayload
  } catch (error) {
    return null
  }
}

export const decodeToken = (token: string): JWTPayload | null => {
  return verifyToken(token)
}
