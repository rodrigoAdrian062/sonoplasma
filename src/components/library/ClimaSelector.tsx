import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CLIMAS, getClima, type ClimaId } from '@/lib/climas';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { cn } from '@/lib/utils';
import { Thermometer, Check } from 'lucide-react';

interface ClimaSelectorProps {
  audioId: string;
  clima?: string | null;
  compact?: boolean;
}

/** Define o clima ritual de uma faixa da biblioteca. */
export function ClimaSelector({ audioId, clima, compact }: ClimaSelectorProps) {
  const { setClima } = useAudioLibrary();
  const current = getClima(clima);
  const Icon = current?.icone ?? Thermometer;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-muted-foreground hover:text-gold', compact ? 'h-7 w-7' : 'h-8 w-8 sm:h-9 sm:w-9')}
          title={current ? `Clima: ${current.label}` : 'Definir clima ritual'}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon size={compact ? 14 : 16} style={current ? { color: current.cor } : undefined} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2" onClick={(e) => e.stopPropagation()}>
        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Clima ritual</p>
        <div className="space-y-1">
          {CLIMAS.map((c) => {
            const CIcon = c.icone;
            const active = clima === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setClima.mutate({ id: audioId, clima: active ? null : (c.id as ClimaId) })}
                className={cn(
                  'w-full flex items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                  active ? 'border-transparent' : 'border-border/50 hover:bg-muted/50',
                )}
                style={active ? { background: `${c.cor}22`, borderColor: `${c.cor}66` } : undefined}
              >
                <CIcon size={14} className="mt-0.5 shrink-0" style={{ color: c.cor }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-xs font-medium">
                    {c.ordem}. {c.label}
                    {active && <Check size={12} style={{ color: c.cor }} />}
                  </span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">
                    {c.momentos.join(' · ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
