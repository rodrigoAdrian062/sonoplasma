// Player oculto de YouTube dedicado aos Sons Rápidos.
// Isolado do player das etapas (container e volume próprios).

import { getYouTubeVideoId } from '@/lib/embedUrl';

const CONTAINER_ID = 'qs-yt-player-container';
const PLAYER_ID = 'qs-yt-player';

let player: any = null;
let ready = false;

function loadApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.YT?.Player) return resolve();
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.body.appendChild(tag);
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      if ((window as any).YT?.Player) {
        window.clearInterval(timer);
        resolve();
      } else if (++tries > 150) {
        window.clearInterval(timer);
        reject(new Error('Não foi possível carregar o player do YouTube.'));
      }
    }, 100);
  });
}

function getHost(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(container);
  }
  return container;
}

export async function playQuickYouTube(
  url: string,
  opts: { volume: number; loop?: boolean; onEnded?: () => void; onError?: (msg: string) => void },
): Promise<void> {
  const id = getYouTubeVideoId(url);
  if (!id) throw new Error('Link do YouTube inválido.');
  await loadApi();

  if (player && ready) {
    try {
      player.__onEnded = opts.onEnded;
      player.setLoop?.(!!opts.loop);
      player.loadVideoById(id);
      player.setVolume(Math.round(opts.volume * 100));
      player.unMute?.();
      player.playVideo();
      return;
    } catch {
      destroyQuickYouTube();
    }
  }

  const host = getHost();
  host.innerHTML = '';
  const div = document.createElement('div');
  div.id = PLAYER_ID;
  host.appendChild(div);

  const YT = (window as any).YT;
  ready = false;
  player = new YT.Player(PLAYER_ID, {
    height: '1',
    width: '1',
    videoId: id,
    host: 'https://www.youtube.com',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      origin: window.location.origin,
    },
    events: {
      onReady: (e: any) => {
        ready = true;
        player.__onEnded = opts.onEnded;
        e.target.setVolume(Math.round(opts.volume * 100));
        e.target.unMute?.();
        e.target.playVideo();
      },
      onStateChange: (e: any) => {
        if (e.data === YT.PlayerState.ENDED) {
          if (opts.loop) {
            try { player.seekTo(0); player.playVideo(); } catch { /* noop */ }
          } else {
            player.__onEnded?.();
          }
        }
      },
      onError: () => opts.onError?.('Vídeo indisponível no YouTube.'),
    },
  });
}

export function stopQuickYouTube() {
  try {
    player?.stopVideo?.();
  } catch {
    /* noop */
  }
}

export function setQuickYouTubeVolume(volume: number) {
  try {
    if (ready) player?.setVolume?.(Math.round(volume * 100));
  } catch {
    /* noop */
  }
}

export function destroyQuickYouTube() {
  try {
    player?.destroy?.();
  } catch {
    /* noop */
  }
  player = null;
  ready = false;
  document.getElementById(CONTAINER_ID)?.remove();
}
