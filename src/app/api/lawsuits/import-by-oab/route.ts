import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let oabNumber = '';
  let oabUf = 'SP';

  try {
    const body = await request.json();
    oabNumber = body.oabNumber;
    oabUf = body.oabUf || 'SP';

    // A chave do Escavador API configurada pelo usuário nas variáveis de ambiente
    const apiKey = process.env.ESCAVADOR_API_KEY;

    if (!apiKey) {
      throw new Error('A chave ESCAVADOR_API_KEY não está configurada no servidor. Por favor, adicione sua chave de API do Escavador.');
    }

    // Endpoint oficial do Escavador API V2 para consulta de processos por OAB do advogado
    const url = `https://api.escavador.com/api/v2/advogados/oab/${oabUf.toUpperCase()}/${oabNumber}/processos`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do Escavador (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // O Escavador V2 costuma envelopar o retorno sob o objeto "resposta" e a lista sob "itens"
    const resposta = data.resposta || {};
    const itens = resposta.itens || resposta.items || data.items || data.itens || [];

    const processos = itens.map((item: any) => ({
      process_number: item.numero_cnj || item.numero || 'Não especificado',
      court: item.tribunal?.sigla || item.tribunal?.nome || 'Tribunal de Justiça',
      comarca: item.comarca || oabUf.toUpperCase(),
      lawsuit_class: item.classe || 'Procedimento Judiciário',
      status: 'Ativo'
    }));

    return NextResponse.json({ 
      success: true, 
      processos 
    });

  } catch (err: any) {
    console.error(`Erro na busca do Escavador: ${err.message}`);
    
    // Fallback de demonstração realista se a chave não estiver configurada ou se houver erro
    const mockProcessos = [
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.26.0100`,
        court: '4ª Vara Cível da Comarca da Capital (Simulado Escavador)',
        comarca: `TJ${oabUf.toUpperCase()}`,
        lawsuit_class: 'Procedimento Comum Cível',
        status: 'Ativo'
      },
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.19.0001`,
        court: '12ª Vara de Família (Simulado Escavador)',
        comarca: `TJ${oabUf.toUpperCase()}`,
        lawsuit_class: 'Divórcio Consensual',
        status: 'Ativo'
      },
      {
        process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2023.5.02.0002`,
        court: '2ª Vara do Trabalho de São Paulo (Simulado Escavador)',
        comarca: `TRT2`,
        lawsuit_class: 'Ação Trabalhista',
        status: 'Ativo'
      }
    ];

    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      processos: mockProcessos,
      message: `Modo demonstração ativado devido a erro na API do Escavador: ${err.message}`
    });
  }
}
