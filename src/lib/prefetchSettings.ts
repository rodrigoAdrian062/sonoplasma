// Pré-carregamento opcional dos áudios das próximas etapas.
// Guarda a preferência do usuário em localStorage e permite que
// componentes reajam à mudança sem depender de contexto global.
//
// Regra de negócio: só afeta o download em background. NUNCA toca
// áudio nenhum — o controle continua sendo "apenas um áudio por vez"
// gerenciado pelo AudioPlayerContext.

const STORAGE_KEY = 'sonoplastia:prefetchNextStages';
// Quantas etapas à frente pré-carregar no modo apresentação.
export const PREFETCH_LOOKAHEAD = 2;

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function read(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Padrão: ligado. Melhora o start no tablet sem custo perceptível.
    if (raw === null) return true;
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

export function isPrefetchEnabled(): boolean {
  return read();
}

export function setPrefetchEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* noop */
  }
  listeners.forEach((l) => {
    try { l(enabled); } catch { /* noop */ }
  });
}

export function subscribePrefetch(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
