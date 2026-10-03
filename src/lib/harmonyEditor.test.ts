import { describe, expect, it } from 'vitest';
import {
  appendHarmonyTrack, encodeWav, formatTime, getProjectDuration, getTrackDuration,
  normalizeHarmonyProject, normalizeHarmonyTrack, trimHarmonyTrack, type HarmonyTrack,
} from './harmonyEditor';

const track: HarmonyTrack = {
  id: 'track-1',
  audioId: 'audio-1',
  nome: 'Faixa',
  audioUrl: 'https://example.com/audio.mp3',
  duration: 30,
  start: 12,
  trimStart: 4,
  trimEnd: 24,
  volume: 0.8,
  fadeIn: 0,
  fadeOut: 0,
  muted: false,
};

describe('harmony editor timeline', () => {
  it('calculates the trimmed clip and total arrangement durations', () => {
    expect(getTrackDuration(track)).toBe(20);
    expect(getProjectDuration([track, { ...track, id: 'track-2', start: 35 }])).toBe(55);
  });

  it('migrates version two projects that had overlapping clips to one sequence', () => {
    const migrated = normalizeHarmonyProject({
      name: 'Anterior',
      version: 2,
      tracks: [
        { ...track, start: 0 },
        { ...track, id: 'track-2', start: 0 },
      ],
    });

    expect(migrated.tracks.map((item) => item.start)).toEqual([0, 20]);
    expect(migrated.version).toBe(3);
  });

  it('repairs non-finite timing and gain values in saved projects', () => {
    const normalized = normalizeHarmonyProject({
      name: 'Projeto danificado',
      version: 3,
      tracks: [{
        ...track,
        start: Number.NaN,
        duration: 30,
        trimStart: Number.NaN,
        trimEnd: Number.POSITIVE_INFINITY,
        volume: Number.NaN,
      }, { ...track, id: 'bad-duration', duration: Number.NaN }],
    });

    expect(normalized.tracks[0]).toMatchObject({
      start: 0,
      duration: 30,
      trimStart: 0,
      trimEnd: 30,
      volume: 0.8,
    });
    expect(normalized.tracks).toHaveLength(1);
    expect(getProjectDuration(normalized.tracks)).toBe(30);
    expect(normalizeHarmonyTrack(null)).toBeNull();
  });

  it('appends a new audio clip to the end of the same timeline lane', () => {
    const first = { ...track, start: 0 };
    const second = appendHarmonyTrack([first], { ...track, id: 'track-2', start: 0 });

    expect(second[1].start).toBe(20);
    expect(getProjectDuration(second)).toBe(40);
  });

  it('migrates an older multitrack project into one sequential lane', () => {
    const migrated = normalizeHarmonyProject({
      name: 'Legado',
      tracks: [
        { ...track, start: 0 },
        { ...track, id: 'track-2', start: 0 },
      ],
    });

    expect(migrated.version).toBe(3);
    expect(migrated.tracks.map((item) => item.start)).toEqual([0, 20]);
  });

  it('ripples following clips when a clip is shortened', () => {
    const first = { ...track, start: 0 };
    const second = { ...track, id: 'track-2', start: 20 };

    const trimmed = trimHarmonyTrack([first, second], first.id, 4, 14);

    expect(trimmed[0].trimEnd).toBe(14);
    expect(trimmed[1].start).toBe(10);
    expect(getProjectDuration(trimmed)).toBe(30);
  });

  it('formats the timeline clock as minutes and seconds', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(125.9)).toBe('02:05');
  });

  it('encodes a rendered buffer as a stereo-compatible PCM WAV file', async () => {
    const audioBuffer = {
      numberOfChannels: 1,
      sampleRate: 8000,
      length: 2,
      getChannelData: () => new Float32Array([0, 0.5]),
    } as AudioBuffer;

    const wav = encodeWav(audioBuffer);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('WAV blob did not produce an ArrayBuffer'));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(wav);
    });
    const view = new DataView(bytes);

    expect(wav.type).toBe('audio/wav');
    expect(view.getUint32(40, true)).toBe(4);
    expect(view.getInt16(46, true)).toBeGreaterThan(0);
  });
});
