import { dataProvider, isSupabaseConfigured } from '../../lib/supabaseClient.js'
import { localStore } from './localStore.js'
import { supabaseStore } from './supabaseStore.js'

export const store =
  dataProvider === 'supabase' && isSupabaseConfigured ? supabaseStore : localStore

