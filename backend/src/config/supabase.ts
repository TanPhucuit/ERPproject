import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE

console.log('Loading Supabase config...')
console.log('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing')
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'present' : 'missing')
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'present' : 'missing')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  )
}

if (!SUPABASE_SERVICE_KEY && process.env.NODE_ENV === 'production') {
  throw new Error(
    'Missing SUPABASE_SERVICE_KEY. Backend API needs the service-role key to read/write protected tables.'
  )
}

console.log('Supabase config loaded successfully')

const BACKEND_DB_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

export const supabaseClient = createClient(SUPABASE_URL, BACKEND_DB_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const supabase = supabaseClient

export const supabaseServiceClient = createClient(SUPABASE_URL, BACKEND_DB_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export default supabaseClient
