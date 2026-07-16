import { useEffect, useState } from 'react';
import { getAudioOutputId, subscribeAudioOutput } from '@/lib/audioOutput';

/**
 * Retorna o rótulo amigável do dispositivo de saída atualmente selecionado.
 * "default" → "Automático". Se os labels não estiverem disponíveis (sem permissão),
 * retorna "Dispositivo selecionado".
 */
export function useAudioOutputLabel(): { sinkId: string; label: string } {
  const [sinkId, setSinkId] = useState<string>(() => getAudioOutputId());
  const [label, setLabel] = useState<string>('Automático');

  useEffect(() => {
    const unsub = subscribeAudioOutput((id) => setSinkId(id));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (sinkId === 'default' || !sinkId) {
        if (!cancelled) setLabel('Automático');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        if (!cancelled) setLabel('Dispositivo selecionado');
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const found = devices.find((d) => d.kind === 'audiooutput' && d.deviceId === sinkId);
        if (cancelled) return;
        if (found && found.label) {
          setLabel(found.label.replace(/\s*\([0-9a-f:]+\)\s*$/i, ''));
        } else {
          setLabel('Dispositivo selecionado');
        }
      } catch {
        if (!cancelled) setLabel('Dispositivo selecionado');
      }
    }

    resolve();

    const handler = () => resolve();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
    };
  }, [sinkId]);

  return { sinkId, label };
}
