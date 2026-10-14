import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setTime: (seconds: number) => void;
}

export function useTimer(onComplete?: () => void): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completionHandledRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    intervalRef.current = setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining > 0 || completionHandledRef.current) return;

      completionHandledRef.current = true;
      deadlineRef.current = null;
      setIsRunning(false);
      setIsPaused(false);
      onCompleteRef.current?.();
    }, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused]);

  const start = useCallback((seconds: number) => {
    const duration = Math.max(0, Math.ceil(seconds));
    completionHandledRef.current = false;
    deadlineRef.current = duration > 0 ? Date.now() + duration * 1000 : null;
    setTimeRemaining(duration);
    setIsRunning(duration > 0);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (!deadlineRef.current) return;
    const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
    deadlineRef.current = null;
    setTimeRemaining(remaining);
    if (remaining === 0) {
      completionHandledRef.current = true;
      setIsRunning(false);
      setIsPaused(false);
      onCompleteRef.current?.();
      return;
    }
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setTimeRemaining((remaining) => {
      if (remaining > 0) deadlineRef.current = Date.now() + remaining * 1000;
      return remaining;
    });
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    completionHandledRef.current = false;
    setTimeRemaining(0);
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setTime = useCallback((seconds: number) => {
    const duration = Math.max(0, Math.ceil(seconds));
    setTimeRemaining(duration);
    if (isRunning && !isPaused) {
      deadlineRef.current = duration > 0 ? Date.now() + duration * 1000 : null;
      if (duration === 0) setIsRunning(false);
    }
  }, [isRunning, isPaused]);

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    setTime,
  };
}
