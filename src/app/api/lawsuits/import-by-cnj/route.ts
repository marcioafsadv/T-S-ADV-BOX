import { NextResponse } from 'next/server';

// Função para mapear o tribunal correto com base nos dígitos do CNJ
// Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (Ex: 0012345-67.2024.8.26.0100)
// J = segmento da justiça (8 = Estadual, 4 = Federal, 5 = Trabalho)
// TR = código do tribunal (26 = SP, 19 = RJ, etc.)
function getTribunalFromCNJ(processNumber: string): string {
  const clean = processNumber.replace(/\D/g, '');
  if (clean.length !== 20) return 'tjsp';
  
  const j = clean.slice(13, 14); // Segmento da Justiça
  const tr = clean.slice(14, 16); // Tribunal

  if (j === '8') {
    // Justiça Estadual
    const ufMap: Record<string, string> = {
      '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
      '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
      '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
      '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse',
      '26': 'tjsp', '27': 'tjto'
    };
    return ufMap[tr] || 'tjsp';
  } else if (j === '5') {
    // Justiça do Trabalho
    return `trt${parseInt(tr, 10)}`;
  } else if (j === '4') {
    // Justiça Federal
    return `trf${parseInt(tr, 10)}`;
  } else if (j === '1') {
    return 'stf';
  } else if (j === '3') {
    return 'stj';
  }
  return 'tjsp';
}

export async function POST(request: Request) {
  try {
    const { processNumber } = await request.json();
    const cleanNumber = processNumber.replace(/\D/g, '');

    if (cleanNumber.length !== 20) {
      throw new Error('O número do processo deve possuir exatamente 20 dígitos (Padrão CNJ).');
    }

    const tribunal = getTribunalFromCNJ(cleanNumber);
    // Usamos a chave pública validada da Wiki do CNJ que retorna 200 OK
    const apiKey = process.env.DATAJUD_API_KEY || 'ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;

    const queryPayload = {
      query: {
        match: {
          numeroProcesso: cleanNumber
        }
      },
      size: 1
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey.startsWith('ApiKey ') ? apiKey : `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryPayload),
      signal: AbortSignal.timeout(25000) // Aumentado para 25 segundos para evitar timeouts em APIs do governo lentas
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do Datajud: ${response.status} - ${errorText}`);
    }

    const searchData = await response.json();
    const hit = searchData.hits?.hits?.[0];

    if (!hit) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nenhum processo encontrado com este número na base pública do Datajud.' 
      });
    }

    const source = hit._source || {};
    return NextResponse.json({
      success: true,
      data: {
        process_number: processNumber,
        court: source.orgaoJulgador?.nome || 'Vara Cível',
        comarca: source.tribunal || tribunal.toUpperCase(),
        lawsuit_class: source.classe?.nome || 'Procedimento Comum Cível'
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
