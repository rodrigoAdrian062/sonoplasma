import { describe, expect, it } from 'vitest';
import { sanitizeRitualDetails } from '@/lib/ritualDetails';

describe('ritual details formatting', () => {
  it('preserves supported formatting and safe text colors', () => {
    expect(sanitizeRitualDetails('<strong>Importante</strong> <u>ler</u> <span style="color: rgb(212, 175, 55)">em dourado</span>'))
      .toBe('<strong>Importante</strong> <u>ler</u> <span style="color: rgb(212, 175, 55)">em dourado</span>');
  });

  it('discards scripts and strips unsafe formatting attributes', () => {
    expect(sanitizeRitualDetails('<script>alert(1)</script><b onclick="alert(1)">Seguro</b><span style="color: red"> texto</span>'))
      .toBe('<b>Seguro</b> texto');
  });
});
