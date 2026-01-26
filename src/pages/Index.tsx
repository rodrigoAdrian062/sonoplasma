import { useMemo } from 'react';
import { Header } from '@/components/Header';
import { ControlBar } from '@/components/ControlBar';
import { StageCard } from '@/components/StageCard';
import { ceremonyStages } from '@/data/stages';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const Index = () => {
  const {
    currentStageId,
    status,
    volume,
    play,
    pause,
    stop,
    setVolume,
  } = useAudioPlayer();

  const activeStage = useMemo(() => {
    return ceremonyStages.find(s => s.id === currentStageId) || null;
  }, [currentStageId]);

  const handlePlay = (stageId: string, audioUrl: string) => {
    play(stageId, audioUrl);
  };

  const handlePause = () => {
    pause();
  };

  const handleStop = () => {
    stop();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ControlBar
        volume={volume}
        onVolumeChange={setVolume}
        activeStage={activeStage}
        isPlaying={status === 'playing'}
      />
      
      <main className="container py-6">
        <div className="grid gap-4">
          {ceremonyStages.map((stage, index) => (
            <div
              key={stage.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <StageCard
                stage={stage}
                isPlaying={currentStageId === stage.id && status === 'playing'}
                isPaused={currentStageId === stage.id && status === 'paused'}
                onPlay={() => handlePlay(stage.id, stage.audioUrl)}
                onPause={handlePause}
                onStop={handleStop}
              />
            </div>
          ))}
        </div>

        {/* Footer discreto */}
        <footer className="mt-12 py-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            Sistema de Sonoplastia Cerimonial
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
