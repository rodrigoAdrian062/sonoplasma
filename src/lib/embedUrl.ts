// Converte URLs de YouTube/Spotify em URLs de embed prontos para <iframe>.

export type StreamKind = 'youtube' | 'spotify' | null;

export function detectStream(url: string): StreamKind {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('open.spotify.com') || u.startsWith('spotify:')) return 'spotify';
  return null;
}

export function isStreamingUrl(url: string): boolean {
  return detectStream(url) !== null;
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

function spotifyEmbed(url: string): string | null {
  try {
    // spotify:track:ID -> https://open.spotify.com/embed/track/ID
    if (url.startsWith('spotify:')) {
      const parts = url.split(':');
      if (parts.length >= 3) return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
      return null;
    }
    const u = new URL(url);
    // Remove barras iniciais, prefixo /embed/ e prefixo de idioma /intl-xx/
    let path = u.pathname.replace(/^\/+/, '');
    path = path.replace(/^embed\//, '');
    path = path.replace(/^intl-[a-z]{2}\//i, '');
    if (!path) return null;
    return `https://open.spotify.com/embed/${path}`;
  } catch {
    return null;
  }
}

export function toEmbedUrl(url: string, opts: { autoplay?: boolean } = {}): string | null {
  const kind = detectStream(url);
  if (kind === 'youtube') {
    const id = ytId(url);
    if (!id) return null;
    const params = new URLSearchParams();
    if (opts.autoplay) params.set('autoplay', '1');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  if (kind === 'spotify') {
    return spotifyEmbed(url);
  }
  return null;
}
