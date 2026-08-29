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

export interface BackgroundMusicContextValue {
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

const GlobalCtx = createContext<BackgroundMusicContextValue | null>(null);
const PresentationCtx = createContext<BackgroundMusicContextValue | null>(null);

export const useBackgroundMusic = () => {
  const presentation = useContext(PresentationCtx);
  const global = useContext(GlobalCtx);
  return presentation || global || (null as unknown as BackgroundMusicContextValue);
};

export const useGlobalBackgroundMusic = () => {
  const global = useContext(GlobalCtx);
  if (!global) throw new Error('useGlobalBackgroundMusic must be used within BackgroundMusicProvider');
  return global;
};

export const usePresentationBackgroundMusic = () => {
  return useContext(PresentationCtx);
};

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
  onPlaylistChange,
  isPresentation = false
}: { 
  children: ReactNode;
  storageKey?: string;
  initialPlaylist?: BackgroundTrack[];
  onPlaylistChange?: (pl: BackgroundTrack[]) => void;
  isPresentation?: boolean;
}) {
  const ActiveCtx = isPresentation ? PresentationCtx : GlobalCtx;
  const safeRead = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const getDynamicKey = (base: string) => `${storageKey}:${base}`;

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
    const v = parseFloat(safeRead(getDynamicKey(VOLUME_KEY)) || '0.25');
    return isNaN(v) ? 0.25 : v;
  });
  const [autoPauseEnabled, setAutoPauseEnabledState] = useState<boolean>(() => {
    return safeRead(getDynamicKey(AUTO_KEY)) !== 'false';
  });
  const [autoMode, setAutoModeState] = useState<AutoDuckMode>(() => {
    const m = safeRead(getDynamicKey(MODE_KEY));
    return m === 'duck' ? 'duck' : 'pause';
  });
  const [duckVolume, setDuckVolumeState] = useState<number>(() => {
    const v = parseFloat(safeRead(getDynamicKey(DUCK_KEY)) || '0.08');
    return isNaN(v) ? 0.08 : v;
  });
  const [fadeMs, setFadeMsState] = useState<number>(0);
  const [maxDurationSec, setMaxDurationSecState] = useState<number>(() => {
    const v = parseInt(safeRead(getDynamicKey(MAX_DUR_KEY)) || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [resumeDelayMs, setResumeDelayMsState] = useState<number>(() => {
    const v = parseInt(safeRead(getDynamicKey(RESUME_DELAY_KEY)) || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [crossfadeMs, setCrossfadeMsState] = useState<number>(() => {
    const v = parseInt(safeRead(getDynamicKey(CROSSFADE_KEY)) || '3000', 10);
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

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioFallbackRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const corsRetryRef = useRef<Set<string>>(new Set());
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
  const duckVolumeRef = useRef(duckVolume);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { streamFrameRef.current = streamFrame; }, [streamFrame]);
  useEffect(() => { crossfadeMsRef.current = crossfadeMs; }, [crossfadeMs]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { duckVolumeRef.current = duckVolume; }, [duckVolume]);
  const { status: mainStatus } = useUniversalAudioPlayer();

  const cancelCrossfade = useCallback(() => {
    if (crossfadeRafRef.current) {
      cancelAnimationFrame(crossfadeRafRef.current);
      crossfadeRafRef.current = null;
    }
    crossfadingRef.current = false;
    const inactive = audioRef.current === audioARef.current ? audioBRef.current : audioARef.current;
    try { inactive?.pause(); } catch { /* noop */ }
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
        audioRef.current = other;
        currentIndexRef.current = toIdx;
        setCurrentIndex(toIdx);
        crossfadingRef.current = false;
      }
    };
    crossfadeRafRef.current = requestAnimationFrame(step);
  }, [duckVolume]);

  useEffect(() => {
    const makeAudio = (withCors = true) => {
      const a = new Audio();
      a.loop = false;
      a.preload = 'auto';
      if (withCors) a.crossOrigin = 'anonymous';
      a.volume = volume;
      registerAudioElement(a);
      return a;
    };
    const a = makeAudio();
    const b = makeAudio();
    const f = makeAudio(false);
    audioARef.current = a;
    audioBRef.current = b;
    audioFallbackRef.current = f;
    audioRef.current = a;

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
      audioCtxRef.current = ctx;
      const sourceA = ctx.createMediaElementSource(a);
      const sourceB = ctx.createMediaElementSource(b);
      sourceA.connect(ctx.destination);
      sourceB.connect(ctx.destination);

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
      const el = e.target as HTMLAudioElement;
      if (el !== audioRef.current) return;
      const src = el.currentSrc || el.src || '';
      const fb = audioFallbackRef.current;

      // Muitas falhas vêm de CORS (crossOrigin=anonymous exigido pelo 432Hz).
      // Tenta de novo num elemento simples, fora do grafo Web Audio.
      if (src && fb && el !== fb && !corsRetryRef.current.has(src)) {
        corsRetryRef.current.add(src);
        console.warn('[bg-audio] falha ao carregar, tentando fallback sem CORS:', src);
        try {
          audioRef.current = fb;
          fb.volume = isDuckingRef.current ? duckVolumeRef.current : volumeRef.current;
          fb.src = src;
          fb.load();
          if (wantsToPlayRef.current) {
            fb.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
          return;
        } catch { /* segue para o aviso */ }
      }

      setIsPlaying(false);
      toast({
        title: 'Não foi possível tocar a música de fundo',
        description: 'Verifique o arquivo/link da faixa. Use um áudio da biblioteca ou um link do YouTube (links do Spotify não tocam como música de fundo).',
        variant: 'destructive',
      });
    };

    [a, b, f].forEach((el) => {
      el.addEventListener('ended', handleEnded);
      el.addEventListener('play', handlePlay);
      el.addEventListener('pause', handlePause);
      el.addEventListener('error', handleError);
    });

    return () => {
      disposed = true;
      cleanupPitchSub?.();
      [a, b, f].forEach((el) => {
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
  }, []);

  const safeWrite = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  };
  useEffect(() => { 
    safeWrite(storageKey, JSON.stringify(playlist)); 
    onPlaylistChange?.(playlist);
  }, [playlist, storageKey, onPlaylistChange]);
  
  useEffect(() => {
    safeWrite(getDynamicKey(VOLUME_KEY), String(volume));
    if (audioRef.current && !isDuckingRef.current && !crossfadingRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, storageKey]);

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
      const finalSrc = withCacheBust.includes('origin=') ? withCacheBust : `${withCacheBust}&origin=${encodeURIComponent(window.location.origin)}`;
      return { trackId: track.id, kind: 'youtube', src: finalSrc };
    });
    return true;
  }, []);

  const maxDurationRef = useRef(maxDurationSec);
  useEffect(() => { maxDurationRef.current = maxDurationSec; }, [maxDurationSec]);
  useEffect(() => {
    const onTimeUpdate = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      if (el !== audioRef.current) return;
      setCurrentTime(el.currentTime || 0);
      const pl = playlistRef.current;
      const limit = maxDurationRef.current;
      const xfade = crossfadeMsRef.current;
      const dur = isFinite(el.duration) ? el.duration : 0;
      const enabled = pl.filter((t) => !t.disabled).length;

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

      if (
        xfade > 0 && dur > 0 && enabled > 1 && !crossfadingRef.current &&
        wantsToPlayRef.current && !el.paused &&
        (dur - el.currentTime) * 1000 <= xfade
      ) {
        const nextIdx = findNextEnabled(pl, currentIndexRef.current, 1);
        if (nextIdx >= 0) startCrossfade(nextIdx);
      }
    };
    const onDurationChange = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      if (el === audioRef.current) setDuration(el.duration || 0);
    };
    [audioARef.current, audioBRef.current, audioFallbackRef.current].forEach((el) => {
      el?.addEventListener('timeupdate', onTimeUpdate);
      el?.addEventListener('durationchange', onDurationChange);
    });
    return () => {
      [audioARef.current, audioBRef.current, audioFallbackRef.current].forEach((el) => {
        el?.removeEventListener('timeupdate', onTimeUpdate);
        el?.removeEventListener('durationchange', onDurationChange);
      });
    };
  }, [maxDurationSec, startCrossfade]);

  const fadeTo = useCallback((targetVol: number, ms: number) => {
    const a = audioRef.current;
    if (!a || isStreamingUrl(a.currentSrc || a.src)) return;
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    if (ms <= 0) {
      a.volume = targetVol;
      return;
    }
    const startVol = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      a.volume = startVol + (targetVol - startVol) * p;
      if (p < 1) fadeRafRef.current = requestAnimationFrame(step);
      else fadeRafRef.current = null;
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!autoPauseEnabled) return;
    const a = audioRef.current;
    if (mainStatus === 'playing') {
      if (autoMode === 'pause' && isPlaying) {
        wasAutoPausedRef.current = true;
        setWasAutoPaused(true);
        if (isStreamingUrl(a?.currentSrc || a?.src || '')) {
          postStreamCommand('pause');
          setIsPlaying(false);
        } else {
          fadeTo(0, fadeMs);
          setTimeout(() => {
            if (wasAutoPausedRef.current) {
              a?.pause();
              setIsPlaying(false);
            }
          }, fadeMs + 50);
        }
      } else if (autoMode === 'duck') {
        isDuckingRef.current = true;
        setIsDucking(true);
        fadeTo(duckVolume, fadeMs);
      }
    } else if (mainStatus === 'paused' || (mainStatus as any) === 'idle') {
      const delay = resumeDelayMs;
      const doResume = () => {
        if ((mainStatus as any) === 'playing') return;
        if (autoMode === 'duck' && isDuckingRef.current) {
          isDuckingRef.current = false;
          setIsDucking(false);
          fadeTo(volumeRef.current, fadeMs);
        } else if (autoMode === 'pause' && wasAutoPausedRef.current) {
          wasAutoPausedRef.current = false;
          setWasAutoPaused(false);
          const pl = playlistRef.current;
          const track = pl[currentIndexRef.current];
          if (track) {
            if (isStreamingUrl(track.audio_url)) {
              if (ensureStreamFrame(track, true)) {
                setIsPlaying(true);
                window.setTimeout(() => postStreamCommand('play'), 300);
              }
            } else {
              if (a) {
                a.volume = 0;
                a.play().then(() => {
                  setIsPlaying(true);
                  fadeTo(volumeRef.current, fadeMs);
                }).catch(() => {});
              }
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
  }, [mainStatus, autoPauseEnabled, autoMode, duckVolume, fadeMs, isPlaying, playlist.length, resumeDelayMs, fadeTo, ensureStreamFrame, postStreamCommand]);

  const play = useCallback((index?: number) => {
    const a = audioRef.current;
    if (!a || playlist.length === 0) return;
    // Navegadores suspendem o AudioContext até haver interação: retomar aqui
    // evita a "falha" de tocar sem som ao iniciar no modo apresentação.
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }
    cancelCrossfade();
    let targetIdx = index !== undefined ? index : currentIndex;
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
    if (detectStream(track.audio_url) === 'spotify') {
      setIsPlaying(false);
      toast({
        title: 'Faixa do Spotify não funciona como música de fundo',
        description: 'Use um áudio da biblioteca (MP3) ou um link do YouTube nesta faixa.',
        variant: 'destructive',
      });
      return;
    }
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
    wantsToPlayRef.current = true;
    if (a.src !== track.audio_url) {
      a.src = track.audio_url;
      a.load();
    }

    a.volume = isDuckingRef.current ? duckVolume : volume;
    if (mainStatus === 'playing' && autoPauseEnabled && autoMode === 'pause') {
      a.pause();
      wasAutoPausedRef.current = true;
      setWasAutoPaused(true);
      setIsPlaying(false);
      toast({
        title: 'Fundo em espera',
        description: 'A música da etapa está tocando. O fundo volta automaticamente ao pausar a etapa.',
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
        title: 'Não foi possível iniciar a música de fundo',
        description: 'Toque novamente no botão de play para autorizar o áudio.',
        variant: 'destructive',
      });
    });

  }, [playlist, currentIndex, volume, duckVolume, mainStatus, autoPauseEnabled, autoMode, ensureStreamFrame, postStreamCommand, cancelCrossfade]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(playlist));
    onPlaylistChange?.(playlist);
  }, [playlist, storageKey, onPlaylistChange]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(VOLUME_KEY), String(volume));
  }, [volume, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(AUTO_KEY), String(autoPauseEnabled));
  }, [autoPauseEnabled, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(MODE_KEY), autoMode);
  }, [autoMode, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(DUCK_KEY), String(duckVolume));
  }, [duckVolume, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(MAX_DUR_KEY), String(maxDurationSec));
  }, [maxDurationSec, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(RESUME_DELAY_KEY), String(resumeDelayMs));
  }, [resumeDelayMs, storageKey]);

  useEffect(() => {
    localStorage.setItem(getDynamicKey(CROSSFADE_KEY), String(crossfadeMs));
  }, [crossfadeMs, storageKey]);

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
    volume,
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
    seek: (sec: number) => {
      const a = audioRef.current;
      if (a && isFinite(sec)) {
        a.currentTime = sec;
        setCurrentTime(sec);
      }
    },
  };

  return (
    <ActiveCtx.Provider value={value}>
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
            src={streamFrame.src}
            title="Background Audio Stream"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}
    </ActiveCtx.Provider>
  );
}
