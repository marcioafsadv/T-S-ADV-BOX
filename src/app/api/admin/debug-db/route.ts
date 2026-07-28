import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jeupiqasngjfdurrdbjs.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Testando a exata query do frontend com o join 'users'
    const { data: testClients, error: testErr } = await supabase
      .from('clients')
      .select(`
        id,
        cpf_cnpj,
        client_type,
        created_at,
        users (
          full_name,
          email,
          phone,
          lgpd_consent
        )
      `);

    return NextResponse.json({
      success: true,
      error: testErr?.message || testErr,
      testClients
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
