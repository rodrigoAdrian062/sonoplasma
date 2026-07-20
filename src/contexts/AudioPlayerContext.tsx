import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { PlaybackStatus } from '@/types/ceremony';
import { getPlayableAudioUrl, prefetchAudios, isCacheableAudioUrl } from '@/lib/audioCache';
import { registerAudioElement } from '@/lib/audioOutput';
import { getSpotifyUrl, isSpotifyUrl } from '@/lib/embedUrl';

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
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
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
  const [volume, setVolumeState] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isSpotify, setIsSpotify] = useState(false);
  const [spotifyReloadTick, setSpotifyReloadTick] = useState(0);
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
  const ytPlayerRef = useRef<any>(null);
  const ytInitTimeoutRef = useRef<number | null>(null);
  const ytPlayerReadyRef = useRef(false);
  const pendingPlayRef = useRef<{ stageId: string; videoId: string } | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const isYouTubeRef = useRef(false);
  const isSpotifyRef = useRef(false);
  const volumeRef = useRef(volume);
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
        // restore actual player volume so the next resume/play sounds normal
        applyPlayerVolume(startVol);
      }
    }, totalMs / steps);
  }, [clearFade, applyPlayerVolume]);


  // Initialize HTML5 Audio with EQ filters (once, lives for app lifetime)
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

    source.connect(bass).connect(mid).connect(treble).connect(ctx.destination);

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
    stopCurrentPlayback();

    // Bug corrigido: só reduz o volume inicial quando o fade está ativado.
    // Antes, o volume era forçado a 10% em toda chamada de play(), ignorando
    // o volume escolhido pelo usuário mesmo com o fade desligado.
    if (fadeEnabledRef.current) {
      volumeRef.current = 0.1;
      setVolumeState(0.1);
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
      const spotifyUrl = getSpotifyUrl(url, { embed: true, autoplay: true });
      if (!spotifyUrl) {
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
      setSpotifyReloadTick((tick) => tick + 1);
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
      audio.volume = volumeRef.current;
      // Toca a partir do cache local (blob) quando disponível para
      // início instantâneo; senão usa a URL direta e cacheia em segundo plano.
      getPlayableAudioUrl(url).then((cachedUrl) => {
        // Ignora se o usuário já trocou de áudio nesse meio tempo.
        if (currentUrlRef.current !== url) return;
        audio.src = cachedUrl || url;
        audio.play().catch(err => {
          console.error('Audio play error:', err);
        });
      });
      setCurrentStageId(stageId);
      setStatus('playing');
    }
  }, [stopCurrentPlayback, createYouTubePlayer]);

  const preload = useCallback((urls: (string | null | undefined)[]) => {
    prefetchAudios(urls);
  }, []);

  const pause = useCallback(() => {
    const doPause = () => {
      if (isSpotifyRef.current) {
        setSpotifyReloadTick((tick) => tick + 1);
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
  }, [fadeOutThen]);

  const resume = useCallback(() => {
    clearFade();
    applyPlayerVolume(volumeRef.current);
    if (isSpotifyRef.current) {
      setSpotifyReloadTick((tick) => tick + 1);
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.play();
    }
    setStatus('playing');
  }, [clearFade, applyPlayerVolume]);

  const stop = useCallback(() => {
    const doStop = () => {
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
    if (audioRef.current) audioRef.current.volume = value;
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.setVolume(value * 100);
    }
    setVolumeState(value);
  }, []);

  const seekForward = useCallback((seconds = 10) => {
    if (isSpotifyRef.current) {
      setSpotifyReloadTick((tick) => tick + 1);
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(current + seconds, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds);
    }
  }, [currentTime]);

  const seekBackward = useCallback((seconds = 10) => {
    if (isSpotifyRef.current) {
      setSpotifyReloadTick((tick) => tick + 1);
    } else if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(Math.max(0, current - seconds), true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    }
  }, [currentTime]);

  const seekTo = useCallback((seconds: number) => {
    if (isSpotifyRef.current) {
      setSpotifyReloadTick((tick) => tick + 1);
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
    pause,
    resume,
    stop,
    setVolume,
    seekForward,
    seekBackward,
    seekTo,
    setEQ,
    setOnTrackEnded: (cb) => { onTrackEndedRef.current = cb; },
  };

  const spotifyEmbedUrl = isSpotify && currentUrl
    ? getSpotifyUrl(currentUrl, { embed: true, autoplay: status === 'playing' })
    : null;
  const spotifyEmbedSrc = spotifyEmbedUrl
    ? `${spotifyEmbedUrl}${spotifyEmbedUrl.includes('?') ? '&' : '?'}_r=${spotifyReloadTick}`
    : null;

  return (
    <AudioPlayerContext.Provider value={value}>
      <AudioProgressContext.Provider value={{ currentTime, duration }}>
        {children}
        {spotifyEmbedSrc && status !== 'idle' && (
          <div className="fixed bottom-20 right-3 z-[9999] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-lg border border-gold/50 bg-background shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5 text-xs">
              <span className="truncate font-medium text-gold">Player Spotify</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSpotifyReloadTick((tick) => tick + 1)}
                  className="rounded border border-gold/40 px-2 py-0.5 text-[11px] text-gold hover:bg-gold/10"
                >
                  Recarregar
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>
            </div>
            <iframe
              key={spotifyEmbedSrc}
              src={spotifyEmbedSrc}
              title="Player Spotify"
              className="h-[152px] w-full border-0"
              allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
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
