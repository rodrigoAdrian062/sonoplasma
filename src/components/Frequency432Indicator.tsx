import { useEffect, useState } from 'react';
import { useHealingHz } from '@/hooks/useFrequency432';
import { getEffectiveHz, getFrequencyInfo, getTrackHz, subscribeTrackHz } from '@/lib/pitch432';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
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
 * Mostra em tempo real:
 *  - Hz efetiva aplicada à faixa que está tocando (override por faixa OU global)
 *  - ponto pulsando "AO VIVO" quando o pipeline Web Audio está processando
 *    (faixa local tocando — YouTube não passa pelo pitch)
 *  - selo "faixa" quando há override específico da música atual
 */
export function Frequency432Indicator({ compact }: Props) {
  const [globalHz] = useHealingHz();
  const player = useUniversalAudioPlayer();
  const { currentUrl, status, isYouTube, isSpotify } = player;

  // Re-render quando override por faixa muda.
  const [, force] = useState(0);
  useEffect(() => subscribeTrackHz(() => force((n) => n + 1)), []);

  const trackOverride = getTrackHz(currentUrl);
  const effectiveHz = getEffectiveHz(currentUrl);
  const displayHz = effectiveHz;

  // Pipeline realmente ativo? Só para arquivo local em reprodução.
  const processing = status === 'playing' && !!currentUrl && !isYouTube && !isSpotify;

  // Se nada está tocando e o global é 440, esconde. Se está tocando e a
  // efetiva é 440 (override), ainda mostramos para transparência.
  if (!processing && globalHz === 440 && !trackOverride) return null;

  const info = getFrequencyInfo(displayHz);
  const label = info?.short ?? `${displayHz}Hz`;
  const isPassthrough = displayHz === 440;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`select-none inline-flex items-center gap-1.5 rounded-full
                      border font-semibold tracking-wide transition-colors
                      ${isPassthrough
                        ? 'bg-muted/30 border-muted-foreground/30 text-muted-foreground'
                        : 'bg-gold/10 border-gold/50 text-gold shadow-[0_0_10px_hsl(var(--gold)/0.25)]'}
                      ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
          role="status"
          aria-label={`Frequência ${label} ${processing ? 'processando' : 'configurada'}`}
        >
          {processing ? (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse"
              aria-hidden
              title="Processando ao vivo"
            />
          ) : (
            <Music2 size={compact ? 11 : 13} />
          )}
          <span>{label}</span>
          {trackOverride != null && (
            <span
              className={`ml-0.5 rounded px-1 py-[1px] text-[9px] font-bold uppercase
                          ${isPassthrough ? 'bg-muted-foreground/20' : 'bg-gold/25'}`}
              title="Override por faixa"
            >
              faixa
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold">{info?.label ?? `${displayHz}Hz`}</p>
        {info?.desc && <p className="text-xs mt-1 opacity-80">{info.desc}</p>}
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-[11px] opacity-80">
          <p>
            Global: <span className="font-mono">{globalHz}Hz</span>
            {trackOverride != null && (
              <> · Faixa: <span className="font-mono">{trackOverride}Hz</span></>
            )}
          </p>
          <p>
            Status:{' '}
            {processing ? (
              <span className="text-gold font-semibold">processando ao vivo</span>
            ) : (isYouTube || isSpotify) && currentUrl ? (
              <span>{isSpotify ? 'Spotify' : 'YouTube'} (sem processamento — iframe)</span>
            ) : currentUrl ? (
              <span>pausado</span>
            ) : (
              <span>nenhuma faixa</span>
            )}
          </p>
          {processing && !isPassthrough && (
            <p className="font-mono">ratio: {(displayHz / 440).toFixed(4)}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
