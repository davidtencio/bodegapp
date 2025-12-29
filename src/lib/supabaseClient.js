import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseProjectRef = (() => {
  try {
    if (!supabaseUrl) return null
    const host = new URL(supabaseUrl).hostname
    const first = host.split('.')[0]
    return first || null
  } catch {
    return null
  }
})()

export const dataProvider =
  import.meta.env.VITE_DATA_PROVIDER || (isSupabaseConfigured ? 'supabase' : 'local')

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
