// Pré-carregamento e cache de áudios (arquivos diretos, ex.: storage).
// Usa a Cache Storage API para guardar os arquivos e servir a partir de
// um blob local, deixando o início da etapa praticamente instantâneo —
// especialmente útil em tablets com rede lenta ou instável.

const CACHE_NAME = 'sonoplastia-audio-v1';

// Só faz sentido cachear arquivos diretos. YouTube/Spotify são players
// embutidos e não passam por aqui.
export function isCacheableAudioUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return false;
  if (u.includes('spotify.com') || u.startsWith('spotify:')) return false;
  return u.startsWith('http') || u.startsWith('blob:');
}

function cacheSupported(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined';
}

// Object URLs já criados a partir do cache, para reaproveitar e revogar.
const blobUrlMap = new Map<string, string>();
// Requisições de prefetch em andamento, para não duplicar.
const inFlight = new Map<string, Promise<void>>();

/** Baixa e guarda o áudio no cache (silencioso se falhar). */
export async function prefetchAudio(url: string): Promise<void> {
  if (!isCacheableAudioUrl(url) || url.startsWith('blob:')) return;
  if (!cacheSupported()) return;
  if (inFlight.has(url)) return inFlight.get(url);

  const task = (async () => {
    // Retry leve com backoff: redes de tablet oscilam bastante.
    // Bug corrigido: fetch sem timeout deixava a promise pendurada para
    // sempre em redes instáveis (tablets), bloqueando novas tentativas
    // para a mesma URL. Agora aborta em 20s por tentativa.
    const attempt = async (): Promise<void> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try {
        const cache = await caches.open(CACHE_NAME);
        const existing = await cache.match(url);
        if (existing) return;
        const res = await fetch(url, { mode: 'cors', cache: 'force-cache', signal: ctrl.signal });
        if (res.ok) {
          await cache.put(url, res.clone());
          void trimCache();
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    };
    try {
      await attempt();
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 800));
        await attempt();
      } catch (err) {
        // Silencioso — perder o cache não deve quebrar reprodução.
        // eslint-disable-next-line no-console
        console.warn('[audioCache] prefetch falhou:', url, err);
      }
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, task);
  return task;
}

/** Pré-carrega vários áudios em paralelo. */
export function prefetchAudios(urls: (string | null | undefined)[]): void {
  const unique = Array.from(new Set(urls.filter(isCacheableAudioUrl) as string[]));
  unique.forEach((u) => { void prefetchAudio(u); });
}

// Máximo de áudios guardados no cache (FIFO). Evita crescimento infinito.
const MAX_CACHE_ENTRIES = 60;

/** Remove os itens mais antigos quando o cache passa do limite. */
async function trimCache(): Promise<void> {
  if (!cacheSupported()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length <= MAX_CACHE_ENTRIES) return;
    const excess = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
    await Promise.all(excess.map(async (req) => {
      await cache.delete(req);
      // Bug corrigido: object URLs ficavam pendurados na memória para
      // sempre. Agora revogamos junto com a remoção do cache.
      const blobUrl = blobUrlMap.get(req.url);
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
        blobUrlMap.delete(req.url);
      }
    }));
  } catch {
    // noop
  }
}

/** Libera todos os object URLs (chamar em logout ou reset). */
export function clearAudioBlobCache(): void {
  blobUrlMap.forEach((objectUrl) => {
    try { URL.revokeObjectURL(objectUrl); } catch { /* noop */ }
  });
  blobUrlMap.clear();
}

/** Indica se o áudio já está pronto em cache (para UI de status). */
export async function isAudioCached(url: string | null | undefined): Promise<boolean> {
  if (!isCacheableAudioUrl(url) || !cacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(url as string);
    return !!res;
  } catch {
    return false;
  }
}

/**
 * Retorna uma URL de blob local se o áudio já estiver em cache,
 * pronta para tocar de imediato. Caso contrário retorna null e
 * dispara o prefetch em segundo plano para a próxima vez.
 */
export async function getPlayableAudioUrl(url: string): Promise<string | null> {
  if (!isCacheableAudioUrl(url) || url.startsWith('blob:')) return null;
  if (!cacheSupported()) return null;

  if (blobUrlMap.has(url)) return blobUrlMap.get(url)!;

  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(url);
    if (!res) {
      void prefetchAudio(url);
      return null;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    blobUrlMap.set(url, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}
