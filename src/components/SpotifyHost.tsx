import { useEffect, useRef, useState } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';

import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { getSpotifyUrl, parseSpotify } from '@/lib/embedUrl';
import { useIsPresentationActive } from '@/lib/presentationState';

/**
 * Host global do player do Spotify.
 * Como o iframe oficial não pode ser controlado por JS (sem SDK premium),
 * mostramos o widget nativo do Spotify — o usuário aperta play/pause no próprio iframe.
 * Aparece somente quando o AudioPlayer atual é uma URL do Spotify.
 */
export function SpotifyHost() {
  const { currentUrl, isSpotify, stop } = useUniversalAudioPlayer();
  const isPresentation = useIsPresentationActive();
  const [minimized, setMinimized] = useState(false);
  const embedUrl = isSpotify && currentUrl ? getSpotifyUrl(currentUrl, { embed: true }) : null;
  const parsed = currentUrl ? parseSpotify(currentUrl) : null;
  const iframeKey = useRef(0);

  useEffect(() => {
    // força reload do iframe ao trocar de faixa
    iframeKey.current++;
  }, [embedUrl]);

  if (!embedUrl) return null;

  // Playlists/álbuns pedem mais altura para mostrar a lista.
  const tall = parsed?.type === 'playlist' || parsed?.type === 'album' || parsed?.type === 'show';
  const height = minimized ? 80 : tall ? 380 : 152;

  return (
    <div
      role="region"
      aria-label="Player do Spotify"
      className="fixed z-[2147483646] animate-fade-in"
      style={{
        left: 16,
        bottom: isPresentation ? 16 : 80,
        width: 'min(420px, calc(100vw - 32px))',
      }}
    >
      <div className="rounded-2xl border-2 border-[#1DB954]/50 bg-black/90 shadow-xl shadow-[#1DB954]/20 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#1DB954]/10 border-b border-[#1DB954]/30">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#1DB954] font-medium">
            <SpotifyIcon size={14} className="text-[#1DB954]" />
            Spotify
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized((v) => !v)}
              className="text-white/70 hover:text-white p-1 rounded"
              aria-label={minimized ? 'Expandir' : 'Minimizar'}
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              onClick={() => stop()}
              className="text-white/70 hover:text-red-400 p-1 rounded"
              aria-label="Fechar player do Spotify"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <iframe
          key={iframeKey.current}
          src={embedUrl}
          width="100%"
          height={height}
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
          style={{ display: 'block', border: 0 }}
        />
      </div>
    </div>
  );
}
