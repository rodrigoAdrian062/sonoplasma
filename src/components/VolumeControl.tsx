import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const isMuted = volume === 0;

  const handleToggleMute = () => {
    onVolumeChange(isMuted ? 0.7 : 0);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-lg border border-border">
      <button
        onClick={handleToggleMute}
        className="text-muted-foreground hover:text-gold transition-colors duration-200"
        aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      <Slider
        value={[volume * 100]}
        onValueChange={(values) => onVolumeChange(values[0] / 100)}
        max={100}
        step={1}
        className="w-28"
      />
      <span className="text-xs text-muted-foreground w-8 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
