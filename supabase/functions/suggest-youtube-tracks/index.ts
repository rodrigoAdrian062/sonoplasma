// Edge function: AI-generated YouTube instrumental suggestions for a Masonic stage.
// Returns curated track names (real, well-known instrumental pieces) with YouTube
// search URLs — and, when the model is confident, a direct watch URL.
import { getOpenAIKeyForRequest } from '../_shared/openai-connection.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Suggestion {
  nome: string;
  artista?: string;
  motivo?: string;
  categoria?: string;
  duracao?: string;
  bpm?: number;
  solenidade?: number;
  youtube_url?: string;
  youtube_search_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const connection = await getOpenAIKeyForRequest(req);
    if (connection.error) return json({ error: connection.error }, connection.status);
    if (!connection.apiKey) return json({ error: 'Conecte sua chave da OpenAI na aba Mestre de Harmonia.' }, 400);

    const body = await req.json().catch(() => ({}));
    const stageTitle = String(body.stageTitle ?? '').trim();
    const stageDescription = String(body.stageDescription ?? '').trim();
    const userHint = String(body.userHint ?? '').trim().slice(0, 1000);
    const sessionType = String(body.sessionType ?? '').trim().slice(0, 200);
    const limit = Math.min(Math.max(Number(body.limit ?? 8), 1), 15);

    if (!stageTitle) return json({ error: 'stageTitle obrigatório' }, 400);

    const system = `Você é o MESTRE DE HARMONIA VIRTUAL de uma Loja Maçônica. Sua tarefa: sugerir músicas REAIS e conhecidas do YouTube para acompanhar um momento ritual específico.

REGRAS INVIOLÁVEIS:
- SOMENTE música INSTRUMENTAL (piano solo, cordas, orquestra, coral wordless, ambient cinematográfico, órgão sacro). NUNCA faixas com letra cantada.
- REJEITE completamente: pop, rock, funk, sertanejo, eletrônica dançante, trilhas comerciais ou modernas com vocal.
- Prefira: peças clássicas (Bach, Albinoni, Pärt, Barber, Debussy, Satie, Fauré, Mozart Requiem instrumental, Adagios), trilhas cerimoniais reconhecidas, música sacra instrumental, ambientações contemplativas de compositores conhecidos (Ludovico Einaudi, Max Richter, Yiruma, Kevin Kern, Ryuichi Sakamoto instrumental).
- A música deve servir como AMBIENTAÇÃO discreta, respeitando solenidade e tradição maçônica.

CATEGORIAS (case a etapa em uma):
1. Recepção dos Irmãos — piano suave/cordas discretas
2. Entrada das Autoridades — orquestra leve, solene, majestosa
3. Abertura dos Trabalhos — instrumental solene, concentração
4. Reflexão — piano solo contemplativo
5. Iniciação — simbólico, evolução emocional suave
6. Elevação/Exaltação — inspirador, crescimento gradual
7. Homenagem — piano+cordas, emocionante sem exagero
8. Silêncio — drone ambient extremamente discreto ou silêncio
9. Encerramento — sereno, sensação de paz

Para cada sugestão forneça:
- nome: título REAL da obra (ex: "Adagio for Strings — Samuel Barber")
- artista: compositor/intérprete
- categoria: uma das 9 acima
- motivo: 1 frase curta explicando por que combina
- duracao: aproximada, ex: "8:00"
- bpm: aproximado (número)
- solenidade: 1 a 5
- youtube_url: URL direta https://www.youtube.com/watch?v=... APENAS se você tiver certeza absoluta de um vídeo específico. Se houver qualquer dúvida, OMITA este campo — o sistema gera busca automaticamente.

Responda SOMENTE JSON no formato: {"suggestions":[{...}, ...]}`;

    const user = `ETAPA RITUAL: ${stageTitle}
${stageDescription ? `DESCRIÇÃO: ${stageDescription}\n` : ''}${sessionType ? `TIPO DE SESSÃO: ${sessionType}\n` : ''}${userHint ? `PRÉVIA DO USUÁRIO (prioridade máxima): ${userHint}\n` : ''}
Sugira ${limit} músicas REAIS e conhecidas do YouTube que combinem perfeitamente com este momento. Ordene do mais essencial ao mais opcional. Responda JSON: {"suggestions":[...]}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 401) return json({ error: 'Chave da OpenAI inválida ou sem autorização.' }, 500);
      if (aiRes.status === 429) return json({ error: 'Limite ou saldo da API OpenAI atingido. Verifique o faturamento da API.' }, 429);
      return json({ error: `Falha na API OpenAI (${aiRes.status}). Tente novamente mais tarde.` }, 500);
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }
    const rawList: any[] = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    const suggestions: Suggestion[] = rawList
      .filter((s) => s && typeof s.nome === 'string' && s.nome.trim())
      .slice(0, limit)
      .map((s) => {
        const nome = String(s.nome).trim();
        const artista = s.artista ? String(s.artista).trim() : undefined;
        const query = encodeURIComponent(`${nome}${artista ? ' ' + artista : ''} instrumental`);
        let youtube_url: string | undefined;
        const rawUrl = typeof s.youtube_url === 'string' ? s.youtube_url.trim() : '';
        // Only trust well-formed watch URLs
        if (/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(rawUrl)) {
          youtube_url = rawUrl;
        }
        return {
          nome,
          artista,
          motivo: s.motivo ? String(s.motivo).slice(0, 300) : undefined,
          categoria: s.categoria ? String(s.categoria).slice(0, 80) : undefined,
          duracao: s.duracao ? String(s.duracao).slice(0, 20) : undefined,
          bpm: Number.isFinite(Number(s.bpm)) ? Number(s.bpm) : undefined,
          solenidade: Number.isFinite(Number(s.solenidade)) ? Math.min(5, Math.max(1, Number(s.solenidade))) : undefined,
          youtube_url,
          youtube_search_url: `https://www.youtube.com/results?search_query=${query}`,
        };
      });

    return json({ suggestions });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Erro inesperado' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
