import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from '@/hooks/use-toast';
import { registerAudioElement } from '@/lib/audioOutput';

export interface BackgroundTrack {
  id: string;
  nome: string;
  audio_url: string;
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
  duckVolume: number; // 0..1 target volume when ducking
  fadeMs: number;    // fade duration in ms
  isDucking: boolean;
  addTrack: (t: BackgroundTrack) => void;
  removeTrack: (id: string) => void;
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
  maxDurationSec: number; // 0 = sem limite
  setMaxDurationSec: (v: number) => void;
}

const STORAGE_KEY = 'bg-music-playlist-v1';
const VOLUME_KEY = 'bg-music-volume-v1';
const AUTO_KEY = 'bg-music-auto-pause-v1';
const MODE_KEY = 'bg-music-auto-mode-v1';
const DUCK_KEY = 'bg-music-duck-volume-v1';
const FADE_KEY = 'bg-music-fade-ms-v1';
const MAX_DUR_KEY = 'bg-music-max-duration-sec-v1';

const Ctx = createContext<BackgroundMusicContextValue | null>(null);

function isStreamingUrl(url: string): boolean {
  const u = (url || '').toLowerCase();
  return u.includes('youtube.com') || u.includes('youtu.be') || u.includes('open.spotify.com') || u.startsWith('spotify:');
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<BackgroundTrack[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as BackgroundTrack[];
      return Array.isArray(saved) ? saved.filter((track) => track?.audio_url && !isStreamingUrl(track.audio_url)) : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) || '0.25');
    return isNaN(v) ? 0.25 : v;
  });
  const [autoPauseEnabled, setAutoPauseEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_KEY) !== 'false';
  });
  const [autoMode, setAutoModeState] = useState<AutoDuckMode>(() => {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'duck' ? 'duck' : 'pause';
  });
  const [duckVolume, setDuckVolumeState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem(DUCK_KEY) || '0.08');
    return isNaN(v) ? 0.08 : v;
  });
  const [fadeMs, setFadeMsState] = useState<number>(0);
  const [wasAutoPaused, setWasAutoPaused] = useState(false);
  const [isDucking, setIsDucking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasAutoPausedRef = useRef(false);
  const isDuckingRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);
  const playlistRef = useRef<BackgroundTrack[]>(playlist);
  const currentIndexRef = useRef(currentIndex);
  const playRequestRef = useRef(0);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  const { status: mainStatus } = useUniversalAudioPlayer();

  // Init audio element
  useEffect(() => {
    const a = new Audio();
    a.loop = false;
    a.preload = 'auto';
    a.volume = volume;
    audioRef.current = a;
    registerAudioElement(a);
    const handleEnded = () => {
      const pl = playlistRef.current;
      if (pl.length === 0) return;
      if (pl.length === 1) {
        try {
          a.currentTime = 0;
          a.play().catch(() => undefined);
        } catch {
          setIsPlaying(false);
        }
        return;
      }
      const nextIdx = (currentIndexRef.current + 1) % pl.length;
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      const track = pl[nextIdx];
      if (track) {
        a.src = track.audio_url;
        a.play().catch(() => undefined);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      toast({
        title: 'Não foi possível tocar a música de fundo',
        description: 'Use um arquivo de áudio da biblioteca. Links do YouTube ou Spotify não tocam neste player.',
        variant: 'destructive',
      });
    };
    a.addEventListener('ended', handleEnded);
    a.addEventListener('play', handlePlay);
    a.addEventListener('pause', handlePause);
    a.addEventListener('error', handleError);

    return () => {
      a.removeEventListener('ended', handleEnded);
      a.removeEventListener('play', handlePlay);
      a.removeEventListener('pause', handlePause);
      a.removeEventListener('error', handleError);
      a.pause();
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist)); }, [playlist]);
  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    // If not ducking, sync element volume directly
    if (audioRef.current && !isDuckingRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => { localStorage.setItem(AUTO_KEY, String(autoPauseEnabled)); }, [autoPauseEnabled]);
  useEffect(() => { localStorage.setItem(MODE_KEY, autoMode); }, [autoMode]);
  useEffect(() => { localStorage.setItem(DUCK_KEY, String(duckVolume)); }, [duckVolume]);
  useEffect(() => { localStorage.setItem(FADE_KEY, String(fadeMs)); }, [fadeMs]);

  // Load current track src when track changes (does NOT touch playback state)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const track = playlist[currentIndex];
    if (!track) {
      a.pause();
      a.removeAttribute('src');
      return;
    }
    if (a.src !== track.audio_url) {
      a.src = track.audio_url;
      a.load();
    }
  }, [currentIndex, playlist]);


  // Fade helper
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

  // Auto pause/duck on main player status
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
        // pause mode: fade out then pause
        if (isPlaying) {
          fadeTo(0, fadeMs, () => {
            a.pause();
            setIsPlaying(false);
            wasAutoPausedRef.current = true;
            setWasAutoPaused(true);
            a.volume = volume; // restore for later
          });
        }
      }
    } else if (mainStatus === 'idle') {
      if (autoMode === 'duck') {
        if (isDuckingRef.current) {
          isDuckingRef.current = false;
          setIsDucking(false);
          fadeTo(volume, fadeMs);
        }
      } else {
        if (wasAutoPausedRef.current && playlist.length > 0) {
          wasAutoPausedRef.current = false;
          setWasAutoPaused(false);
          a.volume = 0;
          a.play().then(() => {
            setIsPlaying(true);
            fadeTo(volume, fadeMs);
          }).catch(() => {});
        }
      }
    }
  }, [mainStatus, autoPauseEnabled, autoMode, duckVolume, fadeMs, volume, isPlaying, playlist.length, fadeTo]);

  const play = useCallback((index?: number) => {
    const a = audioRef.current;
    if (!a || playlist.length === 0) return;
    const targetIdx = index !== undefined ? index : currentIndex;
    if (index !== undefined) {
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }
    const track = playlist[targetIdx];
    if (!track) return;
    if (isStreamingUrl(track.audio_url)) {
      toast({
        title: 'Música incompatível com o player de fundo',
        description: 'Escolha um arquivo de áudio enviado à biblioteca. YouTube e Spotify não funcionam como fundo.',
        variant: 'destructive',
      });
      setIsPlaying(false);
      return;
    }
    const requestId = ++playRequestRef.current;
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
  }, [playlist, currentIndex, volume, duckVolume, mainStatus, autoPauseEnabled, autoMode]);

  const pause = useCallback(() => {
    playRequestRef.current += 1;
    audioRef.current?.pause();
    setIsPlaying(false);
    wasAutoPausedRef.current = false;
    setWasAutoPaused(false);
  }, []);

  const toggle = useCallback(() => { if (isPlaying) pause(); else play(); }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    const n = (currentIndex + 1) % playlist.length;
    currentIndexRef.current = n;
    setCurrentIndex(n);
    if (isPlaying) play(n);
  }, [currentIndex, playlist.length, isPlaying, play]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    const p = (currentIndex - 1 + playlist.length) % playlist.length;
    currentIndexRef.current = p;
    setCurrentIndex(p);
    if (isPlaying) play(p);
  }, [currentIndex, playlist.length, isPlaying, play]);

  const addTrack = useCallback((t: BackgroundTrack) => {
    if (isStreamingUrl(t.audio_url)) {
      toast({
        title: 'Música incompatível com o player de fundo',
        description: 'Use apenas arquivos de áudio da biblioteca para música de fundo.',
        variant: 'destructive',
      });
      return;
    }
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
      const next = prev.filter((t) => t.id !== id);
      if (idx >= 0 && idx <= currentIndex && currentIndex > 0) {
        setCurrentIndex((c) => Math.max(0, c - 1));
      }
      if (next.length === 0) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
      return next;
    });
  }, [currentIndex]);

  const clearPlaylist = useCallback(() => {
    audioRef.current?.pause();
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
    addTrack,
    removeTrack,
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBackgroundMusic(): BackgroundMusicContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBackgroundMusic must be used within BackgroundMusicProvider');
  return c;
}
