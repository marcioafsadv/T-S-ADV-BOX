import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jeupiqasngjfdurrdbjs.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Tenta uma inserção manual na tabela clients para ver qual erro de restrição ou schema acontece
    const testInsert = await supabase.from('clients').insert({
      user_id: 'ed3bfbf5-d603-45c0-a954-a723e26f9159', // ID da Kassiane
      cpf_cnpj: '474.994.178-67',
      client_type: 'individual'
    }).select();

    const { data: users } = await supabase.from('users').select('*');
    const { data: clients } = await supabase.from('clients').select('*');

    return NextResponse.json({
      success: true,
      testInsertResult: {
        status: testInsert.status,
        statusText: testInsert.statusText,
        error: testInsert.error?.message || testInsert.error,
        data: testInsert.data
      },
      users,
      clients
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
