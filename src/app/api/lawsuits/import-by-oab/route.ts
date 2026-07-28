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

    // A chave pública atualizada do Datajud (obtida na Wiki do CNJ)
    const apiKey = process.env.DATAJUD_API_KEY || 'ApiKey cDZHYzIza0JadVREZDJCendQbXY6SkJtTzNjLV9TRENyQk1RdnFKZGRQdw==';

    // Lista de tribunais/regiões de interesse indicados para pesquisa
    const tribunaisAlvos = [
      'tst',    // Tribunal Superior do Trabalho
      'stj',    // Superior Tribunal de Justiça
      'trf3',   // TRF da 3ª Região (SP/MS)
      'tjrj',   // TJ do Rio de Janeiro
      'tjsp',   // TJ de São Paulo
      'tjmg',   // TJ de Minas Gerais
      'tjba',   // TJ da Bahia
      'tjdft',  // TJ do Distrito Federal e Territórios
      'tjpr',   // TJ do Paraná
      'trt1',   // TRT da 1ª Região (RJ)
      'trt2',   // TRT da 2ª Região (SP Capital)
      'trt15'   // TRT da 15ª Região (Campinas/SP Interior)
    ];

    // Payload estruturado em Query DSL (Elasticsearch) para buscar pela OAB nos advogados cadastrados
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

    // Dispara as consultas a todos os tribunais de interesse em paralelo
    const searchPromises = tribunaisAlvos.map(async (tribunal) => {
      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': apiKey.startsWith('ApiKey ') ? apiKey : `ApiKey ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload),
        signal: AbortSignal.timeout(6000) // Timeout de 6s
      });

      // Se a chave pública for recusada (401), lançamos um erro explícito para acionar o Fallback de simulação
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Não autorizado no Datajud (${response.status}). Possível rotação de APIKey pública do CNJ.`);
      }

      if (!response.ok) return [];

      const searchData = await response.json();
      const hits = searchData.hits?.hits || [];

      return hits.map((hit: any) => {
        const source = hit._source || {};
        return {
          process_number: formatCNJ(source.numeroProcesso || ''),
          court: source.orgaoJulgador?.nome || 'Vara Federal/Estadual/Trabalho',
          comarca: source.tribunal || tribunal.toUpperCase(),
          lawsuit_class: source.classe?.nome || 'Procedimento Judiciário',
          status: 'Ativo'
        };
      });
    });

    // Aguarda a resolução de todas as chamadas em paralelo
    const results = await Promise.all(searchPromises);
    
    // Consolida os resultados e remove processos duplicados (Set)
    const todosProcessosMap = new Map<string, any>();
    
    results.flat().forEach(proc => {
      if (proc.process_number) {
        todosProcessosMap.set(proc.process_number, proc);
      }
    });

    const processosConsolidados = Array.from(todosProcessosMap.values());

    return NextResponse.json({ 
      success: true, 
      processos: processosConsolidados,
      message: processosConsolidados.length === 0 ? 'Busca concluída, mas nenhum processo foi encontrado para esta OAB nas regiões consultadas.' : undefined
    });

  } catch (err: any) {
    console.warn(`Pesquisa paralela do Datajud falhou, ativando fallback de simulação: ${err.message}`);
    
    // Fallback de simulação com dados realistas
    const mockProcessos = [
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.26.0100`,
        court: '4ª Vara Cível da Comarca da Capital (Simulado TJSP)',
        comarca: `TJSP`,
        lawsuit_class: 'Procedimento Comum Cível',
        status: 'Ativo'
      },
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.19.0001`,
        court: '12ª Vara de Família (Simulado TJRJ)',
        comarca: `TJRJ`,
        lawsuit_class: 'Divórcio Consensual',
        status: 'Ativo'
      },
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2023.5.02.0002`,
        court: '2ª Vara do Trabalho de São Paulo (Simulado TRT2)',
        comarca: `TRT2`,
        lawsuit_class: 'Ação Trabalhista',
        status: 'Ativo'
      }
    ];

    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      processos: mockProcessos,
      message: `Buscando em modo simulação (Datajud indisponível ou APIKey expirada: ${err.message}).`
    });
  }
}
