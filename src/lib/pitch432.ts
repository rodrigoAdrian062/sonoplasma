// Frequências curativas — pitch-shift em tempo real preservando a velocidade.
// Fator aplicado ao pitch: hz/440. Ex.: 432/440 = 0,98181...
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
// eslint-disable-next-line import/no-unresolved
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';

export const RATIO_432 = 432 / 440;
export const STORAGE_KEY_432 = 'audio-frequency-432-v1'; // legado
export const STORAGE_KEY_HZ = 'audio-healing-hz-v1';

export interface HealingFrequency {
  hz: number;
  label: string;
  short: string;
  desc: string;
}

// Frequências curativas selecionadas (padrão + 432 + Solfeggio).
export const HEALING_FREQUENCIES: HealingFrequency[] = [
  { hz: 440, short: 'Padrão', label: 'Padrão — 440Hz', desc: 'Afinação original, sem alteração de tom.' },
  { hz: 432, short: '432Hz', label: '432Hz — Harmonia Natural', desc: 'Ressonância com a natureza. Promove relaxamento profundo, clareza mental e equilíbrio emocional. Ideal para meditação e rituais solenes.' },
  { hz: 528, short: '528Hz', label: '528Hz — Cura & Amor (MI)', desc: 'Solfeggio da transformação e reparação celular. Associada ao amor incondicional e à regeneração.' },
  { hz: 396, short: '396Hz', label: '396Hz — Libertação (UT)', desc: 'Dissolve culpa e medo. Ajuda a libertar bloqueios emocionais e traumas antigos.' },
  { hz: 417, short: '417Hz', label: '417Hz — Renovação (RE)', desc: 'Facilita mudanças, quebra padrões negativos e reconecta ao propósito.' },
  { hz: 639, short: '639Hz', label: '639Hz — Vínculos (FA)', desc: 'Harmoniza relacionamentos, comunicação e afetos. Fortalece a fraternidade.' },
  { hz: 741, short: '741Hz', label: '741Hz — Intuição (SOL)', desc: 'Desperta a expressão pura, a intuição e a limpeza espiritual do ambiente.' },
  { hz: 852, short: '852Hz', label: '852Hz — Despertar (LA)', desc: 'Retorno à ordem espiritual. Eleva a consciência e a percepção sutil.' },
  { hz: 963, short: '963Hz', label: '963Hz — Consciência Divina', desc: 'Ativação da pineal e conexão com a Fonte/Grande Arquiteto do Universo.' },
];

const registeredContexts = new WeakSet<BaseAudioContext>();

export async function ensure432Registered(ctx: BaseAudioContext): Promise<void> {
  if (registeredContexts.has(ctx)) return;
  await SoundTouchNode.register(ctx, processorUrl);
  registeredContexts.add(ctx);
}

// -------------------- Estado global (Hz atual) --------------------
type HzListener = (hz: number) => void;
const hzListeners = new Set<HzListener>();

function readInitialHz(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HZ);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
    // Migração do toggle antigo (boolean 432Hz on/off)
    if (localStorage.getItem(STORAGE_KEY_432) === 'true') return 432;
  } catch { /* noop */ }
  return 440;
}

let currentHz = typeof window !== 'undefined' ? readInitialHz() : 440;

export function getHealingHz(): number { return currentHz; }

export function setHealingHz(hz: number): void {
  currentHz = hz;
  try {
    localStorage.setItem(STORAGE_KEY_HZ, String(hz));
    // manter compat com código legado que lê a chave antiga
    localStorage.setItem(STORAGE_KEY_432, String(hz !== 440));
  } catch { /* noop */ }
  hzListeners.forEach((l) => { try { l(hz); } catch { /* noop */ } });
}

export function subscribeHealingHz(l: HzListener): () => void {
  hzListeners.add(l);
  return () => { hzListeners.delete(l); };
}

export function getPitchRatio(): number { return currentHz / 440; }

export function getFrequencyInfo(hz = currentHz): HealingFrequency | undefined {
  return HEALING_FREQUENCIES.find((f) => f.hz === hz);
}

// -------------------- Override por faixa (URL → Hz) --------------------
export const STORAGE_KEY_TRACK_HZ = 'audio-healing-track-hz-v1';
type TrackMap = Record<string, number>;
type TrackListener = () => void;
const trackListeners = new Set<TrackListener>();

function readTrackMap(): TrackMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRACK_HZ);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return obj as TrackMap;
    }
  } catch { /* noop */ }
  return {};
}
let trackMap: TrackMap = typeof window !== 'undefined' ? readTrackMap() : {};

export function getTrackHz(url: string | null | undefined): number | null {
  if (!url) return null;
  const v = trackMap[url];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function setTrackHz(url: string, hz: number | null): void {
  if (!url) return;
  if (hz == null) delete trackMap[url];
  else trackMap[url] = hz;
  try { localStorage.setItem(STORAGE_KEY_TRACK_HZ, JSON.stringify(trackMap)); } catch { /* noop */ }
  trackListeners.forEach((l) => { try { l(); } catch { /* noop */ } });
}

export function subscribeTrackHz(cb: TrackListener): () => void {
  trackListeners.add(cb);
  return () => { trackListeners.delete(cb); };
}

export function getEffectiveHz(url?: string | null): number {
  const t = getTrackHz(url ?? null);
  return t ?? currentHz;
}

export function getEffectivePitchRatio(url?: string | null): number {
  return getEffectiveHz(url) / 440;
}

// -------------------- Node helpers --------------------
export function create432Node(ctx: BaseAudioContext, _enabled?: boolean): SoundTouchNode {
  const node = new SoundTouchNode({ context: ctx });
  node.pitch.value = getPitchRatio();
  return node;
}

export function set432Enabled(node: SoundTouchNode | null, _enabled?: boolean): void {
  if (!node) return;
  try { node.pitch.value = getPitchRatio(); } catch { /* noop */ }
}

export function applyPitchForUrl(node: SoundTouchNode | null, url?: string | null): void {
  if (!node) return;
  try { node.pitch.value = getEffectivePitchRatio(url); } catch { /* noop */ }
}

// -------------------- API legada (compat) --------------------
export function getFrequency432(): boolean { return currentHz !== 440; }

export function setFrequency432(enabled: boolean): void {
  setHealingHz(enabled ? 432 : 440);
}

// Dispara callback em qualquer mudança de Hz (contextos re-aplicam o pitch atual).
export function subscribeFrequency432(cb: (enabled: boolean) => void): () => void {
  return subscribeHealingHz((hz) => cb(hz !== 440));
}
