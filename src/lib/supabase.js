import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
const supabaseKey = 'sb_publishable_nA5rfIX1rNNSuNu3mwaH0w_VLxFdRLu'

export const supabase = createClient(supabaseUrl, supabaseKey)
