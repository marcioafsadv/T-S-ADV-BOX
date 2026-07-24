import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://joupiqasngjfdurmdbjs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YuD8sGQNExZzGCKCBwf-tQ_58fCZDWP';

// Verifica se o Supabase está devidamente configurado
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://seu-projeto-supabase.supabase.co' &&
  supabaseAnonKey !== 'sua-chave-anonima-supabase-aqui';

// Inicializa o cliente do Supabase apenas se as credenciais estiverem preenchidas
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;
