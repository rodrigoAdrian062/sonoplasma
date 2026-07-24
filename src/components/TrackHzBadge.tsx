import { useEffect, useState } from 'react';
import {
  getEffectiveHz,
  getTrackHz,
  subscribeTrackHz,
  getFrequencyInfo,
} from '@/lib/pitch432';
import { useHealingHz } from '@/hooks/useFrequency432';
import { cn } from '@/lib/utils';

interface Props {
  url?: string | null;
  /** Se `true`, exibe ponto pulsando indicando processamento ao vivo. */
  playing?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Selo compacto e não-interativo mostrando a Hz efetiva da faixa.
 * - Sempre visível (mesmo em 440Hz — fica em cinza).
 * - Dourado quando ativo (Hz ≠ 440) ou quando existe override por faixa.
 * - Ponto pulsando quando `playing` é true.
 */
export function TrackHzBadge({ url, playing, size = 'xs', className }: Props) {
  const [globalHz] = useHealingHz();
  const [, force] = useState(0);
  useEffect(() => subscribeTrackHz(() => force((n) => n + 1)), []);

  const override = getTrackHz(url ?? null);
  const hz = url ? getEffectiveHz(url) : globalHz;
  const info = getFrequencyInfo(hz);
  const active = hz !== 440;
  const hasOverride = override != null;

  return (
    <span
      className={cn(
        'select-none inline-flex items-center gap-0.5 rounded-full border font-mono tabular-nums shrink-0',
        active
          ? 'bg-gold/10 border-gold/50 text-gold'
          : 'bg-muted/30 border-muted-foreground/25 text-muted-foreground',
        hasOverride && 'ring-1 ring-gold/40',
        size === 'xs' ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className,
      )}
      title={
        (info?.label ?? `${hz}Hz`) +
        (hasOverride ? ' · faixa' : '') +
        (info?.desc ? ` — ${info.desc}` : '')
      }
      aria-label={`Frequência ${hz}Hz${hasOverride ? ' (faixa)' : ''}`}
    >
      {playing && (
        <span
          className="inline-block w-1 h-1 rounded-full bg-current animate-pulse"
          aria-hidden
        />
      )}
      <span>{hz}Hz</span>
    </span>
  );
}
