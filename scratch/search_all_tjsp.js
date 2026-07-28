const apiKey = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search';

const queryPayload = {
  query: {
    match_all: {}
  },
  size: 2
};

async function run() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryPayload)
    });
    console.log('status:', res.status);
    const data = await res.json();
    console.log('Hits total:', data.hits?.total?.value);
    if (data.hits?.hits?.length > 0) {
      console.log('Exemplo de documento completo do TJSP no Datajud:');
      console.log(JSON.stringify(data.hits.hits[0]._source, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
