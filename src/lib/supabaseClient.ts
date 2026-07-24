import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jeupiqasngjfdurrdbjs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXBpcWFzbmdqZmR1cnJkYmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NDg1ODAsImV4cCI6MjEwMDQyNDU4MH0.Do3jWBSlWRVZOYLvaEO2KMnh38fsYuQHYiNezp2UX-I';

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
