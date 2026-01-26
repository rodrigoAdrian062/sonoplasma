import { VolumeControl } from './VolumeControl';
import { AudioIndicator } from './AudioIndicator';
import { CeremonyStage } from '@/types/ceremony';

interface ControlBarProps {
  volume: number;
  onVolumeChange: (value: number) => void;
  activeStage: CeremonyStage | null;
  isPlaying: boolean;
}

export function ControlBar({ 
  volume, 
  onVolumeChange, 
  activeStage,
  isPlaying 
}: ControlBarProps) {
  return (
    <div className="sticky top-[73px] z-10 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <AudioIndicator 
            stageName={activeStage?.symbolicName || null} 
            isPlaying={isPlaying} 
          />
        </div>
      </div>
    </div>
  );
}
