import { getSpotifyUri } from '@/lib/embedUrl';

type SpotifyPlaybackData = {
  playingURI?: string;
  isPaused?: boolean;
  isBuffering?: boolean;
  duration?: number;
  position?: number;
};

type SpotifyEmbedController = {
  loadEntity?: (spotifyUriOrUrl: string, preferVideo?: boolean, startAt?: number) => void;
  loadUri?: (spotifyUri: string, preferVideo?: boolean, startAt?: number, theme?: string) => void;
  play?: () => void;
  playFromStart?: () => void;
  pause?: () => void;
  resume?: () => void;
  restart?: () => void;
  seek?: (seconds: number) => void;
  destroy?: () => void;
  addListener?: (event: 'ready' | 'playback_started' | 'playback_update', cb: (event: { data: SpotifyPlaybackData }) => void) => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri?: string; url?: string; width?: number; height?: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

type SpotifyIframeConfig = {
  host?: string;
  referrer?: string;
  locale?: string;
  loading?: number;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    __sonoplastiaSpotifyIframeApi?: SpotifyIframeApi;
    SpotifyIframeConfig?: SpotifyIframeConfig;
  }
}

const SCRIPT_ID = 'spotify-iframe-api';
const HOST_ID = 'sonoplastia-spotify-system-host';

let apiPromise: Promise<SpotifyIframeApi> | null = null;
let controllerPromise: Promise<SpotifyEmbedController> | null = null;
let controller: SpotifyEmbedController | null = null;
let loadedUri: string | null = null;

const SPOTIFY_LOCALE = 'pt-BR';

const playbackListeners = new Set<(data: SpotifyPlaybackData) => void>();

export function subscribeSpotifyPlayback(listener: (data: SpotifyPlaybackData) => void): () => void {
  playbackListeners.add(listener);
  return () => playbackListeners.delete(listener);
}

function emitPlayback(data: SpotifyPlaybackData) {
  playbackListeners.forEach((listener) => listener(data));
}

function configureSpotifyIframe() {
  if (typeof window === 'undefined') return;
  // Não forçamos "locale": o embed do Spotify rejeita alguns formatos
  // ("Incorrect locale information provided") e para de tocar.
  window.SpotifyIframeConfig = {
    ...(window.SpotifyIframeConfig || {}),
    referrer: window.location.origin,
  };
}

function commandPlay(activeController: SpotifyEmbedController, fromStart = false) {
  if (fromStart && activeController.playFromStart) {
    activeController.playFromStart();
    return;
  }
  if (activeController.play) activeController.play();
  else activeController.resume?.();
}

export function warmUpSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Spotify indisponível fora do navegador'));
  }

  configureSpotifyIframe();

  if (window.__sonoplastiaSpotifyIframeApi) {
    return Promise.resolve(window.__sonoplastiaSpotifyIframeApi);
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onSpotifyIframeApiReady;
    const timeout = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error('Tempo esgotado ao carregar player do Spotify'));
    }, 12_000);

    window.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
      window.clearTimeout(timeout);
      window.__sonoplastiaSpotifyIframeApi = api;
      previousReady?.(api);
      resolve(api);
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        apiPromise = null;
        reject(new Error('Falha ao carregar player do Spotify'));
      };
      document.body.appendChild(script);
    }
  });

  return apiPromise;
}

function getOrCreateHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
      'position:fixed',
      'left:0',
      'bottom:0',
      'width:320px',
      'height:152px',
      'opacity:0.001',
      'pointer-events:none',
      'overflow:hidden',
      'z-index:1',
    ].join(';');
    document.body.appendChild(host);
  }
  return host;
}

async function getController(initialUri: string): Promise<SpotifyEmbedController> {
  if (controller) return controller;
  if (controllerPromise) return controllerPromise;

  controllerPromise = warmUpSpotifyIframeApi().then((api) => new Promise<SpotifyEmbedController>((resolve) => {
    const host = getOrCreateHost();
    host.innerHTML = '';
    api.createController(
      host,
      { uri: initialUri, width: 320, height: 152 },
      (createdController) => {
        controller = createdController;
        loadedUri = initialUri;
        createdController.addListener?.('playback_started', (event) => emitPlayback({ ...event.data, isPaused: false }));
        createdController.addListener?.('playback_update', (event) => emitPlayback(event.data));
        resolve(createdController);
      },
    );
  }));

  return controllerPromise;
}

async function loadSpotifyEntity(url: string): Promise<SpotifyEmbedController> {
  const uri = getSpotifyUri(url);
  if (!uri) throw new Error('Link do Spotify inválido');

  const activeController = await getController(uri);
  if (loadedUri !== uri) {
    if (activeController.loadUri) activeController.loadUri(uri, false, 0, 'dark');
    else activeController.loadEntity?.(uri, false, 0);
    loadedUri = uri;
  }
  return activeController;
}

export async function playSpotifyEntity(url: string): Promise<void> {
  const uri = getSpotifyUri(url);
  const activeController = await loadSpotifyEntity(url);
  commandPlay(activeController, true);
  window.setTimeout(() => commandPlay(activeController), 200);
  window.setTimeout(() => commandPlay(activeController), 900);
  emitPlayback({ isPaused: false, position: 0, playingURI: uri || undefined });
}

export async function pauseSpotifyEntity(): Promise<void> {
  const activeController = controller || (controllerPromise ? await controllerPromise.catch(() => null) : null);
  activeController?.pause?.();
  emitPlayback({ isPaused: true });
}

export async function resumeSpotifyEntity(url?: string | null): Promise<void> {
  const activeController = url ? await loadSpotifyEntity(url) : controller;
  if (!activeController) return;
  if (activeController.resume) activeController.resume();
  else commandPlay(activeController);
  window.setTimeout(() => commandPlay(activeController), 200);
  emitPlayback({ isPaused: false });
}

export async function seekSpotifyEntity(seconds: number): Promise<void> {
  controller?.seek?.(Math.max(0, Math.floor(seconds)));
}

export function destroySpotifyPlayer(): void {
  try {
    controller?.pause?.();
    controller?.destroy?.();
  } catch {
    // noop
  }
  controller = null;
  controllerPromise = null;
  loadedUri = null;
  const host = typeof document !== 'undefined' ? document.getElementById(HOST_ID) : null;
  host?.remove();
}