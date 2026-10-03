import { getUserAdminContext } from "../_shared/openai-connection.ts";

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

    if (roleError) return json({ error: 'Não foi possível verificar o acesso administrativo.' }, 500);
    if (!role) return json({ error: 'Apenas o Plenitude pode consultar os usuários.' }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action !== 'list') return json({ error: 'Ação inválida.' }, 400);

    const authUsers: Array<{
      id: string;
      email?: string;
      created_at?: string;
      user_metadata?: Record<string, unknown>;
    }> = [];
    const perPage = 1000;
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('Falha ao listar usuários do Auth:', error);
        return json({ error: 'Não foi possível carregar os usuários cadastrados.' }, 500);
      }
      authUsers.push(...data.users);
      if (data.users.length < perPage) break;
    }

    const visibleAuthUsers = authUsers.filter((item) => item.id !== user.id);
    if (visibleAuthUsers.length === 0) return json({ users: [] });

    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('user_id, username, password, created_at, plan, permissions')
      .in('user_id', visibleAuthUsers.map((item) => item.id));

    if (profilesError) {
      console.error('Falha ao carregar perfis de usuários:', profilesError);
      return json({ error: 'Não foi possível carregar os perfis dos usuários.' }, 500);
    }

    const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const users = visibleAuthUsers.map((authUser) => {
      const profile = profilesByUserId.get(authUser.id);
      const metadataUsername = authUser.user_metadata?.username;
      const emailUsername = authUser.email?.split('@')[0];
      return {
        user_id: authUser.id,
        username:
          profile?.username ??
          (typeof metadataUsername === 'string' ? metadataUsername : null) ??
          emailUsername ??
          'Usuário',
        password: profile?.password ?? null,
        created_at: profile?.created_at ?? authUser.created_at ?? new Date(0).toISOString(),
        plan: profile?.plan ?? 'free',
        permissions: profile?.permissions ?? null,
      };
    });

    return json({ users });
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
