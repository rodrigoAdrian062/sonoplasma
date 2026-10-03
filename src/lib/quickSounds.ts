// Estado compartilhado dos Sons Rápidos (soundboard).
// Permite adicionar faixas de qualquer biblioteca (arquivo, YouTube ou Spotify)
// sem depender do painel estar montado na tela.

import { detectStream } from '@/lib/embedUrl';
import { saveCloudState } from '@/lib/cloudState';

export const QUICK_SOUNDS_STORAGE_KEY = 'sonoplastia:quickSounds';
export const QUICK_SOUNDS_CLOUD_KEY = 'quickSounds';
export const QUICK_SOUNDS_HORIZONTAL_STORAGE_KEY = 'sonoplastia:quickSoundsHorizontal';
export const QUICK_SOUNDS_HORIZONTAL_CLOUD_KEY = 'quickSoundsHorizontal';
export const QUICK_SOUNDS_MAX = 20;

export type QuickSoundCollection = 'vertical' | 'horizontal';

function getStorageKey(collection: QuickSoundCollection): string {
  return collection === 'horizontal'
    ? QUICK_SOUNDS_HORIZONTAL_STORAGE_KEY
    : QUICK_SOUNDS_STORAGE_KEY;
}

function getCloudKey(collection: QuickSoundCollection): string {
  return collection === 'horizontal'
    ? QUICK_SOUNDS_HORIZONTAL_CLOUD_KEY
    : QUICK_SOUNDS_CLOUD_KEY;
}

export type QuickSoundKind = 'file' | 'youtube' | 'spotify';

export interface QuickSoundData {
  id: string;
  nome: string;
  url: string;
  loop?: boolean;
  fadeStop?: boolean;
  trimStartSeconds?: number;
  trimEndSeconds?: number;
  kind?: QuickSoundKind;
}

export function quickSoundKind(url: string): QuickSoundKind {
  const stream = detectStream(url || '');
  return stream === 'youtube' ? 'youtube' : stream === 'spotify' ? 'spotify' : 'file';
}

export function loadQuickSounds(collection: QuickSoundCollection = 'vertical'): QuickSoundData[] {
  try {
    const raw = localStorage.getItem(getStorageKey(collection));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, QUICK_SOUNDS_MAX) : [];
  } catch {
    return [];
  }
}

export function persistQuickSounds(
  sounds: QuickSoundData[],
  collection: QuickSoundCollection = 'vertical',
) {
  localStorage.setItem(getStorageKey(collection), JSON.stringify(sounds));
  void saveCloudState(getCloudKey(collection), sounds);
  window.dispatchEvent(new Event('sonoplastia:quickSoundsUpdated'));
}

export type AddQuickSoundResult = {
  ok: boolean;
  reason?: 'limit' | 'duplicate' | 'invalid';
};


/** Adiciona um áudio (arquivo, YouTube ou Spotify) aos sons rápidos. */
export function addQuickSound(
  nome: string,
  url: string,
  collection: QuickSoundCollection = 'vertical',
): AddQuickSoundResult {
  const clean = (url || '').trim();
  if (!clean) return { ok: false, reason: 'invalid' };

  const current = loadQuickSounds(collection);
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
  persistQuickSounds(next, collection);
  return { ok: true };
}

/** Cria ou atualiza o atalho e salva seu trecho de reprodução sem alterar o áudio original. */
export function saveQuickSoundTrim(
  nome: string,
  url: string,
  trimStartSeconds?: number,
  trimEndSeconds?: number,
  collection: QuickSoundCollection = 'vertical',
): AddQuickSoundResult {
  const clean = (url || '').trim();
  if (!clean) return { ok: false, reason: 'invalid' };

  const current = loadQuickSounds(collection);
  const existingIndex = current.findIndex((sound) => sound.url === clean);
  if (existingIndex < 0 && current.length >= QUICK_SOUNDS_MAX) {
    return { ok: false, reason: 'limit' };
  }

  const next = [...current];
  if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      trimStartSeconds,
      trimEndSeconds,
    };
  } else {
    next.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome,
      url: clean,
      kind: quickSoundKind(clean),
      trimStartSeconds,
      trimEndSeconds,
      loop: false,
    });
  }

  persistQuickSounds(next, collection);
  return { ok: true };
}
