// Estado compartilhado dos Sons Rápidos (soundboard).
// Permite adicionar faixas de qualquer biblioteca (arquivo, YouTube ou Spotify)
// sem depender do painel estar montado na tela.

import { detectStream } from '@/lib/embedUrl';
import { saveCloudState } from '@/lib/cloudState';

export const QUICK_SOUNDS_STORAGE_KEY = 'sonoplastia:quickSounds';
export const QUICK_SOUNDS_CLOUD_KEY = 'quickSounds';
export const QUICK_SOUNDS_MAX = 20;

export type QuickSoundKind = 'file' | 'youtube' | 'spotify';

export interface QuickSoundData {
  id: string;
  nome: string;
  url: string;
  loop?: boolean;
  fadeStop?: boolean;
  kind?: QuickSoundKind;
}

export function quickSoundKind(url: string): QuickSoundKind {
  const stream = detectStream(url || '');
  return stream === 'youtube' ? 'youtube' : stream === 'spotify' ? 'spotify' : 'file';
}

export function loadQuickSounds(): QuickSoundData[] {
  try {
    const raw = localStorage.getItem(QUICK_SOUNDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, QUICK_SOUNDS_MAX) : [];
  } catch {
    return [];
  }
}

export function persistQuickSounds(sounds: QuickSoundData[]) {
  localStorage.setItem(QUICK_SOUNDS_STORAGE_KEY, JSON.stringify(sounds));
  void saveCloudState(QUICK_SOUNDS_CLOUD_KEY, sounds);
  window.dispatchEvent(new Event('sonoplastia:quickSoundsUpdated'));
}

export type AddQuickSoundResult =
  | { ok: true }
  | { ok: false; reason: 'limit' | 'duplicate' | 'invalid' };

/** Adiciona um áudio (arquivo, YouTube ou Spotify) aos sons rápidos. */
export function addQuickSound(nome: string, url: string): AddQuickSoundResult {
  const clean = (url || '').trim();
  if (!clean) return { ok: false, reason: 'invalid' };

  const current = loadQuickSounds();
  if (current.length >= QUICK_SOUNDS_MAX) return { ok: false, reason: 'limit' };
  if (current.some((s) => s.url === clean)) return { ok: false, reason: 'duplicate' };

  const next: QuickSoundData[] = [
    ...current,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome,
      url: clean,
      loop: false,
      kind: quickSoundKind(clean),
    },
  ];
  persistQuickSounds(next);
  return { ok: true };
}
