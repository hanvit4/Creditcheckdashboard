const ENV = import.meta.env.MODE || 'development';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const envProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const fallbackSupabaseUrl = envProjectId ? `https://${envProjectId}.supabase.co` : '';

export const supabaseUrl = (envSupabaseUrl || fallbackSupabaseUrl).replace(/\/$/, '');
export const projectId = envProjectId || supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] || '';

if (!supabaseUrl || !publicAnonKey) {
    const missing = [
        !supabaseUrl ? 'VITE_SUPABASE_URL 또는 VITE_SUPABASE_PROJECT_ID' : null,
        !publicAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
    ]
        .filter(Boolean)
        .join(', ');

    throw new Error(`[${ENV}] Supabase 환경변수 누락: ${missing}`);
}