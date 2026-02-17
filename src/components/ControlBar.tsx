import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { VolumeControl } from './VolumeControl';
import { AudioIndicator } from './AudioIndicator';
import { EqualizerPanel } from './EqualizerPanel';
import { ElegantClock } from './ElegantClock';
import { Button } from '@/components/ui/button';
import type { EQSettings } from '@/hooks/useUniversalAudioPlayer';

interface ControlBarProps {
  volume: number;
  onVolumeChange: (value: number) => void;
  activeStage: {symbolicName: string;} | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onSeekTo?: (seconds: number) => void;
  eq?: EQSettings;
  onEQChange?: (settings: Partial<EQSettings>) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ControlBar({
  volume,
  onVolumeChange,
  activeStage,
  isPlaying,
  currentTime = 0,
  duration = 0,
  onSeekTo,
  eq,
  onEQChange
}: ControlBarProps) {
  const [showEQ, setShowEQ] = useState(false);

  return (
    <div className="sticky top-[73px] z-10 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <AudioIndicator
            stageName={activeStage?.symbolicName || null}
            isPlaying={isPlaying} />

          {eq && onEQChange &&
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEQ(!showEQ)}
            className={`h-9 w-9 ${showEQ ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}
            title="Equalizador">

              <SlidersHorizontal size={18} />
            </Button>
          }
          <div className="ml-auto sm:ml-0">
            <ElegantClock size="md" />
          </div>
        </div>
        {/* EQ Panel */}
        {showEQ && eq && onEQChange &&
        <div className="mt-2 animate-fade-in">
            <EqualizerPanel eq={eq} onEQChange={onEQChange} />
          </div>
        }
        {/* Progress bar */}
        {activeStage && duration > 0 &&
        <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div
            className="flex-1 h-1.5 bg-secondary rounded-full cursor-pointer relative group"
            onClick={(e) => {
              if (!onSeekTo) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeekTo(ratio * duration);
            }}>

              <div
              className="h-full bg-gold rounded-full transition-all relative"
              style={{ width: `${currentTime / duration * 100}%` }}>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gold rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>
        }
      </div>
    </div>);

}