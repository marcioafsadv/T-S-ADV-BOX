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

    // 1. Consulta simples em lawsuits
    const { data: rawLawsuits, error: rawErr } = await supabase
      .from('lawsuits')
      .select('*');

    // 2. Consulta com os joins idêntica à do frontend
    const { data: joinLawsuits, error: joinErr } = await supabase
      .from('lawsuits')
      .select(`
        id,
        process_number,
        court,
        comarca,
        lawsuit_class,
        status,
        client_id,
        clients (
          users (
            full_name
          )
        )
      `);

    return NextResponse.json({
      success: true,
      rawErr: rawErr?.message || rawErr,
      joinErr: joinErr?.message || joinErr,
      rawLawsuitsCount: rawLawsuits?.length,
      rawLawsuits,
      joinLawsuits
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
