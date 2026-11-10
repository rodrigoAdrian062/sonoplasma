import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
    if (!targetId) return json({ error: 'Usuário não informado' }, 400)
    if (targetId === userData.user.id) {
      return json({ error: 'Não é possível excluir a conta do Plenitude' }, 400)
    }

    // Never allow deleting another super_admin.
    const { data: targetRole, error: targetRoleError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetId)
      .eq('role', 'super_admin')
      .maybeSingle()
    if (targetRoleError) {
      console.error('Falha ao verificar o perfil do usuário a excluir:', targetRoleError)
      return json({ error: 'Não foi possível verificar o usuário selecionado.', details: targetRoleError.message }, 500)
    }
    if (targetRole) return json({ error: 'Não é possível excluir um administrador' }, 400)

    async function listStorageFiles(folder: string): Promise<string[]> {
      const paths: string[] = []
      const pageSize = 1000
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await admin.storage.from('stage-audios').list(folder, {
          limit: pageSize,
          offset,
        })
        if (error) throw error

        const entries = data ?? []
        for (const entry of entries) {
          const path = `${folder}/${entry.name}`
          if (entry.id) {
            paths.push(path)
          } else {
            paths.push(...await listStorageFiles(path))
          }
        }

        if (entries.length < pageSize) break
      }
      return paths
    }

    const audioStoragePaths = await listStorageFiles(targetId)
    for (let offset = 0; offset < audioStoragePaths.length; offset += 100) {
      const { error } = await admin.storage
        .from('stage-audios')
        .remove(audioStoragePaths.slice(offset, offset + 100))
      if (error) {
        console.error('Falha ao remover arquivos de áudio do usuário:', error)
        return json({ error: 'Não foi possível remover os arquivos de áudio do usuário.', details: error.message }, 500)
      }
    }

    const { error: audiosError } = await admin
      .from('sonoplastia_audios_biblioteca')
      .delete()
      .eq('owner_id', targetId)
    if (audiosError) {
      console.error('Falha ao remover músicas da biblioteca do usuário:', audiosError)
      return json({ error: 'Não foi possível remover as músicas da biblioteca do usuário.', details: audiosError.message }, 500)
    }

    const { error: foldersError } = await admin
      .from('sonoplastia_audios_pastas')
      .delete()
      .eq('owner_id', targetId)
    if (foldersError) {
      console.error('Falha ao remover pastas da biblioteca do usuário:', foldersError)
      return json({ error: 'Não foi possível remover as pastas da biblioteca do usuário.', details: foldersError.message }, 500)
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId)
    if (delErr) return json({ error: delErr.message }, 400)

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
