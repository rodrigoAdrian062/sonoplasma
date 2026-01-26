import { Music2 } from 'lucide-react';

interface AudioIndicatorProps {
  stageName: string | null;
  isPlaying: boolean;
}

export function AudioIndicator({ stageName, isPlaying }: AudioIndicatorProps) {
  if (!stageName) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-lg border border-gold/20">
      <div className="relative">
        <Music2 size={18} className="text-gold" />
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">Reproduzindo</p>
        <p className="text-sm font-medium text-foreground truncate">{stageName}</p>
      </div>
    </div>
  );
}
