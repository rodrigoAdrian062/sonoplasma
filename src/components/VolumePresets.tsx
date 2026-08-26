import { NIVEIS_VOLUME, nivelAtual } from '@/lib/volumeNiveis';
import { cn } from '@/lib/utils';

interface VolumePresetsProps {
  /** Volume atual em fração (0-1). */
  volume: number;
  onVolumeChange: (value: number) => void;
  /** Versão reduzida para painéis estreitos. */
  compact?: boolean;
  className?: string;
}

/**
 * Escala de volume ritual (Manual do Mestre de Harmonia, cap. 13).
 * Cinco botões nomeados que aplicam o volume recomendado para cada momento.
 */
export function VolumePresets({ volume, onVolumeChange, compact = false, className }: VolumePresetsProps) {
  const ativo = nivelAtual(volume);

  return (
    <div className={cn('w-full', className)}>
      {!compact && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Escala ritual de volume
        </p>
      )}
      <div className="flex items-center gap-1" role="group" aria-label="Escala ritual de volume">
        {NIVEIS_VOLUME.map((n) => {
          const isActive = ativo?.nivel === n.nivel;
          return (
            <button
              key={n.nivel}
              type="button"
              onClick={() => onVolumeChange(n.valor)}
              title={`${n.nivel} — ${n.nome} (${Math.round(n.valor * 100)}%) · ${n.uso}`}
              aria-label={`Nível ${n.nivel}: ${n.nome}, ${Math.round(n.valor * 100)} por cento — ${n.uso}`}
              aria-pressed={isActive}
              className={cn(
                'flex-1 rounded-md border transition-colors',
                compact ? 'px-1 py-1' : 'px-1.5 py-1.5',
                isActive
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-border bg-secondary/60 text-muted-foreground hover:border-gold/50 hover:text-gold',
              )}
            >
              <span className={cn('block font-bold leading-none', compact ? 'text-[10px]' : 'text-xs')}>
                {n.nivel}
              </span>
              {!compact && (
                <span className="mt-0.5 block truncate text-[9px] leading-tight">{n.nome}</span>
              )}
            </button>
          );
        })}
      </div>
      {!compact && ativo && (
        <p className="mt-1 text-[9px] text-muted-foreground/70">{ativo.uso}</p>
      )}
    </div>
  );
}
