import { describe, expect, it } from 'vitest';
import { isSpotifyPlaybackEnded } from './spotifyIframePlayer';

describe('isSpotifyPlaybackEnded', () => {
  it('recognizes a paused track at its end', () => {
    expect(isSpotifyPlaybackEnded({ isPaused: true, position: 119_500, duration: 120_000 })).toBe(true);
  });

  it('does not treat a manually paused track as ended before the final second', () => {
    expect(isSpotifyPlaybackEnded({ isPaused: true, position: 118_000, duration: 120_000 })).toBe(false);
  });

  it('does not treat a playing track near its end as ended', () => {
    expect(isSpotifyPlaybackEnded({ isPaused: false, position: 119_500, duration: 120_000 })).toBe(false);
  });

  it('ignores missing or invalid duration data', () => {
    expect(isSpotifyPlaybackEnded({ isPaused: true, position: 0, duration: 0 })).toBe(false);
    expect(isSpotifyPlaybackEnded({ isPaused: true, position: 119_500 })).toBe(false);
  });
});
