// Converte URLs de YouTube em URLs de embed prontos para <iframe>.
// (Integração com Spotify foi removida do sistema.)

export type StreamKind = 'youtube' | 'spotify' | null;
export type SpotifyType = 'track' | 'album' | 'playlist' | 'episode' | 'show' | 'artist';

export function detectStream(url: string): StreamKind {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return null;
}

export function isStreamingUrl(url: string): boolean {
  return detectStream(url) !== null;
}

// --- Spotify (stubs — retornam null/false para desativar toda a integração) ---
export function parseSpotify(_url: string): { type: SpotifyType; id: string } | null {
  return null;
}
export function getSpotifyUri(_url: string): string | null {
  return null;
}
export function getSpotifyUrl(_url: string, _opts: { embed?: boolean; autoplay?: boolean } = {}): string | null {
  return null;
}
export function isSpotifyUrl(_url: string): boolean {
  return false;
}

// --- YouTube ---
function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.findIndex((p) => p === 'embed' || p === 'shorts');
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
    return null;
  } catch {
    return null;
  }
}

export function toEmbedUrl(url: string, opts: { autoplay?: boolean } = {}): string | null {
  const kind = detectStream(url);
  if (kind === 'spotify') return getSpotifyUrl(url, { embed: true, autoplay: opts.autoplay });
  if (kind !== 'youtube') return null;
  const id = ytId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  if (opts.autoplay) params.set('autoplay', '1');
  params.set('enablejsapi', '1');
  if (typeof window !== 'undefined') params.set('origin', window.location.origin);
  params.set('rel', '0');
  params.set('modestbranding', '1');
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
