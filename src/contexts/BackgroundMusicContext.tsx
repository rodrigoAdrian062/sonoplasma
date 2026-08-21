import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from '@/hooks/use-toast';
import { registerAudioElement } from '@/lib/audioOutput';
import { toEmbedUrl, detectStream } from '@/lib/embedUrl';
import { ensure432Registered, create432Node, applyPitchForUrl, subscribeFrequency432, subscribeTrackHz } from '@/lib/pitch432';
import type { SoundTouchNode } from '@soundtouchjs/audio-worklet';

export interface BackgroundTrack {
  id: string;
  nome: string;
  audio_url: string;
  disabled?: boolean;
}

export type AutoDuckMode = 'pause' | 'duck';

interface BackgroundMusicContextValue {
  playlist: BackgroundTrack[];
  currentIndex: number;
  currentTrack: BackgroundTrack | null;
  isPlaying: boolean;
  volume: number;
  autoPauseEnabled: boolean;
  wasAutoPaused: boolean;
  autoMode: AutoDuckMode;
  duckVolume: number;
  fadeMs: number;
  isDucking: boolean;
  crossfadeMs: number;
  setCrossfadeMs: (v: number) => void;
  addTrack: (t: BackgroundTrack) => void;
  removeTrack: (id: string) => void;
  toggleTrackEnabled: (id: string) => void;
  clearPlaylist: () => void;
  play: (index?: number) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setAutoPauseEnabled: (v: boolean) => void;
  setAutoMode: (m: AutoDuckMode) => void;
  setDuckVolume: (v: number) => void;
  setFadeMs: (v: number) => void;
  maxDurationSec: number;
  setMaxDurationSec: (v: number) => void;
  resumeDelayMs: number;
  setResumeDelayMs: (v: number) => void;
  currentTime: number;
  duration: number;
  seek: (sec: number) => void;
}

const STORAGE_KEY = 'bg-music-playlist-v1';
const VOLUME_KEY = 'bg-music-volume-v1';
const AUTO_KEY = 'bg-music-auto-pause-v1';
const MODE_KEY = 'bg-music-auto-mode-v1';
const DUCK_KEY = 'bg-music-duck-volume-v1';
const FADE_KEY = 'bg-music-fade-ms-v1';
const MAX_DUR_KEY = 'bg-music-max-duration-sec-v1';
const RESUME_DELAY_KEY = 'bg-music-resume-delay-ms-v1';
const CROSSFADE_KEY = 'bg-music-crossfade-ms-v1';

const Ctx = createContext<BackgroundMusicContextValue | null>(null);

function isStreamingUrl(url: string): boolean {
  const u = (url || '').toLowerCase();
  return u.includes('youtube.com') || u.includes('youtu.be');
}

function findNextEnabled(pl: BackgroundTrack[], from: number, dir: 1 | -1 = 1): number {
  if (pl.length === 0) return -1;
  for (let i = 1; i <= pl.length; i++) {
    const idx = ((from + i * dir) % pl.length + pl.length) % pl.length;
    if (!pl[idx].disabled) return idx;
  }
  return -1;
}

