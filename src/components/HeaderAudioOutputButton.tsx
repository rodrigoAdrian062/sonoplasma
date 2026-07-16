import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AudioOutputSelector } from '@/components/AudioOutputSelector';
import { useAudioOutputLabel } from '@/hooks/useAudioOutputLabel';

interface Props {
  compact?: boolean;
}

export function HeaderAudioOutputButton({ compact }: Props) {
  const size = compact ? 18 : 20;
  const { label, sinkId } = useAudioOutputLabel();
  const isAuto = sinkId === 'default' || !sinkId;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? 'icon' : 'sm'}
              className={
                compact
                  ? 'text-muted-foreground hover:text-gold h-8 w-8'
                  : 'text-muted-foreground hover:text-gold gap-2 px-2 max-w-[220px]'
              }
              aria-label={`Saída de áudio: ${label}`}
            >
              <Headphones size={size} className={isAuto ? '' : 'text-gold'} />
              {!compact && (
                <span className="truncate text-xs font-medium">{label}</span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Saída: {label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80">
        <AudioOutputSelector />
      </PopoverContent>
    </Popover>
  );
}
