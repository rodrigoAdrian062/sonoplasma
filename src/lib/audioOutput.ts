/**
 * Gerenciamento centralizado do dispositivo de saída de áudio.
 *
 * - Usa a API HTMLMediaElement.setSinkId (Chrome/Edge/Opera desktop e Android).
 * - "default" = segue o dispositivo padrão do sistema operacional (automático).
 * - Persiste a escolha em localStorage.
 * - Registra todos os elementos <audio> criados pelo app para aplicar o sinkId
 *   selecionado (e reaplicar quando o usuário troca).
 */

const STORAGE_KEY = 'sonoplasma:audio-sink-id';
const DEFAULT_SINK = 'default';

type AudioElementWithSink = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
};

const registered = new Set<AudioElementWithSink>();
const listeners = new Set<(sinkId: string) => void>();

let currentSinkId: string =
  (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
  DEFAULT_SINK;

export function isSetSinkIdSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (HTMLAudioElement.prototype as AudioElementWithSink).setSinkId === 'function';
}

export function getAudioOutputId(): string {
  return currentSinkId;
}

async function applyToElement(el: AudioElementWithSink, sinkId: string): Promise<void> {
  if (typeof el.setSinkId !== 'function') return;
  try {
    await el.setSinkId(sinkId);
  } catch (err) {
    // Falha silenciosa: dispositivo pode ter sido removido; volta para o padrão.
    if (sinkId !== DEFAULT_SINK) {
      try {
        await el.setSinkId(DEFAULT_SINK);
      } catch {
        /* ignore */
      }
    }
    console.warn('[audioOutput] setSinkId falhou:', err);
  }
}

export function registerAudioElement(el: HTMLAudioElement | null | undefined): void {
  if (!el) return;
  const audio = el as AudioElementWithSink;
  registered.add(audio);
  void applyToElement(audio, currentSinkId);
}

export function unregisterAudioElement(el: HTMLAudioElement | null | undefined): void {
  if (!el) return;
  registered.delete(el as AudioElementWithSink);
}

export async function setAudioOutputId(sinkId: string): Promise<void> {
  currentSinkId = sinkId || DEFAULT_SINK;
  try {
    localStorage.setItem(STORAGE_KEY, currentSinkId);
  } catch {
    /* ignore */
  }
  await Promise.all(Array.from(registered).map((el) => applyToElement(el, currentSinkId)));
  listeners.forEach((cb) => {
    try { cb(currentSinkId); } catch { /* ignore */ }
  });
}

export function subscribeAudioOutput(cb: (sinkId: string) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Solicita permissão de mídia para expor os labels dos dispositivos e retorna a lista.
 * Precisa ser chamado a partir de um gesto do usuário (clique no seletor).
 */
export async function listAudioOutputs(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  // Tenta obter permissão pra que os labels apareçam preenchidos.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // Sem permissão: labels podem vir vazios, mas ainda listamos os deviceIds.
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}
