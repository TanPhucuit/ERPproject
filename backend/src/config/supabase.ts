import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
// Also try loading from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Loading Supabase config...')
console.log('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing')
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'present' : 'missing')
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'present' : 'missing')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase config loaded successfully')

const BACKEND_DB_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

// Backend DB client. Prefer service role when available so server-side queries
// can bypass RLS and work predictably in Vercel/API environments.
export const supabaseClient = createClient(
  SUPABASE_URL,
  BACKEND_DB_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export const supabase = supabaseClient

// Supabase client for service calls
export const supabaseServiceClient = createClient(
  SUPABASE_URL,
  BACKEND_DB_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export default supabaseClient
