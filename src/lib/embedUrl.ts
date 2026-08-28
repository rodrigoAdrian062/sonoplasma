// Converte URLs de YouTube e Spotify em URLs de embed prontos para <iframe>.

export type StreamKind = 'youtube' | 'spotify' | null;
export type SpotifyType = 'track' | 'album' | 'playlist' | 'episode' | 'show' | 'artist';

export function detectStream(url: string): StreamKind {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('open.spotify.com') || u.includes('spotify.link') || u.startsWith('spotify:')) return 'spotify';
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

  // https://open.spotify.com/[intl-xx/][embed/]track/ID?si=...
  const httpMatch = raw.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/i,
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
    // O iframe oficial do Spotify tem tocador interno e não aceita autoplay via querystring.
    return `https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=generator`;
  }
  return `https://open.spotify.com/${p.type}/${p.id}`;
}

export function isSpotifyUrl(url: string): boolean {
  return parseSpotify(url) !== null;
}

// --- YouTube ---
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const raw = url.trim();

  // ID puro (11 caracteres).
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  // Caminho preferencial: interpreta a URL de verdade.
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => ['embed', 'shorts', 'live', 'v'].includes(p));
      if (i >= 0 && parts[i + 1] && /^[A-Za-z0-9_-]{11}$/.test(parts[i + 1])) return parts[i + 1];
    }
  } catch {
    /* segue para o regex */
  }

  // Fallback por regex (links colados de forma incompleta).
  const match = raw.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|[?&]v=)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
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
  if (typeof window !== 'undefined') {
    params.set('origin', window.location.origin);
    params.set('widget_referrer', window.location.href);
  }
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('mute', '0'); // Garante que não inicie mutado se não solicitado
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
