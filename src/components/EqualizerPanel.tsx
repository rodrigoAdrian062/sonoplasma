import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { EQSettings } from '@/hooks/useUniversalAudioPlayer';

interface EqualizerPanelProps {
  eq: EQSettings;
  onEQChange: (settings: Partial<EQSettings>) => void;
}

export function EqualizerPanel({ eq, onEQChange }: EqualizerPanelProps) {
  const bands: { key: keyof EQSettings; label: string }[] = [
    { key: 'bass', label: 'Grave' },
    { key: 'mid', label: 'Médio' },
    { key: 'treble', label: 'Agudo' },
  ];

  const handleReset = () => {
    onEQChange({ bass: 0, mid: 0, treble: 0 });
  };

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-secondary/50 rounded-lg border border-border">
      {bands.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-muted-foreground font-medium w-10 shrink-0">{label}</span>
          <Slider
            value={[eq[key]]}
            onValueChange={(values) => onEQChange({ [key]: values[0] })}
            min={-12}
            max={12}
            step={1}
            className="w-20"
          />
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right shrink-0">
            {eq[key] > 0 ? '+' : ''}{eq[key]}
          </span>
        </div>
      ))}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        className="h-7 w-7 text-muted-foreground hover:text-gold shrink-0"
        title="Resetar equalizador"
      >
        <RotateCcw size={12} />
      </Button>
    </div>
  );
}
