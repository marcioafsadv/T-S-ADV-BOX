import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verifica se o Supabase está devidamente configurado com credenciais válidas
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://seu-projeto-supabase.supabase.co' &&
  supabaseAnonKey !== 'sua-chave-anonima-supabase-aqui';

// Inicializa o cliente do Supabase apenas se as credenciais estiverem preenchidas
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;
