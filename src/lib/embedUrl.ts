// Converte URLs de YouTube e Spotify em URLs de embed prontos para <iframe>.

export type StreamKind = 'youtube' | 'spotify' | null;
export type SpotifyType = 'track' | 'album' | 'playlist' | 'episode' | 'show' | 'artist';

export function detectStream(url: string): StreamKind {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('open.spotify.com') || u.startsWith('spotify:')) return 'spotify';
  return null;
}

export function isStreamingUrl(url: string): boolean {
  return detectStream(url) !== null;
}

// --- Spotify ---
export function parseSpotify(url: string): { type: SpotifyType; id: string } | null {
  if (!url) return null;
  const raw = url.trim();

  // spotify:track:ID
  const uriMatch = raw.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/i);
  if (uriMatch) return { type: uriMatch[1].toLowerCase() as SpotifyType, id: uriMatch[2] };

  // https://open.spotify.com/[intl-xx/]track/ID?si=...
  const httpMatch = raw.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/i,
  );
  if (httpMatch) return { type: httpMatch[1].toLowerCase() as SpotifyType, id: httpMatch[2] };

  return null;
}

export function getSpotifyUri(url: string): string | null {
  const p = parseSpotify(url);
  return p ? `spotify:${p.type}:${p.id}` : null;
}

export function getSpotifyUrl(url: string, opts: { embed?: boolean; autoplay?: boolean } = {}): string | null {
  const p = parseSpotify(url);
  if (!p) return null;
  if (opts.embed) {
    // O iframe oficial do Spotify tem tocador interno e não aceita autoplay via querystring;
    // mantemos utm_source só para higiene do link.
    return `https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=generator`;
  }
  return `https://open.spotify.com/${p.type}/${p.id}`;
}

export function isSpotifyUrl(url: string): boolean {
  return parseSpotify(url) !== null;
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
