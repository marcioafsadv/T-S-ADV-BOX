const { createClient } = require('@supabase/supabase-js');

// Testando a chave sem o trecho "CwIZXhwiJoyMTAwNDI0NTgwfQ"
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXBpcWFzbmdqZmR1cnJkYmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg1OTg3OSwiZXhwIjoyMTAwNDM1ODc5fQ.o_Hc5fIfCjxSXeNRKW41nNDs131Zm9SZcYLdK5tUuy0';
const supabaseUrl = 'https://jeupiqasngjfdurrdbjs.supabase.co';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  try {
    const { data: clients, error: err1 } = await supabase.from('clients').select('*, users(*)');
    if (err1) throw err1;
    console.log('SUCCESS! Clients count:', clients.length);
  } catch (e) {
    console.error('FAILED:', e.message || e);
  }
}

run();
