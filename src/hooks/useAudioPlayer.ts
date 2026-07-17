import { useState, useRef, useEffect, useCallback } from 'react';
import { PlaybackStatus } from '@/types/ceremony';

interface UseAudioPlayerReturn {
  currentStageId: string | null;
  status: PlaybackStatus;
  volume: number;
  currentTime: number;
  duration: number;
  play: (stageId: string, url: string) => void;
  pause: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const play = useCallback((stageId: string, url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Se já está tocando outro áudio, para primeiro
    if (currentStageId && currentStageId !== stageId) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Se é o mesmo áudio pausado, apenas continua
    if (currentStageId === stageId && status === 'paused') {
      audio.play().catch(() => setStatus('paused'));
      setStatus('playing');
      return;
    }

    // Novo áudio
    audio.src = url;
    audio.volume = volume;
    audio.play().catch(() => setStatus('idle'));
    setCurrentStageId(stageId);
    setStatus('playing');
  }, [currentStageId, status, volume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setStatus('paused');
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setStatus('idle');
    setCurrentStageId(null);
    setCurrentTime(0);
  }, []);

  const setVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = value;
    }
    setVolumeState(value);
  }, []);

  return {
    currentStageId,
    status,
    volume,
    currentTime,
    duration,
    play,
    pause,
    stop,
    setVolume,
  };
}
