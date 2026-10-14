export const DEFAULT_STAGE_TIMER_SECONDS = 300;
export const MIN_STAGE_TIMER_SECONDS = 60;
export const MAX_STAGE_TIMER_SECONDS = 180 * 60;

export interface StageTimerPreferences {
  seconds: number;
  enabled: boolean;
}

export function readStageTimerPreferences(stageId: string, stageDefaultSeconds: number | null | undefined): StageTimerPreferences {
  const hasScheduledDuration = typeof stageDefaultSeconds === 'number' && stageDefaultSeconds > 0;
  const defaultSeconds = hasScheduledDuration ? stageDefaultSeconds : DEFAULT_STAGE_TIMER_SECONDS;
  let seconds = defaultSeconds;
  let enabled = hasScheduledDuration;

  try {
    const storedSecondsValue = localStorage.getItem(`stage:timerSeconds:${stageId}`);
    const storedSeconds = storedSecondsValue === null ? NaN : Number(storedSecondsValue);
    if (
      Number.isFinite(storedSeconds) &&
      storedSeconds >= MIN_STAGE_TIMER_SECONDS &&
      storedSeconds <= MAX_STAGE_TIMER_SECONDS
    ) {
      seconds = storedSeconds;
    }
    const storedEnabled = localStorage.getItem(`stage:timerEnabled:${stageId}`);
    const wasExplicitlySet = localStorage.getItem(`stage:timerEnabledExplicit:${stageId}`) === '1';
    if (wasExplicitlySet && storedEnabled !== null) {
      enabled = storedEnabled === '1';
    } else if (storedEnabled === '0') {
      enabled = false;
    }
  } catch {
    return { seconds, enabled };
  }

  return { seconds, enabled };
}

export function saveStageTimerSeconds(stageId: string, seconds: number): void {
  localStorage.setItem(`stage:timerSeconds:${stageId}`, String(seconds));
}

export function saveStageTimerEnabled(stageId: string, enabled: boolean): void {
  localStorage.setItem(`stage:timerEnabled:${stageId}`, enabled ? '1' : '0');
  localStorage.setItem(`stage:timerEnabledExplicit:${stageId}`, '1');
}
