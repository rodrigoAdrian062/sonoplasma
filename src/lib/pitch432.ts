// Frequência 432Hz — pitch-shift em tempo real preservando a velocidade.
// Fator: 432/440 = 0.98181818… (~ -31,77 cents / -0.3176 semitons).
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
// Vite serve o arquivo do processor como asset estático.
// eslint-disable-next-line import/no-unresolved
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';

export const RATIO_432 = 432 / 440;
export const STORAGE_KEY_432 = 'audio-frequency-432-v1';

const registeredContexts = new WeakSet<BaseAudioContext>();

export async function ensure432Registered(ctx: BaseAudioContext): Promise<void> {
  if (registeredContexts.has(ctx)) return;
  await SoundTouchNode.register(ctx, processorUrl);
  registeredContexts.add(ctx);
}

export function create432Node(ctx: BaseAudioContext, enabled: boolean): SoundTouchNode {
  const node = new SoundTouchNode({ context: ctx });
  node.pitch.value = enabled ? RATIO_432 : 1;
  return node;
}

export function set432Enabled(node: SoundTouchNode | null, enabled: boolean): void {
  if (!node) return;
  try {
    node.pitch.value = enabled ? RATIO_432 : 1;
  } catch { /* noop */ }
}

// -------------------- Toggle global (persistido em localStorage) --------------------
type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

export function getFrequency432(): boolean {
  try { return localStorage.getItem(STORAGE_KEY_432) === 'true'; } catch { return false; }
}

export function setFrequency432(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY_432, String(enabled)); } catch { /* noop */ }
  listeners.forEach((l) => { try { l(enabled); } catch { /* noop */ } });
}

export function subscribeFrequency432(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
