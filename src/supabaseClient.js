import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://hogwybyuwwynyujrcmtm.supabase.co"
const supabaseKey = "sb_publishable_hJMVfdr_uONrJeipipDUoA_z0aerVZV"

export const supabase = createClient(supabaseUrl, supabaseKey)