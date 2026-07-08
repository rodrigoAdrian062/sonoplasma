import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// One-time idempotent bootstrap of the Plenitude master account.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // If a super_admin already exists, do nothing.
    const { data: existing } = await admin
      .from('user_roles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1)
      .maybeSingle()

    if (existing) {
      return json({ success: true, alreadyExists: true }, 200)
    }

    const email = 'plenitude@plenitude.app'
    const password = '353959'

    let userId: string | undefined

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: 'plenitude' },
    })

    if (createErr) {
      // Account might already exist from a previous run: find it.
      const { data: list } = await admin.auth.admin.listUsers()
      userId = list?.users?.find((u) => u.email === email)?.id
    } else {
      userId = created.user?.id
    }

    if (!userId) {
      return json({ error: 'Não foi possível criar a conta do Plenitude' }, 500)
    }

    // Ensure it is super_admin (remove default 'user' role added by trigger).
    await admin.from('user_roles').delete().eq('user_id', userId)
    await admin.from('user_roles').insert({ user_id: userId, role: 'super_admin' })
    await admin.from('profiles').upsert({ user_id: userId, username: 'plenitude' }, { onConflict: 'user_id' })

    return json({ success: true, user_id: userId }, 200)
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
