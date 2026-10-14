import { afterEach, describe, expect, it, vi } from 'vitest';
import { VolumeRampController } from './volumeRamp';

describe('VolumeRampController', () => {
  afterEach(() => vi.useRealTimers());

  it('ramps continuously to its target over the configured duration', () => {
    vi.useFakeTimers();
    const applyVolume = vi.fn();
    const ramp = new VolumeRampController(applyVolume);

    ramp.start(0.05, 0.2, 3000);
    vi.advanceTimersByTime(1500);
    expect(applyVolume).toHaveBeenLastCalledWith(expect.closeTo(0.125));
    vi.advanceTimersByTime(1500);
    expect(applyVolume).toHaveBeenLastCalledWith(0.2);
    ramp.cancel();
  });

  it('holds volume while paused and continues the remaining duration after resume', () => {
    vi.useFakeTimers();
    const applyVolume = vi.fn();
    const ramp = new VolumeRampController(applyVolume);

    ramp.start(0.05, 0.2, 3000);
    vi.advanceTimersByTime(1000);
    expect(ramp.pause()).toBe(true);
    const pausedVolume = applyVolume.mock.lastCall?.[0];
    vi.advanceTimersByTime(5000);
    expect(applyVolume).toHaveBeenLastCalledWith(pausedVolume);

    ramp.resume();
    vi.advanceTimersByTime(2000);
    expect(applyVolume).toHaveBeenLastCalledWith(0.2);
    ramp.cancel();
  });

  it('cancels the old transition when a new ramp starts', () => {
    vi.useFakeTimers();
    const applyVolume = vi.fn();
    const ramp = new VolumeRampController(applyVolume);

    ramp.start(0.05, 0.2, 3000);
    vi.advanceTimersByTime(500);
    ramp.start(0.1, 0.3, 1000);
    applyVolume.mockClear();
    vi.advanceTimersByTime(1000);

    expect(applyVolume).toHaveBeenLastCalledWith(0.3);
    expect(applyVolume).toHaveBeenCalledTimes(20);
    ramp.cancel();
  });
});
