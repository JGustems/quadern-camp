import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kmoqeqiuugkqjnaiuxdr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttb3FlcWl1dWdrcWpuYWl1eGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTE3NzksImV4cCI6MjA5MTY4Nzc3OX0.LRtyNjL3jpjBE2BSblHsxUQ8ueVMTCO4DNgCQ8v9HxU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
