import { supabase } from '@/integrations/supabase/client';

/**
 * Estado do usuário persistido no banco (tabela sonoplastia_estado).
 * Usado para que Sons Rápidos e playlists de música de fundo sobrevivam a um F5
 * ou troca de dispositivo, e não apenas no localStorage.
 */

export async function loadCloudState<T>(chave: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('sonoplastia_estado')
      .select('valor')
      .eq('chave', chave)
      .maybeSingle();
    if (error || !data) return null;
    return (data.valor as T) ?? null;
  } catch {
    return null;
  }
}

export async function saveCloudState(chave: string, valor: unknown): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await supabase
      .from('sonoplastia_estado')
      .upsert(
        { owner_id: uid, chave, valor: valor as never },
        { onConflict: 'owner_id,chave' }
      );
  } catch {
    /* silencioso: o localStorage continua sendo o cache local */
  }
}

/** Salva com debounce por chave para evitar excesso de escritas. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function saveCloudStateDebounced(chave: string, valor: unknown, delay = 600) {
  const existing = timers.get(chave);
  if (existing) clearTimeout(existing);
  timers.set(
    chave,
    setTimeout(() => {
      timers.delete(chave);
      void saveCloudState(chave, valor);
    }, delay)
  );
}
