import { describe, expect, it } from 'vitest';
import { sanitizeRitualDetails } from './ritualDetails';

describe('ritual detail harmony markers', () => {
  it('preserves safe inline harmony markers across sanitization', () => {
    const safeHtml = sanitizeRitualDetails(
      '<p>Durante a <span data-ritual-harmony="https://example.com/audio.mp3" data-ritual-harmony-name="Abertura" onclick="alert(1)">A</span> cerimônia</p>',
    );

    expect(safeHtml).toContain('data-ritual-harmony="https://example.com/audio.mp3"');
    expect(safeHtml).toContain('data-ritual-harmony-name="Abertura"');
    expect(safeHtml).toContain('class="ritual-harmony-marker"');
    expect(safeHtml).not.toContain('onclick');
    expect(safeHtml).toContain('▶');
  });

  it('preserves a custom button label and marker identity safely', () => {
    const safeHtml = sanitizeRitualDetails(
      '<span data-ritual-harmony="https://example.com/audio.mp3" data-ritual-harmony-name="Abertura" data-ritual-harmony-label="Marcha &amp; luz" data-ritual-harmony-id="marker-1">ignored</span>',
    );

    expect(safeHtml).toContain('data-ritual-harmony-label="Marcha &amp; luz"');
    expect(safeHtml).toContain('data-ritual-harmony-id="marker-1"');
    expect(safeHtml).toContain('Marcha &amp; luz ▶');
  });

  it('limits custom button labels to 40 characters', () => {
    const safeHtml = sanitizeRitualDetails(
      `<span data-ritual-harmony="https://example.com/audio.mp3" data-ritual-harmony-label="${'x'.repeat(50)}"></span>`,
    );

    expect(safeHtml).toContain(`data-ritual-harmony-label="${'x'.repeat(40)}"`);
    expect(safeHtml).not.toContain('x'.repeat(41));
  });

  it('does not retain unsafe harmony URLs as playable markers', () => {
    const safeHtml = sanitizeRitualDetails(
      '<span data-ritual-harmony="javascript:alert(1)" data-ritual-harmony-name="Inseguro">texto</span>',
    );

    expect(safeHtml).not.toContain('data-ritual-harmony=');
    expect(safeHtml).not.toContain('ritual-harmony-marker');
    expect(safeHtml).toContain('texto');
  });
});
