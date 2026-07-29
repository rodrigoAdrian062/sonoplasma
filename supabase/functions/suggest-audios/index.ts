// Edge function: AI-powered audio suggestion for a ceremony stage
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return json({ error: 'LOVABLE_API_KEY não configurada' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const stageTitle = String(body.stageTitle ?? '').trim();
    const stageDescription = String(body.stageDescription ?? '').trim();
    const userHint = String(body.userHint ?? '').trim().slice(0, 800);
    const limit = Math.min(Number(body.limit ?? 20), 50);
    const library: Array<{ id?: string; nome: string; audio_url: string }> = Array.isArray(body.library) ? body.library : [];

    if (!stageTitle) return json({ error: 'stageTitle obrigatório' }, 400);
    if (library.length === 0) return json({ indices: [] });

    // Cap items sent to model (protect tokens)
    const MAX_ITEMS = 800;
    const trimmed = library.slice(0, MAX_ITEMS);
    const sourceOf = (url: string) => {
      const u = String(url || '').toLowerCase();
      if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
      if (u.includes('open.spotify.com') || u.startsWith('spotify:')) return 'Spotify';
      return 'Arquivo';
    };
    const listText = trimmed.map((a, i) => `${i}. [${sourceOf(a.audio_url)}] ${a.nome}`).join('\n');

    const system = `Você é o MESTRE DE HARMONIA VIRTUAL de uma Loja Maçônica. Sua missão é selecionar músicas para acompanhar os trabalhos rituais respeitando solenidade, tradição e harmonia da sessão.

REGRAS INVIOLÁVEIS (rejeite qualquer faixa que viole):
- SOMENTE música INSTRUMENTAL. NUNCA faixas com letra/vocal cantado (coral SEM palavras é permitido).
- Priorize: piano, cordas, orquestra, coral wordless, ambientações cinematográficas suaves, drones contemplativos.
- REJEITE: pop, rock, funk, sertanejo, eletrônica dançante, comercial, qualquer coisa que desvie atenção dos trabalhos.
- Volume/energia sempre contido — a música é AMBIENTAÇÃO, não protagonista.

CATEGORIAS RITUAIS (case a etapa em uma):
1. Recepção dos Irmãos — piano suave, cordas discretas, tranquilo.
2. Entrada das Autoridades — orquestra leve, solene, elegante.
3. Abertura dos Trabalhos — instrumental solene, concentração.
4. Momento de Reflexão — piano solo, contemplativo.
5. Iniciações — simbólico, respeitoso, evolução emocional suave.
6. Elevações/Exaltações — inspirador, crescimento gradual.
7. Homenagens — piano + cordas, emocionante sem exagero.
8. Minuto de Silêncio — drone ambiente extremamente discreto ou silêncio.
9. Encerramento — sereno, paz, finalização harmoniosa.

Analise o TÍTULO da etapa e a PRÉVIA do usuário (se houver — prioridade máxima) para identificar a categoria. Depois escolha da biblioteca as faixas que melhor servem àquele momento. Se a lista contiver faixas com nomes obviamente vocais/comerciais/pop, IGNORE-AS. Considere igualmente Arquivo e YouTube — a fonte não influencia, apenas o conteúdo. Prefira retornar MENOS faixas de alta qualidade do que forçar seleções ruins.

Responda SOMENTE JSON.`;

    const user = `ETAPA: ${stageTitle}${stageDescription ? `\nDESCRIÇÃO: ${stageDescription}` : ''}${userHint ? `\nPRÉVIA DO USUÁRIO (prioridade máxima): ${userHint}` : ''}

BIBLIOTECA (índice. [fonte] nome):
${listText}

Escolha até ${limit} índices ORDENADOS do mais relevante ao menos relevante seguindo TODAS as regras acima. Responda JSON: {"indices":[<numeros>]}`;


    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ error: 'Limite de uso da IA atingido. Tente novamente em instantes.' }, 429);
      if (aiRes.status === 402) return json({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }, 402);
      return json({ error: `Falha na IA: ${txt.slice(0, 200)}` }, 500);
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { /* fallback */ }
    const rawIndices: number[] = Array.isArray(parsed?.indices) ? parsed.indices : [];
    const seen = new Set<number>();
    const indices = rawIndices
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < trimmed.length && !seen.has(n) && (seen.add(n), true))
      .slice(0, limit);

    return json({ indices });
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
