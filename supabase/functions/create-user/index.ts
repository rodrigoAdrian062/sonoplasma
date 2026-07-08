import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const EMAIL_DOMAIN = 'plenitude.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identify the caller
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) {
      return json({ error: 'Não autenticado' }, 401)
    }

    // Only super_admin can create users
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleData) {
      return json({ error: 'Apenas o Plenitude pode criar acessos' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return json({ error: 'Usuário inválido (3-30 caracteres: letras, números, _ . -)' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'A senha deve ter pelo menos 6 caracteres' }, 400)
    }

    const email = `${username}@${EMAIL_DOMAIN}`

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    })

    if (createErr) {
      const msg = createErr.message?.includes('already') || createErr.message?.includes('registered')
        ? 'Esse usuário já existe'
        : createErr.message
      return json({ error: msg }, 400)
    }

    return json({ success: true, username, user_id: created.user?.id }, 200)
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
