const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jeupiqasngjfdurrdbjs.supabase.co';

const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const payload = 'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXBpcWFzbmdqZmR1cnJkYmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg1OTg3OSwiZXhwIjoyMTAwNDM1ODc5fQ';

// Variações de junção do final da chave
const sig1 = 'CwIZXhwiJoyMTAwNDI0NTgwfQ';
const sig2 = 'o_Hc5fIfCjxSXeNRKW41nNDs131Zm9SZcYLdK5tUuy0';

const variations = [
  // 1. Sem o ponto entre as partes da assinatura
  `${header}.${payload}.${sig1}${sig2}`,
  // 2. Com barra
  `${header}.${payload}.${sig1}/${sig2}`,
  // 3. Com mais
  `${header}.${payload}.${sig1}+${sig2}`,
  // 4. Com underline
  `${header}.${payload}.${sig1}_${sig2}`,
  // 5. Com hífen
  `${header}.${payload}.${sig1}-${sig2}`,
  // 6. Apenas o sig2
  `${header}.${payload}.${sig2}`,
  // 7. Apenas o sig1
  `${header}.${payload}.${sig1}`
];

async function run() {
  for (const key of variations) {
    try {
      const supabase = createClient(supabaseUrl, key);
      const { data, error } = await supabase.from('clients').select('id');
      if (!error) {
        console.log('SUCCESS! WORKING KEY FOUND:', key);
        break;
      } else {
        console.log(`Failed for key starting with ${key.slice(0, 50)}... -> ${error.message}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

run();
