const apiKey = 'APIKey cDZHYzIza0JadVREZDJCendQbXY6SkJtTzNjLV9TRENyQk1RdnFKZGRQdw==';
const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search';

const queryPayload = {
  query: {
    bool: {
      must: [
        {
          query_string: {
            query: "*385787*",
            default_field: "advogados.numeroOab"
          }
        }
      ]
    }
  },
  size: 5
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
    console.log('data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
