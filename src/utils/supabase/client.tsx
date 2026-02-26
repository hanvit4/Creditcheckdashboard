import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Supabase 클라이언트 싱글톤
export const supabase = createSupabaseClient(
  supabaseUrl,
  publicAnonKey
);
