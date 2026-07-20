// Converte URLs de YouTube/Spotify em URLs de embed prontos para <iframe>.

export type StreamKind = 'youtube' | 'spotify' | null;
export type SpotifyType = 'track' | 'album' | 'playlist' | 'episode' | 'show' | 'artist';

const SPOTIFY_TYPES = new Set<SpotifyType>(['track', 'album', 'playlist', 'episode', 'show', 'artist']);
const SPOTIFY_LOCALE = 'pt-BR';

export function detectStream(url: string): StreamKind {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('open.spotify.com') || u.startsWith('spotify:')) return 'spotify';
  return null;
}

export function isStreamingUrl(url: string): boolean {
  return detectStream(url) !== null;
}

export function parseSpotify(url: string): { type: SpotifyType; id: string } | null {
  const raw = (url || '').trim();
  if (!raw) return null;

  const uriMatch = raw.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)$/i);
  if (uriMatch) return { type: uriMatch[1].toLowerCase() as SpotifyType, id: uriMatch[2] };

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(normalized);
    if (!u.hostname.toLowerCase().includes('open.spotify.com')) return null;

    // Aceita variações em qualquer ordem:
    // /track/ID, /intl-pt/track/ID, /embed/track/ID,
    // /intl-pt/embed/track/ID, /embed/intl-pt/track/ID e até URLs já duplicadas.
    const parts = u.pathname
      .split('/')
      .filter(Boolean)
      .filter((part) => !/^intl-[a-z]{2}(?:-[a-z]{2})?$/i.test(part) && part.toLowerCase() !== 'embed');

    const typeIndex = parts.findIndex((part) => SPOTIFY_TYPES.has(part.toLowerCase() as SpotifyType));
    if (typeIndex < 0) return null;

    const type = parts[typeIndex].toLowerCase() as SpotifyType;
    const id = parts[typeIndex + 1]?.match(/^[a-zA-Z0-9]+/)?.[0];
    if (!id) return null;
    return { type, id };
  } catch {
    return null;
  }
}

export function getSpotifyUri(url: string): string | null {
  const parsed = parseSpotify(url);
  return parsed ? `spotify:${parsed.type}:${parsed.id}` : null;
}

export function getSpotifyUrl(url: string, opts: { embed?: boolean; autoplay?: boolean } = {}): string | null {
  const parsed = parseSpotify(url);
  if (!parsed) return null;
  const path = opts.embed ? `/embed/${parsed.type}/${parsed.id}` : `/${parsed.type}/${parsed.id}`;
  const u = new URL(`https://open.spotify.com${path}`);
  if (opts.embed) {
    // Mantém o formato oficial gerado pelo Spotify. Isso evita embeds vazios
    // em alguns navegadores quando a URL vem só com locale/autoplay.
    u.searchParams.set('utm_source', 'generator');
    u.searchParams.set('theme', '0');
  }
  // O embed do Spotify pode quebrar com “Incorrect locale information provided”
  // quando o navegador/ambiente não informa locale válido. Forçamos pt-BR.
  u.searchParams.set('locale', SPOTIFY_LOCALE);
  if (opts.autoplay) u.searchParams.set('autoplay', '1');
  return u.toString();
}

export function isSpotifyUrl(url: string): boolean {
  return parseSpotify(url) !== null;
}

function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    // /embed/ID or /shorts/ID
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.findIndex((p) => p === 'embed' || p === 'shorts');
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
    return null;
  } catch {
    return null;
  }
}

function spotifyEmbed(url: string, opts: { autoplay?: boolean } = {}): string | null {
  return getSpotifyUrl(url, { embed: true, autoplay: opts.autoplay });
}

export function toEmbedUrl(url: string, opts: { autoplay?: boolean } = {}): string | null {
  const kind = detectStream(url);
  if (kind === 'youtube') {
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
  if (kind === 'spotify') {
    return spotifyEmbed(url, opts);
  }
  return null;
}
