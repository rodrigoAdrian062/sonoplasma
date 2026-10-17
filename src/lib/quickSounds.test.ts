import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cloudState', () => ({
  saveCloudState: vi.fn(),
  loadCloudState: vi.fn().mockResolvedValue(null),
}));

import {
  addQuickSound,
  copyQuickSoundToSection,
  loadQuickSounds,
  persistQuickSounds,
  saveQuickSoundTrim,
} from './quickSounds';

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

  it('keeps horizontal and vertical quick-sound lists independent', () => {
    addQuickSound('Vertical', 'https://example.com/vertical.mp3');
    addQuickSound('Horizontal', 'https://example.com/horizontal.mp3', 'horizontal');

    expect(loadQuickSounds()).toMatchObject([{ nome: 'Vertical' }]);
    expect(loadQuickSounds('horizontal')).toMatchObject([{ nome: 'Horizontal' }]);
  });

  it('keeps each section quick-sound list independent', () => {
    addQuickSound('Seção A', 'https://example.com/a.mp3', 'vertical', 'section-a');
    addQuickSound('Seção B', 'https://example.com/b.mp3', 'vertical', 'section-b');

    expect(loadQuickSounds('vertical', 'section-a')).toMatchObject([{ nome: 'Seção A' }]);
    expect(loadQuickSounds('vertical', 'section-b')).toMatchObject([{ nome: 'Seção B' }]);
    expect(loadQuickSounds()).toEqual([]);
  });

  it('copies a quick sound to another section with its settings intact', async () => {
    addQuickSound('Sino', 'https://example.com/sino.mp3', 'vertical', 'section-a');
    const [source] = loadQuickSounds('vertical', 'section-a');
    persistQuickSounds([{ ...source, loop: true, color: '#D4AF37' }], 'vertical', 'section-a');
    const [configuredSource] = loadQuickSounds('vertical', 'section-a');

    const result = await copyQuickSoundToSection(configuredSource, 'section-b');

    expect(result).toEqual({ ok: true });
    expect(loadQuickSounds('vertical', 'section-b')).toMatchObject([
      { nome: 'Sino', url: configuredSource.url, loop: true, color: '#D4AF37' },
    ]);
    expect(loadQuickSounds('vertical', 'section-b')[0].id).not.toBe(configuredSource.id);
    expect(loadQuickSounds('vertical', 'section-a')).toHaveLength(1);
  });

  it('persists a custom color for a quick sound', () => {
    persistQuickSounds([
      {
        id: 'color-test',
        nome: 'Sino',
        url: 'https://example.com/sino.mp3',
        color: '#4169E1',
      },
    ]);

    expect(loadQuickSounds()).toMatchObject([{ id: 'color-test', color: '#4169E1' }]);
  });
});
