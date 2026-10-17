export interface HarmonyTrack {
  id: string;
  audioId: string;
  nome: string;
  audioUrl: string;
  duration: number;
  start: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  pan?: number;
  bass?: number;
  mid?: number;
  treble?: number;
  reverb?: number;
}

export interface HarmonyMixSettings {
  volume: number;
  pan: number;
  bass: number;
  mid: number;
  treble: number;
  reverb: number;
}

export interface HarmonyMixPreset {
  id: string;
  name: string;
  settings: HarmonyMixSettings;
}

export interface HarmonyProject {
  name: string;
  tracks: HarmonyTrack[];
  version?: number;
  presets?: HarmonyMixPreset[];
}

export const HARMONY_STORAGE_KEY = 'sonoplastia:harmony-project';
export const HARMONY_CLOUD_KEY = 'harmonyProject';

export const DEFAULT_HARMONY_PRESETS: HarmonyMixPreset[] = [
  {
    id: 'balanced',
    name: 'Equilibrado',
    settings: { volume: 0.8, pan: 0, bass: 0, mid: 0, treble: 0, reverb: 0 },
  },
  {
    id: 'soft-space',
    name: 'Ambiente suave',
    settings: { volume: 0.75, pan: 0, bass: 0, mid: -1, treble: -2, reverb: 0.25 },
  },
  {
    id: 'clear-presence',
    name: 'Presença',
    settings: { volume: 0.8, pan: 0, bass: -1, mid: 2, treble: 1, reverb: 0.05 },
  },
];

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Math.max(min, Math.min(max, finiteOr(value, fallback)));
}

export function normalizeHarmonyMixSettings(
  settings: Partial<HarmonyMixSettings> | null | undefined,
): HarmonyMixSettings {
  return {
    volume: clamp(settings?.volume ?? 0.8, 0, 1, 0.8),
    pan: clamp(settings?.pan ?? 0, -1, 1, 0),
    bass: clamp(settings?.bass ?? 0, -12, 12, 0),
    mid: clamp(settings?.mid ?? 0, -12, 12, 0),
    treble: clamp(settings?.treble ?? 0, -12, 12, 0),
    reverb: clamp(settings?.reverb ?? 0, 0, 1, 0),
  };
}

export function normalizeHarmonyMixPreset(value: unknown): HarmonyMixPreset | null {
  if (!value || typeof value !== 'object') return null;
  const preset = value as Partial<HarmonyMixPreset>;
  if (
    typeof preset.id !== 'string' ||
    !preset.id ||
    typeof preset.name !== 'string' ||
    !preset.name.trim() ||
    !preset.settings ||
    typeof preset.settings !== 'object'
  ) return null;

  return {
    id: preset.id,
    name: preset.name.trim(),
    settings: normalizeHarmonyMixSettings(preset.settings),
  };
}

export function normalizeHarmonyTrack(value: HarmonyTrack | null | undefined): HarmonyTrack | null {
  if (!value || typeof value !== 'object') return null;
  const track = value;
  if (typeof track.id !== 'string' || typeof track.audioUrl !== 'string' || !track.audioUrl) return null;
  const duration = finiteOr(track.duration, 0);
  if (duration <= 0) return null;

  const trimStart = Math.max(0, Math.min(duration, finiteOr(track.trimStart, 0)));
  const trimEnd = Math.max(trimStart, Math.min(duration, finiteOr(track.trimEnd, duration)));
  if (trimEnd - trimStart < 0.01) return null;

  return {
    ...track,
    nome: typeof track.nome === 'string' && track.nome ? track.nome : 'Áudio',
    start: Math.max(0, finiteOr(track.start, 0)),
    duration,
    trimStart,
    trimEnd,
    volume: Math.max(0, Math.min(1, finiteOr(track.volume, 0.8))),
    fadeIn: Math.max(0, Math.min(trimEnd - trimStart, finiteOr(track.fadeIn, 0))),
    fadeOut: Math.max(0, Math.min(trimEnd - trimStart, finiteOr(track.fadeOut, 0))),
    muted: Boolean(track.muted),
    ...normalizeHarmonyMixSettings(track),
  };
}

