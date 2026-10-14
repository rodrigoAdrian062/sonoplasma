import { describe, expect, it } from 'vitest';
import { getStagePlaybackLevels, interpolateVolume } from './stageVolume';

describe('stage playback volume', () => {
  it.each([
    [0, 0],
    [5, 0.05],
    [20, 0.2],
  ])('starts at %i%% of master volume', (initialPercent, expected) => {
    expect(getStagePlaybackLevels({
      masterVolume: 1,
      initialPercent,
      rampEnabled: false,
      finalPercent: 100,
      rampSeconds: 3,
    }).initial).toBe(expected);
  });

  it('caps both levels at the stage master volume', () => {
    expect(getStagePlaybackLevels({
      masterVolume: 0.3,
      initialPercent: 5,
      rampEnabled: true,
      finalPercent: 100,
      rampSeconds: 3,
    })).toEqual({ initial: 0.015, final: 0.3, durationMs: 3000 });
  });

  it('interpolates linearly and clamps progress', () => {
    expect(interpolateVolume(0.05, 0.2, 0.5)).toBeCloseTo(0.125);
    expect(interpolateVolume(0.05, 0.2, 2)).toBe(0.2);
  });
});
