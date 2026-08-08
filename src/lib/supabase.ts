import { createClient } from '@supabase/supabase-js';

// جلب المفاتيح من بيئة التشغيل السحابية (Cloudflare)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
