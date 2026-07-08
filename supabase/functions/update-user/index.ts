import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Não autenticado' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
    if (!roleData) return json({ error: 'Apenas o Plenitude pode gerenciar acessos' }, 403)

    const body = await req.json().catch(() => ({}))
    const targetId = String(body.user_id ?? '')
    const password = String(body.password ?? '')

    if (!targetId) return json({ error: 'Usuário não informado' }, 400)
    if (password.length < 6) return json({ error: 'A senha deve ter pelo menos 6 caracteres' }, 400)

    // Prevent editing the master account here.
    if (targetId === userData.user.id) {
      return json({ error: 'Não é possível alterar a conta do Plenitude por aqui' }, 400)
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(targetId, { password })
    if (updErr) return json({ error: updErr.message }, 400)

    await admin.from('profiles').update({ password }).eq('user_id', targetId)

    return json({ success: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}
