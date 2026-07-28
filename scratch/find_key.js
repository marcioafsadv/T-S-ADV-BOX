const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search';

const queryPayload = {
  query: {
    bool: {
      must: [
        {
          query_string: {
            query: "385787",
            default_field: "advogados.numeroOab"
          }
        }
      ]
    }
  },
  size: 1
};

const correctEnding = 'SkJtTzNuSkxVOWlSRU55UWsxUmRuRktaR1JRZHc9PQ==';

const variations = [
  'cDZHYzIza0JadVREZDJCendQbXY6' + correctEnding, // zIza
  'cDZHYz1za0JadVREZDJCendQbXY6' + correctEnding, // z1za
  'cDZHYzlza0JadVREZDJCendQbXY6' + correctEnding, // zlza
  'cDZHYzI1a0JadVREZDJCendQbXY6' + correctEnding, // zI1a
  'cDZHYzI5a0JadVREZDJCendQbXY6' + correctEnding, // zI9a
  'cDZHYzIza0JadVREZDJCendQbXY6'.replace('I', 'l') + correctEnding,
  'cDZHYzIza0JadVREZDJCendQbXY6'.replace('I', '1') + correctEnding,
];

async function testAll() {
  for (const rawKey of variations) {
    const apiKey = `APIKey ${rawKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      console.log(`Key: ${rawKey} -> Status: ${res.status}`);
      if (res.status === 200) {
        console.log('ACHOU A CHAVE CORRETA!', rawKey);
        break;
      }
    } catch (e) {
      console.log(`Failed for key ${rawKey}:`, e.message);
    }
  }
}

testAll();
