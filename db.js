// Arquivo de verificação solicitado pela Hostinger para teste de conexão
const { createClient } = require('@supabase/supabase-js');

// Hostinger injeta essas variáveis de ambiente automaticamente após a integração
const supabaseUrl = process.env.SUPABASE_URL || 'https://jeupiqasngjfdurrdbjs.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_YuD8sGQNExZzGCKCBwf-tQ_58fCZDWP';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Testando a conexão lendo a tabela de processos (lawsuits)
    const { data, error } = await supabase.from('lawsuits').select('*').limit(1);
    if (error) {
      console.log('Conexão estabelecida, mas com retorno:', error.message);
    } else {
      console.log('Conexão com o Supabase efetuada com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao testar conexão:', err.message);
  }
}

testConnection();
