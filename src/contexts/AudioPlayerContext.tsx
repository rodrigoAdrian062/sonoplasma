import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { PlaybackStatus } from '@/types/ceremony';
import { getPlayableAudioUrl, prefetchAudios, isCacheableAudioUrl } from '@/lib/audioCache';
import { registerAudioElement } from '@/lib/audioOutput';
import { isSpotifyUrl } from '@/lib/embedUrl';
import {
  destroySpotifyPlayer,
  pauseSpotifyEntity,
  playSpotifyEntity,
  resumeSpotifyEntity,
  seekSpotifyEntity,
  subscribeSpotifyPlayback,
} from '@/lib/spotifyIframePlayer';
import { ensure432Registered, create432Node, applyPitchForUrl, subscribeFrequency432, subscribeTrackHz } from '@/lib/pitch432';
import type { SoundTouchNode } from '@soundtouchjs/audio-worklet';

export interface EQSettings {
  bass: number;    // -12 to 12 dB
  mid: number;     // -12 to 12 dB
  treble: number;  // -12 to 12 dB
}

interface AudioPlayerContextValue {
  currentStageId: string | null;
  currentUrl: string | null;

  status: PlaybackStatus;
  volume: number;
  isYouTube: boolean;
  isSpotify: boolean;
  youtubeVideoId: string | null;
  eq: EQSettings;
  fadeEnabled: boolean;
  setFadeEnabled: (value: boolean) => void;
  loopEnabled: boolean;
  setLoopEnabled: (value: boolean) => void;
  play: (stageId: string, url: string) => void;
  preload: (urls: (string | null | undefined)[]) => void;
  prefetchNextStages: (currentStageId: string, sectionStages: any[], audiosByStageId: Record<string, any[]>) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
  startVolume: number;
  setStartVolume: (value: number) => void;
  rampEnabled: boolean;
  setRampEnabled: (value: boolean) => void;
  rampSeconds: number;
  setRampSeconds: (value: number) => void;
  rampTarget: number;
  setRampTarget: (value: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekTo: (seconds: number) => void;
  setEQ: (settings: Partial<EQSettings>) => void;
  setOnTrackEnded: (cb: ((stageId: string, url: string) => boolean) | null) => void;
}

// Contexto separado apenas para currentTime/duration.
// Isola o re-render de "tick" (4x/seg) dos componentes que só consomem
// controles estáveis (play/pause/status/track).
interface AudioProgressContextValue {
  currentTime: number;
  duration: number;
}
const AudioProgressContext = createContext<AudioProgressContextValue>({
  currentTime: 0,
  duration: 0,
});
export function useAudioProgress(): AudioProgressContextValue {
  return useContext(AudioProgressContext);
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(0);
  const [startVolume, setStartVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.02;
    const raw = window.localStorage.getItem('sonoplastia:startVolume');
    const parsed = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? Math.min(0.5, Math.max(0, parsed)) : 0.02;
  });
  const [rampEnabled, setRampEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('sonoplastia:rampEnabled') === '1';
  });
  const [rampSeconds, setRampSecondsState] = useState<number>(() => {
    if (typeof window === 'undefined') return 8;
    const parsed = Number(window.localStorage.getItem('sonoplastia:rampSeconds'));
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(60, parsed) : 8;
  });
  const [rampTarget, setRampTargetState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.7;
    const parsed = Number(window.localStorage.getItem('sonoplastia:rampTarget'));
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(1, parsed) : 0.7;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isSpotify, setIsSpotify] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  const [eq, setEQState] = useState<EQSettings>({ bass: 0, mid: 0, treble: 0 });
  const [fadeEnabled, setFadeEnabledState] = useState(true);
  const [loopEnabled, setLoopEnabledState] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const pitch432NodeRef = useRef<SoundTouchNode | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytInitTimeoutRef = useRef<number | null>(null);
  const ytPlayerReadyRef = useRef(false);
  const pendingPlayRef = useRef<{ stageId: string; videoId: string } | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const isYouTubeRef = useRef(false);
  const isSpotifyRef = useRef(false);
  const volumeRef = useRef(volume);
  const startVolumeRef = useRef(startVolume);
  const rampEnabledRef = useRef(rampEnabled);
  const rampSecondsRef = useRef(rampSeconds);
  const rampTargetRef = useRef(rampTarget);
  const rampIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeEnabledRef = useRef(fadeEnabled);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTrackEndedRef = useRef<((stageId: string, url: string) => boolean) | null>(null);
  const loopEnabledRef = useRef(loopEnabled);
  const currentStageIdRef = useRef<string | null>(null);


  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    currentStageIdRef.current = currentStageId;
  }, [currentStageId]);

  useEffect(() => {
    fadeEnabledRef.current = fadeEnabled;
  }, [fadeEnabled]);

  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

  const setFadeEnabled = useCallback((value: boolean) => {
    setFadeEnabledState(value);
  }, []);

  const setLoopEnabled = useCallback((value: boolean) => {
    setLoopEnabledState(value);
  }, []);

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const clearRamp = useCallback(() => {
    if (rampIntervalRef.current) {
      clearInterval(rampIntervalRef.current);
      rampIntervalRef.current = null;
    }
  }, []);

  useEffect(() => { rampEnabledRef.current = rampEnabled; }, [rampEnabled]);
  useEffect(() => { rampSecondsRef.current = rampSeconds; }, [rampSeconds]);
  useEffect(() => { rampTargetRef.current = rampTarget; }, [rampTarget]);

  const setRampEnabled = useCallback((value: boolean) => {
    setRampEnabledState(value);
    rampEnabledRef.current = value;
    try { window.localStorage.setItem('sonoplastia:rampEnabled', value ? '1' : '0'); } catch { /* noop */ }
  }, []);

  const setRampSeconds = useCallback((value: number) => {
    const clamped = Math.min(60, Math.max(1, Math.round(value)));
    setRampSecondsState(clamped);
    rampSecondsRef.current = clamped;
    try { window.localStorage.setItem('sonoplastia:rampSeconds', String(clamped)); } catch { /* noop */ }
  }, []);

  const setRampTarget = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setRampTargetState(clamped);
    rampTargetRef.current = clamped;
    try { window.localStorage.setItem('sonoplastia:rampTarget', String(clamped)); } catch { /* noop */ }
  }, []);

  // Apply a volume level to whichever player is active (no state change)
  const applyPlayerVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      try { ytPlayerRef.current.setVolume(v * 100); } catch { /* noop */ }
    }
  }, []);

  // Gradually reduce volume, then run onDone. Restores player volume afterwards.
  const fadeOutThen = useCallback((onDone: () => void) => {
    clearFade();
    const startVol = volumeRef.current;
    if (startVol <= 0) { onDone(); return; }
    const steps = 24;
    const totalMs = 1400;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      const v = Math.max(0, startVol * (1 - step / steps));
      applyPlayerVolume(v);
      if (step >= steps) {
        clearFade();
        onDone();
        // apply global volume to player again, because fadeOut may have left it at 0
        const v = volumeRef.current;
        if (audioRef.current) audioRef.current.volume = v;
        if (ytPlayerRef.current && ytPlayerReadyRef.current) {
          try { ytPlayerRef.current.setVolume(v * 100); } catch { /* noop */ }
        }
      }
    }, totalMs / steps);
  }, [clearFade, applyPlayerVolume]);


  // Initialize HTML5 Audio with EQ filters + 432Hz pitch node (once, lives for app lifetime)
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volumeRef.current;
    audio.crossOrigin = 'anonymous';
    // Pré-carrega o máximo possível assim que a src é definida.
    audio.preload = 'auto';
    audioRef.current = audio;
    registerAudioElement(audio);

    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);
    sourceNodeRef.current = source;

    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 200;
    bass.gain.value = 0;
    bassFilterRef.current = bass;

    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1;
    mid.gain.value = 0;
    midFilterRef.current = mid;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 4000;
    treble.gain.value = 0;
    trebleFilterRef.current = treble;

    let disposed = false;
    let cleanupPitchSub: (() => void) | null = null;

    // Conexão inicial (sem pitch): source -> bass -> mid -> treble -> destination.
    // O nó de 432Hz é inserido depois, quando o worklet estiver carregado.
    source.connect(bass).connect(mid).connect(treble).connect(ctx.destination);

    // Carrega o worklet de pitch-shift em segundo plano e o insere no grafo.
    ensure432Registered(ctx)
      .then(() => {
        if (disposed) return;
        try {
          const pitchNode = create432Node(ctx);
          pitch432NodeRef.current = pitchNode;
          // Reconecta: source -> pitchNode -> bass (bass já está ligado ao restante)
          try { source.disconnect(); } catch { /* noop */ }
          source.connect(pitchNode).connect(bass);
          applyPitchForUrl(pitchNode, currentUrlRef.current);
          const reapply = () => applyPitchForUrl(pitch432NodeRef.current, currentUrlRef.current);
          const unsubGlobal = subscribeFrequency432(reapply);
          const unsubTrack = subscribeTrackHz(reapply);
          cleanupPitchSub = () => { unsubGlobal(); unsubTrack(); };
        } catch (err) {
          console.warn('[432Hz] falha ao inserir nó de pitch, seguindo sem ele:', err);
        }
      })
      .catch((err) => {
        console.warn('[432Hz] worklet indisponível, seguindo sem pitch-shift:', err);
      });

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (loopEnabledRef.current && audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const endedStage = currentStageIdRef.current;
      const endedUrl = currentUrlRef.current;
      if (onTrackEndedRef.current && endedStage && endedUrl) {
        const handled = onTrackEndedRef.current(endedStage, endedUrl);
        if (handled) return;
      }
      setStatus('idle');
      setCurrentStageId(null);
      setCurrentTime(0);
      setIsYouTube(false);
      setYoutubeVideoId(null);
      currentUrlRef.current = null;
      setCurrentUrl(null);
    };
    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setStatus('idle');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      disposed = true;
      cleanupPitchSub?.();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      ctx.close();
    };
  }, []);

  // Destrava o AudioContext no primeiro gesto do usuário (toque/clique),
  // evitando atraso/travamento ao iniciar a primeira música no tablet.
  useEffect(() => {
    const unlock = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* noop */ });
      }
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('touchstart', unlock, opts);
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);



  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API ready');
    };
  }, []);

  const [disposed, setDisposed] = useState(false);
  useEffect(() => {
    return () => setDisposed(true);
  }, []);

  // Poll YouTube player for time updates — pausa quando a aba está oculta
  // para economizar CPU/bateria (tablets, apresentação em segundo plano).
  useEffect(() => {
    if (!isYouTube || status === 'idle') return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (ytPlayerRef.current && ytPlayerReadyRef.current) {
        try {
          const current = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (typeof current === 'number') setCurrentTime(current);
          if (typeof dur === 'number' && dur > 0) setDuration(dur);
        } catch {
          // Player may not be ready yet
        }
      }
    };
    const start = () => {
      if (interval == null) interval = setInterval(tick, 500);
    };
    const stop = () => {
      if (interval != null) { clearInterval(interval); interval = null; }
    };
    const onVisibility = () => {
      if (document.hidden) stop(); else start();
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [isYouTube, status]);

  useEffect(() => {
    return subscribeSpotifyPlayback((data) => {
      if (!isSpotifyRef.current) return;
      if (typeof data.position === 'number') setCurrentTime(data.position / 1000);
      if (typeof data.duration === 'number' && data.duration > 0) setDuration(data.duration / 1000);
      if (typeof data.isPaused === 'boolean') setStatus(data.isPaused ? 'paused' : 'playing');
    });
  }, []);

  const stopCurrentPlayback = useCallback(() => {
    if (ytInitTimeoutRef.current !== null) {
      clearTimeout(ytInitTimeoutRef.current);
      ytInitTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
        ytPlayerRef.current.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
      ytPlayerRef.current = null;
      ytPlayerReadyRef.current = false;
    }
    destroySpotifyPlayer();
    const existingContainer = document.getElementById('yt-player-container');
    if (existingContainer) existingContainer.remove();
  }, []);

  const createYouTubePlayer = useCallback((videoId: string, stageId: string) => {
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
      document.body.appendChild(container);
    }
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player';
    container.innerHTML = '';
    container.appendChild(playerDiv);

    const initPlayer = () => {
      if (disposed) return;
      if (!(window as any).YT || !(window as any).YT.Player) {
        ytInitTimeoutRef.current = window.setTimeout(initPlayer, 100);
        return;
      }
      ytInitTimeoutRef.current = null;
      ytPlayerRef.current = new (window as any).YT.Player('yt-player', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            ytPlayerReadyRef.current = true;
            event.target.setVolume(volumeRef.current * 100);
            event.target.playVideo();
            pendingPlayRef.current = null;
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (event.data === YT.PlayerState.ENDED) {
              if (loopEnabledRef.current && ytPlayerRef.current) {
                try { ytPlayerRef.current.seekTo(0); ytPlayerRef.current.playVideo(); } catch {}
                return;
              }
              const endedStage = currentStageIdRef.current;
              const endedUrl = currentUrlRef.current;
              if (onTrackEndedRef.current && endedStage && endedUrl && onTrackEndedRef.current(endedStage, endedUrl)) {
                return;
              }
              setStatus('idle');
              setCurrentStageId(null);
              setIsYouTube(false);
              setYoutubeVideoId(null);
              currentUrlRef.current = null;
      setCurrentUrl(null);
            } else if (event.data === YT.PlayerState.PLAYING) {
              setStatus('playing');
            } else if (event.data === YT.PlayerState.PAUSED) {
              setStatus('paused');
            }
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
            setStatus('idle');
            setCurrentStageId(null);
            setIsYouTube(false);
            setYoutubeVideoId(null);
            currentUrlRef.current = null;
      setCurrentUrl(null);
          },
        },
      });
    };
    initPlayer();
  }, []);

  const play = useCallback((stageId: string, url: string) => {
    clearFade();
    clearRamp();
    stopCurrentPlayback();

    // Todo play() começa no volume inicial configurado (padrão 2%).
    const initialVol = startVolumeRef.current;
    volumeRef.current = initialVol;
    setVolumeState(initialVol);
    applyPlayerVolume(initialVol);

    // Rampa suave: sobe do volume inicial até o volume alvo em N segundos.
    if (rampEnabledRef.current && rampTargetRef.current > initialVol) {
      const from = initialVol;
      const to = rampTargetRef.current;
      const totalMs = Math.max(1, rampSecondsRef.current) * 1000;
      const tickMs = 100;
      const steps = Math.max(1, Math.round(totalMs / tickMs));
      let step = 0;
      rampIntervalRef.current = setInterval(() => {
        step++;
        const v = Math.min(to, from + (to - from) * (step / steps));
        volumeRef.current = v;
        setVolumeState(v);
        if (audioRef.current) audioRef.current.volume = v;
        if (ytPlayerRef.current && ytPlayerReadyRef.current) {
          try { ytPlayerRef.current.setVolume(v * 100); } catch { /* noop */ }
        }
        if (step >= steps) clearRamp();
      }, tickMs);
    }





    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => {
        console.warn('AudioContext resume failed:', err);
      });
    }

    const isYT = isYouTubeUrl(url);
    const isSpot = isSpotifyUrl(url);
    isYouTubeRef.current = isYT;
    isSpotifyRef.current = isSpot;
    setIsYouTube(isYT);
    setIsSpotify(isSpot);

    if (isSpot) {
      if (!isSpotifyUrl(url)) {
        console.error('Invalid Spotify URL:', url);
        return;
      }
      setYoutubeVideoId(null);
      currentUrlRef.current = url;
      setCurrentUrl(url);
      setCurrentStageId(stageId);
      setStatus('playing');
      setCurrentTime(0);
      setDuration(0);
      playSpotifyEntity(url).catch((err) => {
        console.error('[Spotify] falha ao reproduzir:', err, { url });
        setStatus('idle');
        setCurrentStageId(null);
        setIsSpotify(false);
        isSpotifyRef.current = false;
        currentUrlRef.current = null;
        setCurrentUrl(null);
        try {
          import('sonner').then(({ toast }) => toast.error('Não foi possível iniciar o Spotify.'));
        } catch { /* noop */ }
      });
    } else if (isYT) {
      const videoId = getYouTubeVideoId(url);
      if (!videoId) {
        console.error('Invalid YouTube URL:', url);
        return;
      }
      setYoutubeVideoId(videoId);
      currentUrlRef.current = url;
      setCurrentUrl(url);
      setCurrentStageId(stageId);
      setStatus('playing');
      pendingPlayRef.current = { stageId, videoId };
      createYouTubePlayer(videoId, stageId);
    } else {
      setYoutubeVideoId(null);
      const audio = audioRef.current;
      if (!audio) return;
      currentUrlRef.current = url;
      setCurrentUrl(url);
      applyPitchForUrl(pitch432NodeRef.current, url);
      audio.volume = volumeRef.current;
      // Toca a partir do cache local (blob) quando disponível para
      // início instantâneo; senão usa a URL direta e cacheia em segundo plano.
      getPlayableAudioUrl(url).then((cachedUrl) => {
        // Ignora se o usuário já trocou de áudio nesse meio tempo.
        if (currentUrlRef.current !== url) return;
        audio.src = cachedUrl || url;
        const attemptPlay = (retry = 0) => {
          audio.play().catch((err) => {
            // Autoplay bloqueado ou erro de rede: 1 retry rápido e depois notifica.
            if (retry === 0 && err?.name !== 'NotAllowedError') {
              setTimeout(() => attemptPlay(1), 500);
              return;
            }
            // eslint-disable-next-line no-console
            console.error('[AudioPlayer] falha ao reproduzir:', err, { url });
            try {
              import('sonner').then(({ toast }) => {
                if (err?.name === 'NotAllowedError') {
                  toast.error('Toque na tela para liberar o áudio (autoplay bloqueado).');
                } else {
                  toast.error('Não foi possível iniciar o áudio.');
                }
              });
            } catch { /* noop */ }
          });
        };
        attemptPlay();
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[AudioPlayer] falha ao carregar do cache:', err, { url });
      });
      setCurrentStageId(stageId);
      setStatus('playing');
    }
  }, [stopCurrentPlayback, createYouTubePlayer]);

  const preload = useCallback((urls: (string | null | undefined)[]) => {
    prefetchAudios(urls);
  }, []);

  const pause = useCallback(() => {
    clearRamp();
    const doPause = () => {
      if (isSpotifyRef.current) {
        pauseSpotifyEntity().catch(() => { /* noop */ });
      } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
        ytPlayerRef.current.pauseVideo();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setStatus('paused');
    };
    // Spotify iframe controller does not expose reliable volume control
    if (fadeEnabledRef.current && !isSpotifyRef.current) {
      fadeOutThen(doPause);
    } else {
      doPause();
    }
  }, [fadeOutThen, clearRamp]);

  const resume = useCallback(() => {
    clearFade();
    applyPlayerVolume(volumeRef.current);
    if (isSpotifyRef.current) {
      resumeSpotifyEntity(currentUrlRef.current).catch(() => { /* noop */ });
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.play();
    }
    setStatus('playing');
  }, [clearFade, applyPlayerVolume]);

  const stop = useCallback(() => {
    const doStop = () => {
      clearRamp();
      stopCurrentPlayback();
      setStatus('idle');
      setCurrentStageId(null);
      setCurrentTime(0);
      setIsYouTube(false);
      setIsSpotify(false);
      isYouTubeRef.current = false;
      isSpotifyRef.current = false;
      setYoutubeVideoId(null);
      currentUrlRef.current = null;
      setCurrentUrl(null);
    };
    if (fadeEnabledRef.current && !isSpotifyRef.current && status === 'playing') {
      fadeOutThen(doStop);
    } else {
      doStop();
    }
  }, [stopCurrentPlayback, status, fadeOutThen]);

  const setVolume = useCallback((value: number) => {
    // Ajuste manual cancela a rampa em andamento.
    clearRamp();
    if (audioRef.current) audioRef.current.volume = value;
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.setVolume(value * 100);
    }
    volumeRef.current = value;
    setVolumeState(value);
  }, [clearRamp]);

  const setStartVolume = useCallback((value: number) => {
    const clamped = Math.min(0.5, Math.max(0, value));
    startVolumeRef.current = clamped;
    setStartVolumeState(clamped);
    try {
      window.localStorage.setItem('sonoplastia:startVolume', String(clamped));
    } catch { /* noop */ }
  }, []);



  const seekForward = useCallback((seconds = 10) => {
    if (isSpotifyRef.current) {
      seekSpotifyEntity(currentTime + seconds).catch(() => { /* noop */ });
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(current + seconds, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds);
    }
  }, [currentTime]);

  const seekBackward = useCallback((seconds = 10) => {
    if (isSpotifyRef.current) {
      seekSpotifyEntity(Math.max(0, currentTime - seconds)).catch(() => { /* noop */ });
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(Math.max(0, current - seconds), true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    }
  }, [currentTime]);

  const seekTo = useCallback((seconds: number) => {
    if (isSpotifyRef.current) {
      seekSpotifyEntity(seconds).catch(() => { /* noop */ });
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, seconds));
    }
  }, []);

  const setEQ = useCallback((settings: Partial<EQSettings>) => {
    setEQState(prev => {
      const next = { ...prev, ...settings };
      if (bassFilterRef.current) bassFilterRef.current.gain.value = next.bass;
      if (midFilterRef.current) midFilterRef.current.gain.value = next.mid;
      if (trebleFilterRef.current) trebleFilterRef.current.gain.value = next.treble;
      return next;
    });
  }, []);

  const value: AudioPlayerContextValue = {
    currentStageId,
    currentUrl,

    status,
    volume,
    isYouTube,
    isSpotify,
    youtubeVideoId,
    eq,
    fadeEnabled,
    setFadeEnabled,
    loopEnabled,
    setLoopEnabled,
    play,
        preload,
        prefetchNextStages,
    pause,
    resume,
    stop,
    setVolume,
    startVolume,
    setStartVolume,
    rampEnabled,
    setRampEnabled,
    rampSeconds,
    setRampSeconds,
    rampTarget,
    setRampTarget,
    seekForward,
    seekBackward,
    seekTo,
    setEQ,
    setOnTrackEnded: (cb) => { onTrackEndedRef.current = cb; },
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      <AudioProgressContext.Provider value={{ currentTime, duration }}>
        {children}
      </AudioProgressContext.Provider>
    </AudioPlayerContext.Provider>
  );
}

export function useUniversalAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useUniversalAudioPlayer must be used within an AudioPlayerProvider');
  }
  return ctx;
}
