import { useFrequency432 } from '@/hooks/useFrequency432';
import { Music2 } from 'lucide-react';

/**
 * Indicador discreto e fixo no canto inferior esquerdo, mostrando
 * que a Frequência 432Hz está ativa globalmente.
 */
export function Frequency432Indicator() {
  const [enabled] = useFrequency432();
  if (!enabled) return null;
  return (
    <div
      className="fixed bottom-3 left-3 z-[60] pointer-events-none select-none
                 flex items-center gap-1.5 px-2 py-1 rounded-full
                 bg-background/70 backdrop-blur-md border border-gold/50
                 text-gold text-[10px] font-semibold tracking-wide
                 shadow-[0_0_10px_hsl(var(--gold)/0.25)]"
      role="status"
      aria-label="Frequência 432Hz ativa"
      title="Frequência 432Hz ativa"
    >
      <Music2 size={11} className="animate-pulse" />
      <span>432 Hz</span>
    </div>
  );
}
