import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Clave publishable: es pública por diseño; los datos los protege RLS.
const SUPABASE_URL = 'https://ydugevaqupmpwwabwxno.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Y1SyCD6Axem6qNxAOc5V2Q_jzY4Vh9W'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
})
