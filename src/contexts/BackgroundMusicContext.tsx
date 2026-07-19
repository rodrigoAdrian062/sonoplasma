import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from '@/hooks/use-toast';
import { registerAudioElement } from '@/lib/audioOutput';
import { toEmbedUrl, detectStream } from '@/lib/embedUrl';

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
  resumeDelayMs: number; // atraso antes de retomar/restaurar após etapa parar
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

const Ctx = createContext<BackgroundMusicContextValue | null>(null);

function isStreamingUrl(url: string): boolean {
  const u = (url || '').toLowerCase();
  return u.includes('youtube.com') || u.includes('youtu.be') || u.includes('open.spotify.com') || u.startsWith('spotify:');
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const safeRead = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const [playlist, setPlaylist] = useState<BackgroundTrack[]>(() => {
    try {
      const saved = JSON.parse(safeRead(STORAGE_KEY) || '[]') as BackgroundTrack[];
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
  const [wasAutoPaused, setWasAutoPaused] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasAutoPausedRef = useRef(false);
  const isDuckingRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);
  const playlistRef = useRef<BackgroundTrack[]>(playlist);
  const currentIndexRef = useRef(currentIndex);
  const playRequestRef = useRef(0);
  // Reflete a intenção do usuário — usado no handleEnded para não retomar
  // uma faixa que foi pausada exatamente quando a anterior terminou.
  const wantsToPlayRef = useRef(false);
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
      // Bug corrigido: se o usuário pausou justo quando a faixa acabou,
      // handleEnded reiniciava/avançava mesmo assim. Agora respeita a intenção.
      if (!wantsToPlayRef.current) return;
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
    const handlePlay = () => { wantsToPlayRef.current = true; setIsPlaying(true); };
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

  // Persist (silencioso se localStorage indisponível — Safari privado/quota)
  const safeWrite = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  };
  useEffect(() => { safeWrite(STORAGE_KEY, JSON.stringify(playlist)); }, [playlist]);
  useEffect(() => {
    safeWrite(VOLUME_KEY, String(volume));
    // If not ducking, sync element volume directly
    if (audioRef.current && !isDuckingRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => { safeWrite(AUTO_KEY, String(autoPauseEnabled)); }, [autoPauseEnabled]);
  useEffect(() => { safeWrite(MODE_KEY, autoMode); }, [autoMode]);
  useEffect(() => { safeWrite(DUCK_KEY, String(duckVolume)); }, [duckVolume]);
  useEffect(() => { safeWrite(FADE_KEY, String(fadeMs)); }, [fadeMs]);
  useEffect(() => { safeWrite(MAX_DUR_KEY, String(maxDurationSec)); }, [maxDurationSec]);
  useEffect(() => { safeWrite(RESUME_DELAY_KEY, String(resumeDelayMs)); }, [resumeDelayMs]);

  // Enforce max duration cutoff (loops or advances)
  const maxDurationRef = useRef(maxDurationSec);
  useEffect(() => { maxDurationRef.current = maxDurationSec; }, [maxDurationSec]);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTimeUpdate = () => {
      setCurrentTime(a.currentTime || 0);
      const limit = maxDurationRef.current;
      if (limit > 0 && a.currentTime >= limit) {
        const pl = playlistRef.current;
        if (pl.length <= 1) {
          try { a.currentTime = 0; a.play().catch(() => undefined); } catch { /* noop */ }
        } else {
          const nextIdx = (currentIndexRef.current + 1) % pl.length;
          currentIndexRef.current = nextIdx;
          setCurrentIndex(nextIdx);
          const track = pl[nextIdx];
          if (track) { a.src = track.audio_url; a.play().catch(() => undefined); }
        }
      }
    };
    const onLoaded = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('durationchange', onLoaded);
    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('durationchange', onLoaded);
    };
  }, []);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = Math.max(0, sec); setCurrentTime(a.currentTime); } catch { /* noop */ }
  }, []);

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

    // YouTube/Spotify não podem ser carregados pelo elemento <audio> nativo.
    // Eles são tocados pelo iframe persistente abaixo; manter o <audio> limpo
    // evita erro falso logo após selecionar a faixa como música de fundo.
    if (isStreamingUrl(track.audio_url)) {
      a.pause();
      a.removeAttribute('src');
      a.load();
      setCurrentTime(0);
      setDuration(0);
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
      const delay = Math.max(0, resumeDelayMs);
      const doResume = () => {
        if (autoMode === 'duck') {
          if (isDuckingRef.current) {
            isDuckingRef.current = false;
            setIsDucking(false);
            fadeTo(volume, fadeMs);
          }
        } else {
          if (wasAutoPausedRef.current && playlistRef.current.length > 0) {
            wasAutoPausedRef.current = false;
            setWasAutoPaused(false);
            a.volume = 0;
            a.play().then(() => {
              setIsPlaying(true);
              fadeTo(volume, fadeMs);
            }).catch(() => {});
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
  }, [mainStatus, autoPauseEnabled, autoMode, duckVolume, fadeMs, volume, isPlaying, playlist.length, resumeDelayMs, fadeTo]);

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
    // YouTube/Spotify: o player embutido (iframe) cuida do play; só marcamos o estado.
    if (isStreamingUrl(track.audio_url)) {
      try { a.pause(); } catch { /* noop */ }
      wantsToPlayRef.current = true;
      setIsPlaying(true);
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
    wantsToPlayRef.current = false;
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
      // Bug corrigido: se a faixa removida for a que está tocando (idx === cur),
      // o <audio> ficava com o src antigo enquanto currentIndex apontava para
      // outra faixa — trocando de música sem aviso. Agora paramos e realinhamos.
      if (idx === cur) {
        audioRef.current?.pause();
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
        setIsPlaying(false);
      }
      return next;
    });
  }, []);

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
  const setMaxDurationSec = useCallback((v: number) => setMaxDurationSecState(Math.max(0, Math.round(v))), []);
  const setResumeDelayMs = useCallback((v: number) => setResumeDelayMsState(Math.max(0, Math.round(v))), []);

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
    maxDurationSec,
    setMaxDurationSec,
    resumeDelayMs,
    setResumeDelayMs,
    currentTime,
    duration,
    seek,
  };

  const streamCurrent = playlist[currentIndex];
  const streamKind = streamCurrent ? detectStream(streamCurrent.audio_url) : null;
  const streamEmbed = streamCurrent && streamKind
    ? toEmbedUrl(streamCurrent.audio_url, { autoplay: isPlaying })
    : null;

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Iframe persistente para YouTube/Spotify — fica montado fora do popover
          para que a reprodução não seja interrompida ao fechar o painel. */}
      {streamEmbed && isPlaying && (
        <div
          aria-hidden={false}
          style={{
            position: 'fixed',
            right: 12,
            bottom: 64,
            width: streamKind === 'spotify' ? 300 : 260,
            height: streamKind === 'spotify' ? 80 : 150,
            zIndex: 99,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(212,175,55,0.4)',
            background: '#000',
          }}
        >
          <iframe
            key={streamCurrent!.id}
            src={streamEmbed}
            title={`Fundo — ${streamCurrent!.nome}`}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
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
