import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[EJUST Club Hub] Supabase credentials not found.\n' +
    'Make sure your .env file exists in the project root with:\n' +
    '  VITE_SUPABASE_URL=https://cdfimogtpmihdpwywqew.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=<your-anon-key>\n' +
    'Then restart the dev server (npm run dev).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
