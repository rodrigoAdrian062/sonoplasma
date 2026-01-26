import { useEffect } from 'react';

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function useThemeColor(color: string | null | undefined) {
  useEffect(() => {
    if (!color) return;

    const hsl = hexToHsl(color);
    if (!hsl) return;

    const root = document.documentElement;
    
    // Set the gold color CSS variables
    root.style.setProperty('--gold', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty('--gold-glow', `${hsl.h} ${Math.min(hsl.s + 10, 100)}% ${Math.min(hsl.l + 10, 90)}%`);

    return () => {
      // Reset to default on unmount
      root.style.removeProperty('--gold');
      root.style.removeProperty('--gold-glow');
    };
  }, [color]);
}
