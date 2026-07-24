import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { name, email, phone, cpfCnpj, clientType, password } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jeupiqasngjfdurrdbjs.supabase.co';
    
    // A chave de serviço de administração deve estar configurada no servidor (não exposta no frontend)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada nas variáveis de ambiente do servidor.' },
        { status: 500 }
      );
    }

    // Inicializa o cliente Supabase com a chave administrativa (Service Role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Cria o usuário na autenticação marcando email_confirm como true.
    // Isso evita o envio de e-mails de confirmação e ativa a conta do cliente na hora!
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ESSA FLAG PULA A CONFIRMAÇÃO DE E-MAIL E PREVINE O ENVIO
      user_metadata: {
        full_name: name,
        role: 'client',
        phone,
        cpf_cnpj: cpfCnpj,
        client_type: clientType,
        lgpd_consent: true
      }
    });

    if (authError) throw authError;

    return NextResponse.json({ success: true, user: authData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
