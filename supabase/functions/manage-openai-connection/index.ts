import { encryptOpenAIKey, getUserAdminContext } from '../_shared/openai-connection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const { user, admin } = await getUserAdminContext(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    if (action === 'status') {
      const { data, error } = await admin
        .from('user_openai_connections')
        .select('key_suffix')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return json({ error: 'Não foi possível consultar a conexão OpenAI.' }, 500);
      return json({ connected: Boolean(data), keySuffix: data?.key_suffix ?? null });
    }

    if (action === 'disconnect') {
      const { error } = await admin
        .from('user_openai_connections')
        .delete()
        .eq('user_id', user.id);
      if (error) return json({ error: 'Não foi possível remover a conexão OpenAI.' }, 500);
      return json({ connected: false, keySuffix: null });
    }

    if (action !== 'connect') return json({ error: 'Ação inválida.' }, 400);
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!/^sk-[A-Za-z0-9_-]{20,500}$/.test(apiKey)) {
      return json({ error: 'Informe uma chave de API OpenAI válida.' }, 400);
    }

    const validationResponse = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (validationResponse.status === 401 || validationResponse.status === 403) {
      return json({ error: 'A OpenAI recusou a chave. Confira se ela está correta e ativa.' }, 400);
    }
    if (!validationResponse.ok) {
      return json({ error: `Não foi possível validar a chave na OpenAI (${validationResponse.status}).` }, 502);
    }

    const encrypted = await encryptOpenAIKey(apiKey);
    const { error } = await admin
      .from('user_openai_connections')
      .upsert({
        user_id: user.id,
        encrypted_key: encrypted.encryptedKey,
        initialization_vector: encrypted.initializationVector,
        key_suffix: apiKey.slice(-4),
        updated_at: new Date().toISOString(),
      });
    if (error) return json({ error: 'Não foi possível salvar a conexão OpenAI.' }, 500);

    return json({ connected: true, keySuffix: apiKey.slice(-4) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerenciar a conexão OpenAI.';
    return json({ error: message }, message === 'Não autenticado.' ? 401 : 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
