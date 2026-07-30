import { Volume2, VolumeX, TrendingUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
}

const START_OPTIONS = Array.from({ length: 51 }, (_, i) => i);
const RAMP_SECONDS = [3, 5, 8, 10, 15, 20, 30, 45, 60];
const RAMP_TARGETS = [20, 30, 40, 50, 60, 70, 80, 90, 100];

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const isMuted = volume === 0;
  const {
    startVolume,
    setStartVolume,
    rampEnabled,
    setRampEnabled,
    rampSeconds,
    setRampSeconds,
    rampTarget,
    setRampTarget,
  } = useUniversalAudioPlayer();

  const handleToggleMute = () => {
    onVolumeChange(isMuted ? 0.7 : 0);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-card rounded-lg border border-border">
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

      <div className="flex items-center gap-1.5 pl-3 border-l border-border">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          Iniciar em
        </span>
        <Select
          value={String(Math.round(startVolume * 100))}
          onValueChange={(v) => setStartVolume(Number(v) / 100)}
        >
          <SelectTrigger className="h-8 w-[74px] text-xs" aria-label="Volume inicial ao dar play">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {START_OPTIONS.map((p) => (
              <SelectItem key={p} value={String(p)} className="text-xs">
                {p}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 pl-3 border-l border-border">
        <TrendingUp size={14} className={rampEnabled ? 'text-gold' : 'text-muted-foreground'} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          Subida suave
        </span>
        <Switch
          checked={rampEnabled}
          onCheckedChange={setRampEnabled}
          aria-label="Ativar subida suave de volume"
        />
        {rampEnabled && (
          <>
            <Select
              value={String(Math.round(rampTarget * 100))}
              onValueChange={(v) => setRampTarget(Number(v) / 100)}
            >
              <SelectTrigger className="h-8 w-[74px] text-xs" aria-label="Volume alvo da subida suave">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {RAMP_TARGETS.map((p) => (
                  <SelectItem key={p} value={String(p)} className="text-xs">
                    até {p}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(rampSeconds)}
              onValueChange={(v) => setRampSeconds(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs" aria-label="Duração da subida suave">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {RAMP_SECONDS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">
                    {s}s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  );
}

