import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { oabNumber, oabUf } = await request.json();

    const apiKey = process.env.JUSBRASIL_API_KEY;

    if (!apiKey) {
      // MODO SIMULAÇÃO (MOCK): Executado quando a chave do Jusbrasil não está nas variáveis do servidor.
      // Isso permite que o usuário teste a usabilidade do modal com dados fictícios estruturados de forma realista.
      const mockProcessos = [
        {
          process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.26.0100`,
          court: '4ª Vara Cível da Comarca da Capital',
          comarca: `São Paulo / ${oabUf.toUpperCase()}`,
          lawsuit_class: 'Procedimento Comum Cível',
          status: 'Ativo'
        },
        {
          process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2024.8.19.0001`,
          court: '12ª Vara de Família',
          comarca: `Rio de Janeiro / ${oabUf.toUpperCase()}`,
          lawsuit_class: 'Divórcio Consensual',
          status: 'Ativo'
        },
        {
          process_number: `00${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 89)}.2023.4.01.3400`,
          court: '1ª Vara Federal Cível da SJDF',
          comarca: `Distrito Federal / ${oabUf.toUpperCase()}`,
          lawsuit_class: 'Procedimento Comum Federal',
          status: 'Suspenso'
        }
      ];

      return NextResponse.json({ 
        success: true, 
        isMock: true, 
        processos: mockProcessos,
        message: 'Buscando em modo demonstração (JUSBRASIL_API_KEY não configurada no servidor).' 
      });
    }

    // INTEGRAÇÃO REAL COM A API JUSBRASIL DEVELOPER (MÓDULO OAB / PROCESSOS)
    // O endpoint padrão de busca por OAB da API Jusbrasil V2:
    const response = await fetch(`https://api.jusbrasil.com.br/v2/advogados/oab/${oabUf}/${oabNumber}/processos`, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do Jusbrasil: ${response.status} - ${errorText}`);
    }

    const jusbrasilData = await response.json();
    
    // Mapeia os campos retornados pela API Jusbrasil para a estrutura interna do nosso banco (lawsuits)
    const processos = (jusbrasilData.items || []).map((item: any) => ({
      process_number: item.numero_processo || item.numeroCNJ || 'Não especificado',
      court: item.tribunal?.nome || 'Tribunal de Justiça',
      comarca: item.comarca || 'Comarca Central',
      lawsuit_class: item.classe_processual || 'Procedimento Comum',
      status: 'Ativo'
    }));

    return NextResponse.json({ success: true, isMock: false, processos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