export function BackgroundMusicProvider({ 
  children,
  storageKey = STORAGE_KEY,
  initialPlaylist,
  onPlaylistChange
}: { 
  children: ReactNode;
  storageKey?: string;
  initialPlaylist?: BackgroundTrack[];
  onPlaylistChange?: (pl: BackgroundTrack[]) => void;
}) {
  const safeRead = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const [playlist, setPlaylist] = useState<BackgroundTrack[]>(() => {
    if (initialPlaylist) return initialPlaylist;
    try {
      const saved = JSON.parse(safeRead(storageKey) || '[]') as BackgroundTrack[];
      return Array.isArray(saved) ? saved.filter((track) => !!track?.audio_url) : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseFloat(safeRead(VOLUME_KEY) || '0.25');
    return isNaN(v) ? 0.25 : v;
  });
  const [autoPauseEnabled, setAutoPauseEnabledState] = useState<boolean>(() => {
    return safeRead(AUTO_KEY) !== 'false';
  });
  const [autoMode, setAutoModeState] = useState<AutoDuckMode>(() => {
    const m = safeRead(MODE_KEY);
    return m === 'duck' ? 'duck' : 'pause';
  });
  const [duckVolume, setDuckVolumeState] = useState<number>(() => {
    const v = parseFloat(safeRead(DUCK_KEY) || '0.08');
    return isNaN(v) ? 0.08 : v;
  });
  const [fadeMs, setFadeMsState] = useState<number>(0);
  const [maxDurationSec, setMaxDurationSecState] = useState<number>(() => {
    const v = parseInt(safeRead(MAX_DUR_KEY) || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [resumeDelayMs, setResumeDelayMsState] = useState<number>(() => {
    const v = parseInt(safeRead(RESUME_DELAY_KEY) || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [crossfadeMs, setCrossfadeMsState] = useState<number>(() => {
    const v = parseInt(safeRead(CROSSFADE_KEY) || '3000', 10);
    return isNaN(v) ? 3000 : v;
  });
  const [wasAutoPaused, setWasAutoPaused] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamFrame, setStreamFrame] = useState<{
    trackId: string;
    kind: 'youtube';
    src: string;
  } | null>(null);

  // Dois elementos de áudio para crossfade. audioRef aponta para o "ativo".
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamIframeRef = useRef<HTMLIFrameElement | null>(null);
  const streamFrameRef = useRef<typeof streamFrame>(null);
  const wasAutoPausedRef = useRef(false);
  const isDuckingRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);
  const crossfadeRafRef = useRef<number | null>(null);
  const crossfadingRef = useRef(false);
  const playlistRef = useRef<BackgroundTrack[]>(playlist);
  const currentIndexRef = useRef(currentIndex);
  const playRequestRef = useRef(0);
  const wantsToPlayRef = useRef(false);
  const crossfadeMsRef = useRef(crossfadeMs);
  const volumeRef = useRef(volume);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { streamFrameRef.current = streamFrame; }, [streamFrame]);
  useEffect(() => { crossfadeMsRef.current = crossfadeMs; }, [crossfadeMs]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  const { status: mainStatus, volume: mainVolume } = useUniversalAudioPlayer();

  const cancelCrossfade = useCallback(() => {
    if (crossfadeRafRef.current) {
      cancelAnimationFrame(crossfadeRafRef.current);
      crossfadeRafRef.current = null;
    }
    crossfadingRef.current = false;
    // Pause the inactive one to prevent double playback
    const inactive = audioRef.current === audioARef.current ? audioBRef.current : audioARef.current;
    try { inactive?.pause(); } catch { /* noop */ }
  }, []);

  const swapActive = useCallback(() => {
    audioRef.current = audioRef.current === audioARef.current ? audioBRef.current : audioARef.current;
  }, []);

  const startCrossfade = useCallback((toIdx: number) => {
    const active = audioRef.current;
    if (!active) return;
    const pl = playlistRef.current;
    const track = pl[toIdx];
    if (!track || isStreamingUrl(track.audio_url)) return;
    const other = active === audioARef.current ? audioBRef.current : audioARef.current;
    if (!other) return;
    const dur = crossfadeMsRef.current;
    if (dur <= 0) return;

    crossfadingRef.current = true;
    try {
      other.src = track.audio_url;
      other.currentTime = 0;
      other.volume = 0;
      other.play().catch(() => { crossfadingRef.current = false; });
    } catch { crossfadingRef.current = false; return; }

    const startA = active.volume;
    const targetB = isDuckingRef.current ? duckVolume : volumeRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      try {
        active.volume = Math.max(0, startA * (1 - p));
        other.volume = Math.max(0, Math.min(1, targetB * p));
      } catch { /* noop */ }
      if (p < 1 && crossfadingRef.current) {
        crossfadeRafRef.current = requestAnimationFrame(step);
      } else {
        crossfadeRafRef.current = null;
        try { active.pause(); active.currentTime = 0; } catch { /* noop */ }
        try { active.volume = volumeRef.current; } catch { /* noop */ }
        // Swap
        audioRef.current = other;
        currentIndexRef.current = toIdx;
        setCurrentIndex(toIdx);
        crossfadingRef.current = false;
      }
    };
    crossfadeRafRef.current = requestAnimationFrame(step);
  }, [duckVolume]);

  // Init audio elements
  useEffect(() => {
    const makeAudio = () => {
      const a = new Audio();
      a.loop = false;
      a.preload = 'auto';
      a.crossOrigin = 'anonymous';
      a.volume = volume;
      registerAudioElement(a);
      return a;
    };
    const a = makeAudio();
    const b = makeAudio();
    audioARef.current = a;
    audioBRef.current = b;
    audioRef.current = a;

    // Web Audio pipeline para suportar 432Hz nos dois elementos (A e B).
    let ctx: AudioContext | null = null;
    let disposed = false;
    let cleanupPitchSub: (() => void) | null = null;
    const pitchNodes: SoundTouchNode[] = [];
    const nodeByEl = new WeakMap<HTMLAudioElement, SoundTouchNode>();
    const applyForEl = (el: HTMLAudioElement | null) => {
      if (!el) return;
      const n = nodeByEl.get(el);
      if (n) applyPitchForUrl(n, el.currentSrc || el.src || null);
    };
    const applyAll = () => { applyForEl(a); applyForEl(b); };
    const onLoadStart = (e: Event) => applyForEl(e.target as HTMLAudioElement);
    try {
      ctx = new AudioContext();
      const setupElement = (el: HTMLAudioElement) => {
        const source = ctx!.createMediaElementSource(el);
        source.connect(ctx!.destination);
        return source;
      };
      const sourceA = setupElement(a);
      const sourceB = setupElement(b);

      ensure432Registered(ctx)
        .then(() => {
          if (disposed || !ctx) return;
          try {
            ([[sourceA, a], [sourceB, b]] as [MediaElementAudioSourceNode, HTMLAudioElement][]).forEach(([src, el]) => {
              const pitchNode = create432Node(ctx!);
              pitchNodes.push(pitchNode);
              nodeByEl.set(el, pitchNode);
              try { src.disconnect(); } catch { /* noop */ }
              src.connect(pitchNode).connect(ctx!.destination);
            });
            applyAll();
            a.addEventListener('loadstart', onLoadStart);
            b.addEventListener('loadstart', onLoadStart);
            const unsubG = subscribeFrequency432(applyAll);
            const unsubT = subscribeTrackHz(applyAll);
            cleanupPitchSub = () => { unsubG(); unsubT(); };
          } catch (err) {
            console.warn('[bg-432Hz] falha ao inserir nó de pitch:', err);
          }
        })
        .catch((err) => {
          console.warn('[bg-432Hz] worklet indisponível:', err);
        });
    } catch (err) {
      console.warn('[bg-audio] AudioContext indisponível, seguindo sem 432Hz:', err);
    }


    const handleEnded = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      // Se este elemento não é mais o ativo (crossfade concluiu), ignore.
      if (el !== audioRef.current) return;
      const pl = playlistRef.current;
      if (pl.length === 0) return;
      if (!wantsToPlayRef.current) return;
      const enabled = pl.filter((t) => !t.disabled);
      if (enabled.length === 0) return;
      if (enabled.length === 1 && !pl[currentIndexRef.current].disabled) {
        try { el.currentTime = 0; el.play().catch(() => undefined); }
        catch { setIsPlaying(false); }
        return;
      }
      const nextIdx = findNextEnabled(pl, currentIndexRef.current, 1);
      if (nextIdx < 0) return;
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      const track = pl[nextIdx];
      if (track && !isStreamingUrl(track.audio_url)) {
        el.src = track.audio_url;
        el.play().catch(() => undefined);
      }
    };
    const handlePlay = (e: Event) => {
      if ((e.target as HTMLAudioElement) !== audioRef.current) return;
      wantsToPlayRef.current = true; setIsPlaying(true);
    };
    const handlePause = (e: Event) => {
      if ((e.target as HTMLAudioElement) !== audioRef.current) return;
      if (crossfadingRef.current) return;
      setIsPlaying(false);
    };
    const handleError = (e: Event) => {
      if ((e.target as HTMLAudioElement) !== audioRef.current) return;
      setIsPlaying(false);
      toast({
        title: 'Não foi possível tocar a música de fundo',
        description: 'Use um arquivo de áudio da biblioteca ou um link do YouTube.',
        variant: 'destructive',
      });
    };
    [a, b].forEach((el) => {
      el.addEventListener('ended', handleEnded);
      el.addEventListener('play', handlePlay);
      el.addEventListener('pause', handlePause);
      el.addEventListener('error', handleError);
    });

    return () => {
      disposed = true;
      cleanupPitchSub?.();
      [a, b].forEach((el) => {
        el.removeEventListener('ended', handleEnded);
        el.removeEventListener('play', handlePlay);
        el.removeEventListener('pause', handlePause);
        el.removeEventListener('error', handleError);
        el.removeEventListener('loadstart', onLoadStart);
        el.pause();
      });
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      if (crossfadeRafRef.current) cancelAnimationFrame(crossfadeRafRef.current);
      try { ctx?.close(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeWrite = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  };
  useEffect(() => { 
    safeWrite(storageKey, JSON.stringify(playlist)); 
    onPlaylistChange?.(playlist);
  }, [playlist, storageKey, onPlaylistChange]);
  useEffect(() => {
    safeWrite(VOLUME_KEY, String(volume));
    if (audioRef.current && !isDuckingRef.current && !crossfadingRef.current) audioRef.current.volume = mainVolume;
  }, [mainVolume]);
  useEffect(() => { safeWrite(AUTO_KEY, String(autoPauseEnabled)); }, [autoPauseEnabled]);
  useEffect(() => { safeWrite(MODE_KEY, autoMode); }, [autoMode]);
  useEffect(() => { safeWrite(DUCK_KEY, String(duckVolume)); }, [duckVolume]);
  useEffect(() => { safeWrite(FADE_KEY, String(fadeMs)); }, [fadeMs]);
  useEffect(() => { safeWrite(MAX_DUR_KEY, String(maxDurationSec)); }, [maxDurationSec]);
  useEffect(() => { safeWrite(RESUME_DELAY_KEY, String(resumeDelayMs)); }, [resumeDelayMs]);
  useEffect(() => { safeWrite(CROSSFADE_KEY, String(crossfadeMs)); }, [crossfadeMs]);

  const postStreamCommand = useCallback((command: 'play' | 'pause') => {
    const frame = streamIframeRef.current;
    const mounted = streamFrameRef.current;
    if (!frame?.contentWindow || !mounted) return;
    const func = command === 'play' ? 'playVideo' : 'pauseVideo';
    frame.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      'https://www.youtube.com'
    );
  }, []);

  const ensureStreamFrame = useCallback((track: BackgroundTrack, autoplay: boolean) => {
    if (detectStream(track.audio_url) !== 'youtube') return false;
    const embed = toEmbedUrl(track.audio_url, { autoplay });
    if (!embed) return false;

    setStreamFrame((prev) => {
      if (prev?.trackId === track.id) return prev;
      const withCacheBust = `${embed}${embed.includes('?') ? '&' : '?'}_bg=${Date.now()}`;
      // Adiciona origin explicitamente se toEmbedUrl não o fez (backup)
      const finalSrc = withCacheBust.includes('origin=') ? withCacheBust : `${withCacheBust}&origin=${encodeURIComponent(window.location.origin)}`;
      return { trackId: track.id, kind: 'youtube', src: finalSrc };
    });
    return true;
  }, []);

  // Enforce max duration cutoff & crossfade trigger
  const maxDurationRef = useRef(maxDurationSec);
  useEffect(() => { maxDurationRef.current = maxDurationSec; }, [maxDurationSec]);
  useEffect(() => {
    const els = [audioARef.current, audioBRef.current].filter(Boolean) as HTMLAudioElement[];
    const onTimeUpdate = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      if (el !== audioRef.current) return;
      setCurrentTime(el.currentTime || 0);
      const pl = playlistRef.current;
      const limit = maxDurationRef.current;
      const xfade = crossfadeMsRef.current;
      const dur = isFinite(el.duration) ? el.duration : 0;
      const enabled = pl.filter((t) => !t.disabled).length;

      // Corte manual (maxDuration): hard cut, avança/reinicia
      if (limit > 0 && wantsToPlayRef.current && !el.paused && el.currentTime >= limit) {
        if (enabled <= 1) {
          try { el.currentTime = 0; el.play().catch(() => undefined); } catch { /* noop */ }
        } else {
          const nextIdx = findNextEnabled(pl, currentIndexRef.current, 1);
          if (nextIdx >= 0) {
            currentIndexRef.current = nextIdx;
            setCurrentIndex(nextIdx);
            const track = pl[nextIdx];
            if (track && !isStreamingUrl(track.audio_url)) {
              el.src = track.audio_url; el.play().catch(() => undefined);
            }
          }
        }
        return;
      }

      // Crossfade: quando faltar < xfade e houver próxima faixa habilitada
      if (
        xfade > 0 && dur > 0 && enabled > 1 && !crossfadingRef.current &&
        wantsToPlayRef.current && !el.paused &&
        (dur - el.currentTime) * 1000 <= xfade
      ) {
        const nextIdx = findNextEnabled(pl, currentIndexRef.current, 1);
        if (nextIdx >= 0 && nextIdx !== currentIndexRef.current) {
          startCrossfade(nextIdx);
        }
      }
    };
    const onLoaded = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      if (el !== audioRef.current) return;
      setDuration(isFinite(el.duration) ? el.duration : 0);
    };
    els.forEach((el) => {
      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onLoaded);
      el.addEventListener('durationchange', onLoaded);
    });
    return () => {
      els.forEach((el) => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('loadedmetadata', onLoaded);
        el.removeEventListener('durationchange', onLoaded);
      });
    };
  }, [startCrossfade]);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = Math.max(0, sec); setCurrentTime(a.currentTime); } catch { /* noop */ }
  }, []);

  // Load current track src when track changes (does NOT touch playback state)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (crossfadingRef.current) return; // crossfade gerencia o src do outro elemento
    const track = playlist[currentIndex];
    if (!track) {
      a.pause();
      a.removeAttribute('src');
      setStreamFrame(null);
      return;
    }

    if (isStreamingUrl(track.audio_url)) {
      a.pause();
      a.removeAttribute('src');
      a.load();
      if (streamFrameRef.current && streamFrameRef.current.trackId !== track.id) {
        setStreamFrame(null);
      }
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (a.src !== track.audio_url) {
      setStreamFrame(null);
      a.src = track.audio_url;
      a.load();
    }
  }, [currentIndex, playlist]);


  const fadeTo = useCallback((target: number, duration: number, onDone?: () => void) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    if (duration <= 0) {
      a.volume = Math.max(0, Math.min(1, target));
      onDone?.();
      return;
    }
    const start = a.volume;
    const delta = target - start;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      a.volume = Math.max(0, Math.min(1, start + delta * p));
      if (p < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
        onDone?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!autoPauseEnabled) return;
    const a = audioRef.current;
    if (!a) return;

    if (mainStatus === 'playing') {
      if (autoMode === 'duck') {
        if (isPlaying && !isDuckingRef.current) {
          isDuckingRef.current = true;
          setIsDucking(true);
          fadeTo(duckVolume, fadeMs);
        }
      } else {
        if (isPlaying) {
          fadeTo(0, fadeMs, () => {
            postStreamCommand('pause');
            a.pause();
            setIsPlaying(false);
            wasAutoPausedRef.current = true;
            setWasAutoPaused(true);
            a.volume = volume;
          });
        }
      }
    } else if (mainStatus === 'idle') {
      const delay = Math.max(0, resumeDelayMs);
      const doResume = () => {
        if (autoMode === 'duck') {
          if (isDuckingRef.current) {
            isDuckingRef.current = false;
            setIsDucking(false);
            fadeTo(mainVolume, fadeMs);
          }
        } else {
          if (wasAutoPausedRef.current && playlistRef.current.length > 0) {
            wasAutoPausedRef.current = false;
            setWasAutoPaused(false);
            const track = playlistRef.current[currentIndexRef.current];
            if (track && isStreamingUrl(track.audio_url)) {
              ensureStreamFrame(track, false);
              wantsToPlayRef.current = true;
              setIsPlaying(true);
              window.setTimeout(() => postStreamCommand('play'), 300);
            } else {
              a.volume = 0;
              a.play().then(() => {
                setIsPlaying(true);
                fadeTo(mainVolume, fadeMs);
              }).catch(() => {});
            }
          }
        }
      };
      if (delay === 0) {
        doResume();
      } else {
        const t = setTimeout(doResume, delay);
        return () => clearTimeout(t);
      }
    }
  }, [mainStatus, autoPauseEnabled, autoMode, duckVolume, fadeMs, volume, isPlaying, playlist.length, resumeDelayMs, fadeTo, ensureStreamFrame, postStreamCommand]);

  const play = useCallback((index?: number) => {
    const a = audioRef.current;
    if (!a || playlist.length === 0) return;
    cancelCrossfade();
    let targetIdx = index !== undefined ? index : currentIndex;
    // Se a faixa alvo está desativada, pula para próxima habilitada
    if (playlist[targetIdx]?.disabled) {
      const nextIdx = findNextEnabled(playlist, targetIdx - 1, 1);
      if (nextIdx < 0) {
        toast({ title: 'Todas as faixas estão desativadas', variant: 'destructive' });
        return;
      }
      targetIdx = nextIdx;
    }
    if (targetIdx !== currentIndex) {
      currentIndexRef.current = targetIdx;
      setCurrentIndex(targetIdx);
    }
    const track = playlist[targetIdx];
    if (!track) return;
    if (isStreamingUrl(track.audio_url)) {
      try { a.pause(); } catch { /* noop */ }
      if (!ensureStreamFrame(track, true)) {
        setIsPlaying(false);
        return;
      }
      wantsToPlayRef.current = true;
      setIsPlaying(true);
      window.setTimeout(() => postStreamCommand('play'), 300);
      return;
    }
    const requestId = ++playRequestRef.current;
    if (a.src !== track.audio_url) {
      a.src = track.audio_url;
      a.load();
    }
    a.volume = isDuckingRef.current ? duckVolume : mainVolume;
    if (mainStatus === 'playing' && autoPauseEnabled && autoMode === 'pause') {
      a.pause();
      wasAutoPausedRef.current = true;
      setWasAutoPaused(true);
      setIsPlaying(false);
      toast({
        title: 'Música de fundo pausada',
        description: 'Ela volta automaticamente quando a música da etapa parar.',
      });
      return;
    }
    a.play().then(() => {
      if (requestId !== playRequestRef.current) return;
      setIsPlaying(true);
      wasAutoPausedRef.current = false;
      setWasAutoPaused(false);
    }).catch((err) => {
      console.warn('BG music play failed:', err);
      if (requestId !== playRequestRef.current) return;
      setIsPlaying(false);
      toast({
        title: 'O player de fundo não conseguiu iniciar',
        description: 'Toque novamente após escolher um arquivo de áudio válido da biblioteca.',
        variant: 'destructive',
      });
    });
  }, [playlist, currentIndex, volume, duckVolume, mainStatus, autoPauseEnabled, autoMode, ensureStreamFrame, postStreamCommand, cancelCrossfade]);

  const pause = useCallback(() => {
    playRequestRef.current += 1;
    wantsToPlayRef.current = false;
    cancelCrossfade();
    postStreamCommand('pause');
    audioARef.current?.pause();
    audioBRef.current?.pause();
    setIsPlaying(false);
    wasAutoPausedRef.current = false;
    setWasAutoPaused(false);
  }, [postStreamCommand, cancelCrossfade]);

  const toggle = useCallback(() => { if (isPlaying) pause(); else play(); }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    const n = findNextEnabled(playlist, currentIndex, 1);
    if (n < 0) return;
    currentIndexRef.current = n;
    setCurrentIndex(n);
    if (isPlaying) play(n);
  }, [currentIndex, playlist, isPlaying, play]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    const p = findNextEnabled(playlist, currentIndex, -1);
    if (p < 0) return;
    currentIndexRef.current = p;
    setCurrentIndex(p);
    if (isPlaying) play(p);
  }, [currentIndex, playlist, isPlaying, play]);

  const addTrack = useCallback((t: BackgroundTrack) => {
    setPlaylist((prev) => {
      const existingIndex = prev.findIndex((x) => x.audio_url === t.audio_url);
      if (existingIndex >= 0) {
        currentIndexRef.current = existingIndex;
        setCurrentIndex(existingIndex);
        return prev;
      }
      const next = [...prev, t];
      currentIndexRef.current = next.length - 1;
      setCurrentIndex(next.length - 1);
      return next;
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setPlaylist((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== id);
      const cur = currentIndexRef.current;
      if (idx === cur) {
        audioRef.current?.pause();
        setStreamFrame(null);
        setIsPlaying(false);
        const newIdx = next.length === 0 ? 0 : Math.min(cur, next.length - 1);
        currentIndexRef.current = newIdx;
        setCurrentIndex(newIdx);
        if (audioRef.current) audioRef.current.src = next[newIdx]?.audio_url || '';
      } else if (idx < cur) {
        const newIdx = cur - 1;
        currentIndexRef.current = newIdx;
        setCurrentIndex(newIdx);
      }
      if (next.length === 0) {
        audioRef.current?.pause();
        setStreamFrame(null);
        setIsPlaying(false);
      }
      return next;
    });
  }, []);

  const toggleTrackEnabled = useCallback((id: string) => {
    setPlaylist((prev) => prev.map((t) => t.id === id ? { ...t, disabled: !t.disabled } : t));
  }, []);

  const clearPlaylist = useCallback(() => {
    audioARef.current?.pause();
    audioBRef.current?.pause();
    setStreamFrame(null);
    setPlaylist([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v: number) => {
    // Sincroniza o volume global se necessário ou mantém apenas o local
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);
  const setAutoPauseEnabled = useCallback((v: boolean) => setAutoPauseEnabledState(v), []);
  const setAutoMode = useCallback((m: AutoDuckMode) => setAutoModeState(m), []);
  const setDuckVolume = useCallback((v: number) => setDuckVolumeState(Math.max(0, Math.min(1, v))), []);
  const setFadeMs = useCallback((v: number) => setFadeMsState(Math.max(0, Math.min(5000, Math.round(v)))), []);
  const setMaxDurationSec = useCallback((v: number) => setMaxDurationSecState(Math.max(0, Math.round(v))), []);
  const setResumeDelayMs = useCallback((v: number) => setResumeDelayMsState(Math.max(0, Math.round(v))), []);
  const setCrossfadeMs = useCallback((v: number) => setCrossfadeMsState(Math.max(0, Math.min(15000, Math.round(v)))), []);

  const value: BackgroundMusicContextValue = {
    playlist,
    currentIndex,
    currentTrack: playlist[currentIndex] || null,
    isPlaying,
    volume: mainVolume,
    autoPauseEnabled,
    wasAutoPaused,
    autoMode,
    duckVolume,
    fadeMs,
    isDucking,
    crossfadeMs,
    setCrossfadeMs,
    addTrack,
    removeTrack,
    toggleTrackEnabled,
    clearPlaylist,
    play,
    pause,
    toggle,
    next,
    prev,
    setVolume,
    setAutoPauseEnabled,
    setAutoMode,
    setDuckVolume,
    setFadeMs,
    maxDurationSec,
    setMaxDurationSec,
    resumeDelayMs,
    setResumeDelayMs,
    currentTime,
    duration,
    seek,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {streamFrame && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: -10000,
            top: -10000,
            width: 260,
            height: 150,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <iframe
            ref={streamIframeRef}
            key={streamFrame.trackId}
            src={streamFrame.src}
            title="Player de música de fundo"
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useBackgroundMusic(): BackgroundMusicContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBackgroundMusic must be used within BackgroundMusicProvider');
  return c;
}
