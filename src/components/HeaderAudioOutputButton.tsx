import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AudioOutputSelector } from '@/components/AudioOutputSelector';

interface Props {
  compact?: boolean;
}

export function HeaderAudioOutputButton({ compact }: Props) {
  const size = compact ? 18 : 20;
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={
                compact
                  ? 'text-muted-foreground hover:text-gold h-8 w-8'
                  : 'text-muted-foreground hover:text-gold'
              }
              aria-label="Saída de áudio"
            >
              <Headphones size={size} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Saída de áudio</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80">
        <AudioOutputSelector />
      </PopoverContent>
    </Popover>
  );
}