export function getTrackDuration(track: HarmonyTrack): number {
  const duration = track.trimEnd - track.trimStart;
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

export function getProjectDuration(tracks: HarmonyTrack[]): number {
  return tracks.reduce(
    (max, track) => {
      const end = track.start + getTrackDuration(track);
      return Number.isFinite(end) ? Math.max(max, end) : max;
    },
    0,
  );
}

export function appendHarmonyTrack(tracks: HarmonyTrack[], track: HarmonyTrack): HarmonyTrack[] {
  return [...tracks, { ...track, start: getProjectDuration(tracks) }];
}

export function normalizeHarmonyProject(project: HarmonyProject): HarmonyProject {
  const tracks = [...project.tracks]
    .map(normalizeHarmonyTrack)
    .filter((track): track is HarmonyTrack => track !== null);
  const presets = Array.isArray(project.presets)
    ? project.presets
      .map(normalizeHarmonyMixPreset)
      .filter((preset): preset is HarmonyMixPreset => preset !== null)
      .slice(0, 30)
    : [];

  if (project.version && project.version >= 3) {
    return { ...project, tracks, presets, version: 3 };
  }

  let position = 0;
  tracks.sort((a, b) => a.start - b.start);
  for (const track of tracks) {
    track.start = position;
    position += getTrackDuration(track);
  }

  return { ...project, tracks, presets, version: 3 };
}

export function trimHarmonyTrack(
  tracks: HarmonyTrack[],
  trackId: string,
  trimStart: number,
  trimEnd: number,
): HarmonyTrack[] {
  const safeTracks = tracks
    .map(normalizeHarmonyTrack)
    .filter((track): track is HarmonyTrack => track !== null);
  const index = safeTracks.findIndex((track) => track.id === trackId);
  if (index < 0) return safeTracks;
  const current = safeTracks[index];
  const safeTrimStart = Math.max(0, Math.min(current.duration, finiteOr(trimStart, current.trimStart)));
  const safeTrimEnd = Math.max(safeTrimStart, Math.min(current.duration, finiteOr(trimEnd, current.trimEnd)));
  const nextDuration = Math.max(0, safeTrimEnd - safeTrimStart);
  const durationDelta = nextDuration - getTrackDuration(current);
  return safeTracks.map((track, trackIndex) => {
    if (trackIndex === index) return normalizeHarmonyTrack({
      ...track,
      trimStart: safeTrimStart,
      trimEnd: safeTrimEnd,
    }) ?? track;
    if (trackIndex > index) return {
      ...track,
      start: Math.max(0, finiteOr(track.start, 0) + durationDelta),
    };
    return track;
  });
}

export function splitHarmonyTrack(
  tracks: HarmonyTrack[],
  trackId: string,
  splitAt: number,
  newTrackId: string,
): HarmonyTrack[] {
  const safeTracks = tracks
    .map(normalizeHarmonyTrack)
    .filter((track): track is HarmonyTrack => track !== null);
  const index = safeTracks.findIndex((track) => track.id === trackId);
  if (index < 0 || !newTrackId || safeTracks.some((track) => track.id === newTrackId)) return safeTracks;

  const track = safeTracks[index];
  const safeSplitAt = finiteOr(splitAt, track.trimStart);
  const elapsed = safeSplitAt - track.trimStart;
  const duration = getTrackDuration(track);
  if (elapsed < 0.25 || duration - elapsed < 0.25) return safeTracks;

  const first = normalizeHarmonyTrack({
    ...track,
    trimEnd: safeSplitAt,
    fadeOut: 0,
  });
  const second = normalizeHarmonyTrack({
    ...track,
    id: newTrackId,
    start: track.start + elapsed,
    trimStart: safeSplitAt,
    fadeIn: 0,
  });
  if (!first || !second) return safeTracks;

  return [
    ...safeTracks.slice(0, index),
    first,
    second,
    ...safeTracks.slice(index + 1),
  ];
}

export function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const bytesPerSample = 2;
  const dataSize = frameCount * channels * bytesPerSample;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([wav], { type: 'audio/wav' });
}
