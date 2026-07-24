import { useHealingHz } from '@/hooks/useFrequency432';
import { getFrequencyInfo } from '@/lib/pitch432';
import { Music2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  compact?: boolean;
}

/**
 * Indicador da frequência curativa ativa. Renderizado no header.
 */
export function Frequency432Indicator({ compact }: Props) {
  const [hz] = useHealingHz();
  if (hz === 440) return null;
  const info = getFrequencyInfo(hz);
  const label = info?.short ?? `${hz}Hz`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`select-none inline-flex items-center gap-1.5 rounded-full
                      bg-gold/10 border border-gold/50 text-gold
                      font-semibold tracking-wide
                      shadow-[0_0_10px_hsl(var(--gold)/0.25)]
                      ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
          role="status"
          aria-label={`Frequência ${label} ativa`}
        >
          <Music2 size={compact ? 11 : 13} className="animate-pulse" />
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold">{info?.label ?? `${hz}Hz`}</p>
        {info?.desc && <p className="text-xs mt-1 opacity-80">{info.desc}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
