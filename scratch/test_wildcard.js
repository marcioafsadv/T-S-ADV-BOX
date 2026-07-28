const apiKey = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search';

// Vamos testar diferentes formas de busca para encontrar processos do Dr. Márcio Augusto (OAB 385787)
const payloads = {
  // 1. Busca exata por OAB como número/string
  exact_oab: {
    query: {
      match: { "advogados.numeroOab": "385787" }
    },
    size: 3
  },
  // 2. Busca com wildcard no numeroOab
  wildcard_oab: {
    query: {
      wildcard: { "advogados.numeroOab": "*385787*" }
    },
    size: 3
  },
  // 3. Busca pelo nome do advogado (Márcio Augusto)
  name_search: {
    query: {
      match: { "advogados.nome": "Marcio Augusto" }
    },
    size: 3
  }
};

async function run() {
  for (const [name, queryPayload] of Object.entries(payloads)) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      const data = await res.json();
      console.log(`[${name}] status:`, res.status, `hits:`, data.hits?.total?.value);
      if (data.hits?.hits?.length > 0) {
        console.log(`[${name}] Primeiro hit:`, JSON.stringify(data.hits.hits[0]._source.numeroProcesso));
        console.log(`[${name}] Advogados no primeiro hit:`, JSON.stringify(data.hits.hits[0]._source.advogados));
      }
    } catch (err) {
      console.error(`[${name}] Error:`, err);
    }
  }
}

run();
