// Validação e normalização de links de mídia (YouTube, Spotify e URLs diretas).
// Corrige formatos comuns colados pelo usuário antes de gravar no banco.

import { getYouTubeVideoId, parseSpotify } from '@/lib/embedUrl';

export type LinkKind = 'youtube' | 'spotify' | 'direct';

export type NormalizeResult = {
  ok: boolean;
  /** URL canônica (vazia quando inválida). */
  url: string;
  kind: LinkKind | null;
  tipo: string;
  corrected: boolean;
  /** Mensagem de erro (vazia quando válida). */
  error: string;
};

function fail(error: string): NormalizeResult {
  return { ok: false, url: '', kind: null, tipo: '', corrected: false, error };
}

/** Limpa lixo comum: espaços, aspas, markdown, pontuação final, texto colado junto. */
export function cleanRawLink(raw: string): string {
  let s = (raw || '').trim();
  // Remove aspas/parênteses/markdown envolventes.
  s = s.replace(/^["'`<([]+/, '').replace(/["'`>)\]]+$/, '');
  // Se houver texto antes do link, pega a primeira URL/URI.
  const m = s.match(/(https?:\/\/\S+|spotify:\S+|(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+|open\.spotify\.com\/\S+)/i);
  if (m) s = m[1];
  // Remove pontuação final.
  s = s.replace(/[),.;>\]}'"]+$/, '');
  // Corrige esquemas digitados errado.
  s = s.replace(/^https?:\/{1}(?!\/)/i, (v) => v.replace(':/', '://'));
  s = s.replace(/^(https?):\/\/\/+/i, '$1://');
  return s.trim();
}

/**
 * Valida e normaliza um link.
 * - YouTube → https://www.youtube.com/watch?v=ID
 * - Spotify → https://open.spotify.com/{tipo}/{id}
 * - Outros  → URL http(s) válida (arquivo/stream direto)
 */
export function normalizeMediaUrl(
  raw: string,
  opts: { expect?: 'youtube' | 'spotify'; allowDirect?: boolean } = {},
): NormalizeResult {
  const cleaned = cleanRawLink(raw);
  if (!cleaned) return { ok: false, error: 'Cole um link válido.' };

  const ytId = getYouTubeVideoId(cleaned);
  if (ytId) {
    if (opts.expect === 'spotify') return { ok: false, error: 'Este é um link do YouTube, não do Spotify.' };
    const url = `https://www.youtube.com/watch?v=${ytId}`;
    return { ok: true, kind: 'youtube', url, tipo: 'youtube', corrected: url !== raw.trim() };
  }

  const sp = parseSpotify(cleaned);
  if (sp) {
    if (opts.expect === 'youtube') return { ok: false, error: 'Este é um link do Spotify, não do YouTube.' };
    const url = `https://open.spotify.com/${sp.type}/${sp.id}`;
    return { ok: true, kind: 'spotify', url, tipo: 'spotify', corrected: url !== raw.trim() };
  }

  // Parece YouTube/Spotify mas está incompleto/inválido.
  const low = cleaned.toLowerCase();
  if (low.includes('youtu')) return { ok: false, error: 'Link do YouTube inválido ou incompleto.' };
  if (low.includes('spotify')) return { ok: false, error: 'Link do Spotify inválido ou incompleto.' };

  if (opts.expect === 'youtube') return { ok: false, error: 'Cole um link de vídeo do YouTube.' };
  if (opts.expect === 'spotify') return { ok: false, error: 'Cole um link de faixa/álbum/playlist do Spotify.' };

  if (opts.allowDirect === false) return { ok: false, error: 'Link não reconhecido.' };

  try {
    const u = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad');
    const url = u.toString();
    return { ok: true, kind: 'direct', url, tipo: 'external', corrected: url !== raw.trim() };
  } catch {
    return { ok: false, error: 'URL inválida.' };
  }
}
