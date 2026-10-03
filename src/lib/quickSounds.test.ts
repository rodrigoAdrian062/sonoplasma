import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cloudState', () => ({
  saveCloudState: vi.fn(),
}));

import { addQuickSound, loadQuickSounds, persistQuickSounds, saveQuickSoundTrim } from './quickSounds';

describe('quick sound trim persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds an audio to quick sounds with its selected trim range', () => {
    const result = saveQuickSoundTrim('Efeito', 'https://example.com/efeito.mp3', 2.5, 6.5);

    expect(result).toEqual({ ok: true });
    expect(loadQuickSounds()).toMatchObject([
      {
        nome: 'Efeito',
        url: 'https://example.com/efeito.mp3',
        trimStartSeconds: 2.5,
        trimEndSeconds: 6.5,
      },
    ]);
  });

  it('updates an existing quick sound without replacing its other settings', () => {
    addQuickSound('Efeito', 'https://example.com/efeito.mp3');
    const [quickSound] = loadQuickSounds();
    persistQuickSounds([{ ...quickSound, loop: true, fadeStop: true }]);

    saveQuickSoundTrim('Efeito alterado', quickSound.url, 1, 4);

    expect(loadQuickSounds()[0]).toMatchObject({
      id: quickSound.id,
      nome: 'Efeito',
      loop: true,
      fadeStop: true,
      trimStartSeconds: 1,
      trimEndSeconds: 4,
    });
  });

  it('does not add a new quick sound when the 20-slot limit is reached', () => {
    persistQuickSounds(Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      nome: `Efeito ${index}`,
      url: `https://example.com/${index}.mp3`,
    })));

    const result = saveQuickSoundTrim('Extra', 'https://example.com/extra.mp3', 1, 2);

    expect(result).toEqual({ ok: false, reason: 'limit' });
    expect(loadQuickSounds()).toHaveLength(20);
  });
});
