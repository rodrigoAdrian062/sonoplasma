import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';

export interface BackgroundTrack {
  id: string;
  nome: string;
  audio_url: string;
}

interface BackgroundMusicContextValue {
  playlist: BackgroundTrack[];
  currentIndex: number;
  currentTrack: BackgroundTrack | null;
  isPlaying: boolean;
  volume: number;
  autoPauseEnabled: boolean;
  wasAutoPaused: boolean;
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
}

const STORAGE_KEY = 'bg-music-playlist-v1';
const VOLUME_KEY = 'bg-music-volume-v1';
const AUTO_KEY = 'bg-music-auto-pause-v1';

const Ctx = createContext<BackgroundMusicContextValue | null>(null);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<BackgroundTrack[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
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
  const [wasAutoPaused, setWasAutoPaused] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasAutoPausedRef = useRef(false);
  const { status: mainStatus } = useUniversalAudioPlayer();

  // Init audio element
  useEffect(() => {
    const a = new Audio();
    a.loop = false;
    a.preload = 'auto';
    a.volume = volume;
    audioRef.current = a;
    const handleEnded = () => {
      // Next track (loop playlist)
      setCurrentIndex((idx) => {
        const next = playlist.length > 0 ? (idx + 1) % playlist.length : 0;
        return next;
      });
    };
    a.addEventListener('ended', handleEnded);
    return () => {
      a.removeEventListener('ended', handleEnded);
      a.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
  }, [playlist]);
  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    localStorage.setItem(AUTO_KEY, String(autoPauseEnabled));
  }, [autoPauseEnabled]);

  // Load current track src when index/playlist changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const track = playlist[currentIndex];
    if (!track) {
      a.pause();
      a.removeAttribute('src');
      setIsPlaying(false);
      return;
    }
    if (a.src !== track.audio_url) {
      a.src = track.audio_url;
    }
    if (isPlaying) {
      a.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, playlist, isPlaying]);

  // Auto-pause when main player starts; resume when main goes idle
  useEffect(() => {
    if (!autoPauseEnabled) return;
    const a = audioRef.current;
    if (!a) return;
    if (mainStatus === 'playing') {
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
        wasAutoPausedRef.current = true;
        setWasAutoPaused(true);
      }
    } else if (mainStatus === 'idle') {
      if (wasAutoPausedRef.current && playlist.length > 0) {
        wasAutoPausedRef.current = false;
        setWasAutoPaused(false);
        a.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [mainStatus, autoPauseEnabled, isPlaying, playlist.length]);

  const play = useCallback((index?: number) => {
    const a = audioRef.current;
    if (!a || playlist.length === 0) return;
    const targetIdx = index !== undefined ? index : currentIndex;
    if (index !== undefined) setCurrentIndex(index);
    const track = playlist[targetIdx];
    if (!track) return;
    if (a.src !== track.audio_url) a.src = track.audio_url;
    a.volume = volume;
    a.play().then(() => {
      setIsPlaying(true);
      wasAutoPausedRef.current = false;
      setWasAutoPaused(false);
    }).catch((err) => {
      console.warn('BG music play failed:', err);
      setIsPlaying(false);
    });
  }, [playlist, currentIndex, volume]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    wasAutoPausedRef.current = false;
    setWasAutoPaused(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    const n = (currentIndex + 1) % playlist.length;
    setCurrentIndex(n);
    if (isPlaying) play(n);
  }, [currentIndex, playlist.length, isPlaying, play]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    const p = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(p);
    if (isPlaying) play(p);
  }, [currentIndex, playlist.length, isPlaying, play]);

  const addTrack = useCallback((t: BackgroundTrack) => {
    setPlaylist((prev) => {
      if (prev.some((x) => x.audio_url === t.audio_url)) return prev;
      return [...prev, t];
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
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
  }, []);

  const setAutoPauseEnabled = useCallback((v: boolean) => {
    setAutoPauseEnabledState(v);
  }, []);

  const value: BackgroundMusicContextValue = {
    playlist,
    currentIndex,
    currentTrack: playlist[currentIndex] || null,
    isPlaying,
    volume,
    autoPauseEnabled,
    wasAutoPaused,
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBackgroundMusic(): BackgroundMusicContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBackgroundMusic must be used within BackgroundMusicProvider');
  return c;
}
