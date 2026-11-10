import { getUserAdminContext } from '../_shared/openai-connection.ts';

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
    const { data: role, error: roleError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError) {
      console.error('Falha ao verificar acesso administrativo à biblioteca:', roleError);
      return json({ error: 'Não foi possível verificar o acesso administrativo.' }, 500);
    }
    if (!role) return json({ error: 'Apenas o Plenitude pode consultar a biblioteca dos usuários.' }, 403);

    const { data: audios, error: audiosError } = await admin
      .from('sonoplastia_audios_biblioteca')
      .select('*')
      .order('created_at', { ascending: false });
    if (audiosError) {
      console.error('Falha ao carregar músicas da biblioteca administrativa:', audiosError);
      return json({ error: 'Não foi possível carregar as músicas da biblioteca.' }, 500);
    }

    const { data: folders, error: foldersError } = await admin
      .from('sonoplastia_audios_pastas')
      .select('*')
      .order('ordem', { ascending: true });
    if (foldersError) {
      console.error('Falha ao carregar pastas da biblioteca administrativa:', foldersError);
      return json({ error: 'Não foi possível carregar as pastas da biblioteca.' }, 500);
    }

    return json({ audios, folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return json({ error: message }, message === 'Não autenticado.' ? 401 : 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
