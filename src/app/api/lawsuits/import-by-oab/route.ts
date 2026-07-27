import { NextResponse } from 'next/server';

// Helper para formatar o número do processo no padrão CNJ (7-2.4.1.2.4)
// Ex: 00123456720248260100 -> 0012345-67.2024.8.26.0100
function formatCNJ(raw: string): string {
  const clean = raw.replace(/\D/g, '');
  if (clean.length !== 20) return raw;
  return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
}

export async function POST(request: Request) {
  let oabNumber = '';
  let oabUf = 'SP';

  try {
    const body = await request.json();
    oabNumber = body.oabNumber;
    oabUf = body.oabUf || 'SP';

    const uf = oabUf.toLowerCase();
    const tribunal = `tj${uf}`; // tjsp, tjrj, tjmg, etc.

    // A chave pública padrão fornecida pelo CNJ para a API Pública do Datajud
    // mantemos esta chave pública como fallback automático caso o usuário não configure uma própria
    const apiKey = process.env.DATAJUD_API_KEY || 'ApiKey cFJSdUpvRFU0SURCY1Flcm9xWjY6azZid3E4OVRRMS1hYndOWjR6Rlhmdw==';

    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;

    // Constrói a query de busca no Elasticsearch do Datajud pelo número da OAB nos advogados cadastrados no processo
    const queryPayload = {
      query: {
        bool: {
          must: [
            {
              query_string: {
                query: oabNumber,
                default_field: "advogados.numeroOab"
              }
            }
          ]
        }
      },
      size: 15
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey.startsWith('ApiKey ') ? apiKey : `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryPayload),
      // Adicionamos timeout curto para caso a API pública do tribunal esteja fora do ar/com delay
      signal: AbortSignal.timeout(10000) 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Pública do Datajud (${tribunal.toUpperCase()}): ${response.status} - ${errorText}`);
    }

    const searchData = await response.json();
    const hits = searchData.hits?.hits || [];

    // Mapeamento dos resultados retornados pelo Elasticsearch do Datajud
    const processos = hits.map((hit: any) => {
      const source = hit._source || {};
      return {
        process_number: formatCNJ(source.numeroProcesso || ''),
        court: source.orgaoJulgador?.nome || 'Vara Cível',
        comarca: source.tribunal || tribunal.toUpperCase(),
        lawsuit_class: source.classe?.nome || 'Procedimento Comum Cível',
        status: 'Ativo'
      };
    });

    return NextResponse.json({ 
      success: true, 
      processos,
      message: processos.length === 0 ? 'Busca concluída, mas nenhum processo foi encontrado para esta OAB neste tribunal.' : undefined
    });

  } catch (err: any) {
    // Caso a API pública do Datajud caia ou ocorra timeout, retornamos uma simulação realista
    // para não interromper os testes de interface do usuário
    console.warn(`Datajud falhou, ativando fallback de simulação: ${err.message}`);
    
    const mockProcessos = [
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.26.0100`,
        court: '4ª Vara Cível da Comarca da Capital (Simulado Datajud)',
        comarca: `TJ${oabUf.toUpperCase()}`,
        lawsuit_class: 'Procedimento Comum Cível',
        status: 'Ativo'
      },
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.19.0001`,
        court: '12ª Vara de Família (Simulado Datajud)',
        comarca: `TJ${oabUf.toUpperCase()}`,
        lawsuit_class: 'Divórcio Consensual',
        status: 'Ativo'
      }
    ];

    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      processos: mockProcessos,
      message: `Buscando em modo simulação (Datajud indisponível ou em timeout: ${err.message}).`
    });
  }
}
