interface YouTubePlayer {
  cuePlaylist(playlist: { listType: 'playlist'; list: string }): void;
  getPlaylist(): string[];
  destroy(): void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
}

function getYouTubeApi(): YouTubeApi | undefined {
  return (window as Window & { YT?: YouTubeApi }).YT;
}

async function loadYouTubeApi(): Promise<YouTubeApi> {
  const currentApi = getYouTubeApi();
  if (currentApi?.Player) return currentApi;

  if (!document.getElementById('youtube-iframe-api')) {
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      reject(new Error('O player do YouTube demorou demais para carregar.'));
    }, 20_000);
    const interval = window.setInterval(() => {
      const api = getYouTubeApi();
      if (api?.Player) {
        window.clearTimeout(timeout);
        window.clearInterval(interval);
        resolve(api);
      }
    }, 100);
  });
}

export async function getYouTubePlaylistVideoIds(playlistId: string): Promise<string[]> {
  const api = await loadYouTubeApi();
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:320px;height:180px;pointer-events:none;';
  document.body.appendChild(container);

  let player: YouTubePlayer | null = null;
  try {
    return await new Promise<string[]>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearInterval(poll);
        window.clearTimeout(timeout);
        callback();
      };
      const poll = window.setInterval(() => {
        const ids = player?.getPlaylist() ?? [];
        if (ids.length > 0) finish(() => resolve(ids));
      }, 250);
      const timeout = window.setTimeout(() => {
        finish(() => reject(new Error('Não foi possível carregar as faixas desta playlist. Verifique se ela é pública.')));
      }, 20_000);

      player = new api.Player(container, {
        width: '320',
        height: '180',
        playerVars: { controls: 0, listType: 'playlist', list: playlistId, origin: window.location.origin },
        events: {
          onReady: (event) => {
            event.target.cuePlaylist({ listType: 'playlist', list: playlistId });
          },
          onError: (event) => {
            finish(() => reject(new Error(`O YouTube não conseguiu carregar a playlist (erro ${event.data}).`)));
          },
        },
      });
    });
  } finally {
    player?.destroy();
    container.remove();
  }
}
