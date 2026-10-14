import { beforeEach, describe, expect, it } from 'vitest';
import {
  readStageTimerPreferences,
  saveStageTimerEnabled,
  saveStageTimerSeconds,
} from './stageTimer';

describe('stage timer preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the stage schedule and leaves a free stage without a countdown', () => {
    expect(readStageTimerPreferences('scheduled', 180)).toEqual({ seconds: 180, enabled: true });
    expect(readStageTimerPreferences('free', 0)).toEqual({ seconds: 300, enabled: false });
  });

  it('restores user-selected duration and enabled state by stage', () => {
    saveStageTimerSeconds('stage-a', 420);
    saveStageTimerEnabled('stage-a', true);

    expect(readStageTimerPreferences('stage-a', 180)).toEqual({ seconds: 420, enabled: true });
    expect(readStageTimerPreferences('stage-b', 180)).toEqual({ seconds: 180, enabled: true });
  });

  it('keeps free stages timer-free unless the user explicitly enables the timer', () => {
    localStorage.setItem('stage:timerEnabled:free', '1');
    expect(readStageTimerPreferences('free', 0).enabled).toBe(false);

    saveStageTimerEnabled('free', true);
    expect(readStageTimerPreferences('free', 0).enabled).toBe(true);
  });
});
