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
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function ytId(url: string): string | null {
  return getYouTubeVideoId(url);
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
