import { useState, useRef, useEffect, useCallback } from 'react';
import { PlaybackStatus } from '@/types/ceremony';

interface UseUniversalAudioPlayerReturn {
  currentStageId: string | null;
  status: PlaybackStatus;
  volume: number;
  currentTime: number;
  duration: number;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  play: (stageId: string, url: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
}

// YouTube URL detection and ID extraction
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function useUniversalAudioPlayer(): UseUniversalAudioPlayerReturn {
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPlayerReadyRef = useRef(false);
  const pendingPlayRef = useRef<{ stageId: string; videoId: string } | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // Initialize HTML5 Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setStatus('idle');
      setCurrentStageId(null);
      setCurrentTime(0);
      setIsYouTube(false);
      setYoutubeVideoId(null);
      currentUrlRef.current = null;
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
    };
  }, []);

  // Initialize YouTube IFrame API
  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Set up callback for when API is ready
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API ready');
    };
  }, []);

  const stopCurrentPlayback = useCallback(() => {
    // Stop HTML5 audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop YouTube player
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

    // Remove any existing YouTube container
    const existingContainer = document.getElementById('yt-player-container');
    if (existingContainer) {
      existingContainer.remove();
    }
  }, []);

  const createYouTubePlayer = useCallback((videoId: string, stageId: string) => {
    // Create hidden container for YouTube player
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
      document.body.appendChild(container);
    }

    // Create div for player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player';
    container.innerHTML = '';
    container.appendChild(playerDiv);

    // Wait for YT API
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
            event.target.setVolume(volume * 100);
            event.target.playVideo();
            setCurrentStageId(stageId);
            setStatus('playing');
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
          },
        },
      });
    };

    initPlayer();
  }, [volume]);

  const play = useCallback((stageId: string, url: string) => {
    // Stop any current playback first
    stopCurrentPlayback();

    const isYT = isYouTubeUrl(url);
    setIsYouTube(isYT);

    if (isYT) {
      const videoId = getYouTubeVideoId(url);
      if (!videoId) {
        console.error('Invalid YouTube URL:', url);
        return;
      }

      setYoutubeVideoId(videoId);
      currentUrlRef.current = url;
      pendingPlayRef.current = { stageId, videoId };
      createYouTubePlayer(videoId, stageId);
    } else {
      // Regular audio file
      setYoutubeVideoId(null);
      const audio = audioRef.current;
      if (!audio) return;

      // If resuming same audio
      if (currentUrlRef.current === url && status === 'paused') {
        audio.play();
        setStatus('playing');
        return;
      }

      currentUrlRef.current = url;
      audio.src = url;
      audio.volume = volume;
      audio.play().catch(err => {
        console.error('Audio play error:', err);
      });
      setCurrentStageId(stageId);
      setStatus('playing');
    }
  }, [status, volume, stopCurrentPlayback, createYouTubePlayer]);

  const pause = useCallback(() => {
    if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setStatus('paused');
  }, [isYouTube]);

  const resume = useCallback(() => {
    if (isYouTube && ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.play();
    }
    setStatus('playing');
  }, [isYouTube]);

  const stop = useCallback(() => {
    stopCurrentPlayback();
    setStatus('idle');
    setCurrentStageId(null);
    setCurrentTime(0);
    setIsYouTube(false);
    setYoutubeVideoId(null);
    currentUrlRef.current = null;
  }, [stopCurrentPlayback]);

  const setVolume = useCallback((value: number) => {
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      ytPlayerRef.current.setVolume(value * 100);
    }
    setVolumeState(value);
  }, []);

  return {
    currentStageId,
    status,
    volume,
    currentTime,
    duration,
    isYouTube,
    youtubeVideoId,
    play,
    pause,
    resume,
    stop,
    setVolume,
  };
}
