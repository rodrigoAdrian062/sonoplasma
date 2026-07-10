import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { PlaybackStatus } from '@/types/ceremony';

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
  currentTime: number;
  duration: number;
  isYouTube: boolean;
  isSpotify: boolean;
  youtubeVideoId: string | null;
  eq: EQSettings;
  fadeEnabled: boolean;
  setFadeEnabled: (value: boolean) => void;
  play: (stageId: string, url: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekTo: (seconds: number) => void;
  setEQ: (settings: Partial<EQSettings>) => void;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function parseSpotify(url: string): { type: string; id: string } | null {
  const u = (url || '').trim();
  const uriMatch = u.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/);
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };
  const urlMatch = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) return { type: urlMatch[1], id: urlMatch[2] };
  return null;
}

function isSpotifyUrl(url: string): boolean {
  return parseSpotify(url) !== null;
}

function getSpotifyUri(url: string): string | null {
  const p = parseSpotify(url);
  return p ? `spotify:${p.type}:${p.id}` : null;
}

// Load the Spotify IFrame API once.
let spotifyApiPromise: Promise<any> | null = null;
function loadSpotifyApi(): Promise<any> {
  if (spotifyApiPromise) return spotifyApiPromise;
  spotifyApiPromise = new Promise((resolve) => {
    if ((window as any).SpotifyIframeApi) {
      resolve((window as any).SpotifyIframeApi);
      return;
    }
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      (window as any).SpotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
    };
    if (!document.getElementById('spotify-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'spotify-iframe-api';
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.body.appendChild(script);
    }
  });
  return spotifyApiPromise;
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
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  const [eq, setEQState] = useState<EQSettings>({ bass: 0, mid: 0, treble: 0 });
  const [fadeEnabled, setFadeEnabledState] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPlayerReadyRef = useRef(false);
  const pendingPlayRef = useRef<{ stageId: string; videoId: string } | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const spotifyControllerRef = useRef<any>(null);
  const spotifyReadyRef = useRef(false);
  const volumeRef = useRef(volume);
  const fadeEnabledRef = useRef(fadeEnabled);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    fadeEnabledRef.current = fadeEnabled;
  }, [fadeEnabled]);

  const setFadeEnabled = useCallback((value: boolean) => {
    setFadeEnabledState(value);
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
    audioRef.current = audio;

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

  // Poll YouTube player for time updates
  useEffect(() => {
    if (!isYouTube || status === 'idle') return;
    const interval = setInterval(() => {
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
    }, 500);
    return () => clearInterval(interval);
  }, [isYouTube, status]);

  const stopCurrentPlayback = useCallback(() => {
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
    if (spotifyControllerRef.current) {
      try { spotifyControllerRef.current.destroy(); } catch { /* noop */ }
      spotifyControllerRef.current = null;
      spotifyReadyRef.current = false;
    }
    const spotifyContainer = document.getElementById('spotify-player-container');
    if (spotifyContainer) spotifyContainer.remove();
  }, []);

  const createSpotifyPlayer = useCallback((uri: string) => {
    let container = document.getElementById('spotify-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'spotify-player-container';
      container.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; z-index: -1;';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    container.innerHTML = '';
    container.appendChild(el);

    loadSpotifyApi().then((IFrameAPI) => {
      IFrameAPI.createController(el, { uri, width: '300', height: '80' }, (controller: any) => {
        spotifyControllerRef.current = controller;
        controller.addListener('ready', () => {
          spotifyReadyRef.current = true;
          try { controller.play(); } catch { /* noop */ }
        });
        controller.addListener('playback_update', (e: any) => {
          const d = e?.data;
          if (!d) return;
          if (typeof d.position === 'number') setCurrentTime(d.position / 1000);
          if (typeof d.duration === 'number' && d.duration > 0) setDuration(d.duration / 1000);
          if (typeof d.isPaused === 'boolean') setStatus(d.isPaused ? 'paused' : 'playing');
        });
      });
    });
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
        setTimeout(initPlayer, 100);
        return;
      }
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
    stopCurrentPlayback();

    // Sempre iniciar o áudio com volume em 10%
    volumeRef.current = 0.1;
    setVolumeState(0.1);


    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => {
        console.warn('AudioContext resume failed:', err);
      });
    }

    const isYT = isYouTubeUrl(url);
    const isSpot = isSpotifyUrl(url);
    setIsYouTube(isYT);
    setIsSpotify(isSpot);

    if (isSpot) {
      const uri = getSpotifyUri(url);
      if (!uri) {
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
      createSpotifyPlayer(uri);
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
      audio.src = url;
      audio.volume = volumeRef.current;
      audio.play().catch(err => {
        console.error('Audio play error:', err);
      });
      setCurrentStageId(stageId);
      setStatus('playing');
    }
  }, [stopCurrentPlayback, createYouTubePlayer, createSpotifyPlayer]);

  const pause = useCallback(() => {
    if (isSpotify && spotifyControllerRef.current) {
      try { spotifyControllerRef.current.pause(); } catch { /* noop */ }
    } else if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setStatus('paused');
  }, [isYouTube, isSpotify]);

  const resume = useCallback(() => {
    if (isSpotify && spotifyControllerRef.current) {
      try { spotifyControllerRef.current.resume(); } catch { /* noop */ }
    } else if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.play();
    }
    setStatus('playing');
  }, [isYouTube, isSpotify]);

  const stop = useCallback(() => {
    stopCurrentPlayback();
    setStatus('idle');
    setCurrentStageId(null);
    setCurrentTime(0);
    setIsYouTube(false);
    setIsSpotify(false);
    setYoutubeVideoId(null);
    currentUrlRef.current = null;
      setCurrentUrl(null);
  }, [stopCurrentPlayback]);

  const setVolume = useCallback((value: number) => {
    if (audioRef.current) audioRef.current.volume = value;
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.setVolume(value * 100);
    }
    setVolumeState(value);
  }, []);

  const seekForward = useCallback((seconds = 10) => {
    if (isSpotify && spotifyControllerRef.current) {
      try { spotifyControllerRef.current.seek(Math.max(0, currentTime + seconds)); } catch { /* noop */ }
    } else if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(current + seconds, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds);
    }
  }, [isYouTube, isSpotify, currentTime]);

  const seekBackward = useCallback((seconds = 10) => {
    if (isSpotify && spotifyControllerRef.current) {
      try { spotifyControllerRef.current.seek(Math.max(0, currentTime - seconds)); } catch { /* noop */ }
    } else if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      const current = ytPlayerRef.current.getCurrentTime();
      ytPlayerRef.current.seekTo(Math.max(0, current - seconds), true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    }
  }, [isYouTube, isSpotify, currentTime]);

  const seekTo = useCallback((seconds: number) => {
    if (isSpotify && spotifyControllerRef.current) {
      try { spotifyControllerRef.current.seek(Math.max(0, seconds)); } catch { /* noop */ }
    } else if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, seconds));
    }
  }, [isYouTube, isSpotify]);

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
    currentTime,
    duration,
    isYouTube,
    isSpotify,
    youtubeVideoId,
    eq,
    play,
    pause,
    resume,
    stop,
    setVolume,
    seekForward,
    seekBackward,
    seekTo,
    setEQ,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useUniversalAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useUniversalAudioPlayer must be used within an AudioPlayerProvider');
  }
  return ctx;
}
