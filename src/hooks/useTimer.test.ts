import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from './useTimer';

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimer', () => {
  it('completes once at the configured deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTimer(onComplete));

    act(() => result.current.start(3));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps a one-hour countdown active until the selected hour elapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTimer(onComplete));

    act(() => result.current.start(60 * 60));
    act(() => vi.advanceTimersByTime(59 * 60 * 1000));

    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(60 * 1000));

    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('preserves the remaining time while paused and resumes the countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTimer(onComplete));

    act(() => result.current.start(5));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.pause());
    expect(result.current.timeRemaining).toBe(3);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.timeRemaining).toBe(3);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.timeRemaining).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restarts the deadline when the user changes the timer while playing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTimer(onComplete));

    act(() => result.current.start(5));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.setTime(4));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.timeRemaining).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
