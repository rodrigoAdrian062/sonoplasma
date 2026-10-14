export const STAGE_RAMP_DURATIONS = [1, 2, 3, 5, 10, 15, 30] as const;

export interface StageVolumeSettings {
  initialPercent: number;
  rampEnabled: boolean;
  finalPercent: number;
  rampSeconds: number;
}

export interface StagePlaybackVolume extends StageVolumeSettings {
  masterVolume: number;
}

export const DEFAULT_STAGE_VOLUME_SETTINGS: StageVolumeSettings = {
  initialPercent: 100,
  rampEnabled: false,
  finalPercent: 100,
  rampSeconds: 3,
};

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getStagePlaybackLevels(settings: StagePlaybackVolume) {
  const master = Math.min(1, Math.max(0, settings.masterVolume));
  const initialPercent = clampPercent(settings.initialPercent);
  const finalPercent = Math.max(initialPercent, clampPercent(settings.finalPercent));

  return {
    initial: master * initialPercent / 100,
    final: master * finalPercent / 100,
    durationMs: Math.max(1, settings.rampSeconds) * 1000,
  };
}

export function interpolateVolume(from: number, to: number, progress: number): number {
  const boundedProgress = Math.min(1, Math.max(0, progress));
  return from + (to - from) * boundedProgress;
}
