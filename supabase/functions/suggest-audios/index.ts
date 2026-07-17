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
    const limit = Math.min(Number(body.limit ?? 20), 50);
    const library: Array<{ id?: string; nome: string; audio_url: string }> = Array.isArray(body.library) ? body.library : [];

    if (!stageTitle) return json({ error: 'stageTitle obrigatório' }, 400);
    if (library.length === 0) return json({ indices: [] });

    // Cap items sent to model (protect tokens)
    const MAX_ITEMS = 400;
    const trimmed = library.slice(0, MAX_ITEMS);
    const listText = trimmed.map((a, i) => `${i}. ${a.nome}`).join('\n');

    const system = `Você é um especialista em ritualística maçônica e música cerimonial. Sua tarefa: dada uma etapa de cerimônia (título + descrição), escolher da biblioteca as músicas MAIS adequadas ao momento — considerando tema, solenidade, tradição maçônica, referências bíblicas/espirituais e clima emocional apropriado. Ex: "Abertura do Livro da Lei" combina com música sacra/solene/adoração; "Cadeia de União" com música fraternal; "Luto/Mestre" com música fúnebre/reflexiva. Responda SOMENTE JSON.`;

    const user = `ETAPA: ${stageTitle}${stageDescription ? `\nDESCRIÇÃO: ${stageDescription}` : ''}

BIBLIOTECA (índice. nome):
${listText}

Escolha até ${limit} índices ORDENADOS do mais relevante ao menos relevante. Ignore músicas irrelevantes — melhor retornar menos do que forçar. Responda JSON: {"indices":[<numeros>]}`;

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
