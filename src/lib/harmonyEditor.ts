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
}

export interface HarmonyProject {
  name: string;
  tracks: HarmonyTrack[];
  version?: number;
}

export const HARMONY_STORAGE_KEY = 'sonoplastia:harmony-project';
export const HARMONY_CLOUD_KEY = 'harmonyProject';

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
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

  if (project.version && project.version >= 3) {
    return { ...project, tracks, version: 3 };
  }

  let position = 0;
  tracks.sort((a, b) => a.start - b.start);
  for (const track of tracks) {
    track.start = position;
    position += getTrackDuration(track);
  }

  return { ...project, tracks, version: 3 };
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
