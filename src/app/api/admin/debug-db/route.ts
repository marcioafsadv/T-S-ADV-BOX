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

    const { data: users, error: uErr } = await supabase.from('users').select('*');
    const { data: clients, error: cErr } = await supabase.from('clients').select('*');
    const { data: authUsers, error: aErr } = await supabase.auth.admin.listUsers();

    return NextResponse.json({
      success: true,
      errors: { uErr: uErr?.message, cErr: cErr?.message, aErr: aErr?.message },
      users,
      clients,
      authUsers: authUsers?.users?.map(u => ({ 
        id: u.id, 
        email: u.email, 
        user_metadata: u.user_metadata,
        created_at: u.created_at
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
