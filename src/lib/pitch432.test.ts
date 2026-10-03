import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@soundtouchjs/audio-worklet', () => ({
  SoundTouchNode: class {
    pitch = { value: 1 };
    static async register() {}
  },
}));

import {
  getEffectiveHz,
  getHealingHz,
  HEALING_FREQUENCIES,
  setHealingHz,
  STORAGE_KEY_432,
  STORAGE_KEY_HZ,
} from './pitch432';

describe('healing audio frequency selection', () => {
  beforeEach(() => {
    localStorage.clear();
    setHealingHz(440);
  });

  it('keeps each selected frequency instead of replacing it with the legacy 432Hz toggle', () => {
    for (const frequency of HEALING_FREQUENCIES) {
      setHealingHz(frequency.hz);

      expect(getHealingHz()).toBe(frequency.hz);
      expect(getEffectiveHz()).toBe(frequency.hz);
      expect(localStorage.getItem(STORAGE_KEY_HZ)).toBe(String(frequency.hz));
      expect(localStorage.getItem(STORAGE_KEY_432)).toBe(String(frequency.hz !== 440));
    }
  });
});
