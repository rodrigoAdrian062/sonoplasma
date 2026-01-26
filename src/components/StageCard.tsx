import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, RotateCcw } from 'lucide-react';
import { CeremonyStage, PlaybackStatus } from '@/types/ceremony';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';

interface StageCardProps {
  stage: CeremonyStage;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function StageCard({
  stage,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
}: StageCardProps) {
  const [customTime, setCustomTime] = useState(stage.defaultTime);
  const [useTimer, setUseTimer] = useState(stage.defaultTime > 0);
  
  const timer = useTimerHook(() => {
    // Quando o timer terminar, para o áudio
    onStop();
  });

  const isActive = isPlaying || isPaused;

  const handlePlayWithTimer = () => {
    if (useTimer && customTime > 0) {
      timer.start(customTime);
    }
    onPlay();
  };

  const handleStop = () => {
    timer.reset();
    onStop();
  };

  const handlePause = () => {
    if (timer.isRunning) {
      timer.pause();
    }
    onPause();
  };

  const handleResume = () => {
    if (timer.isPaused) {
      timer.resume();
    }
    onPlay();
  };

  // Sincroniza o timer quando o áudio para externamente
  useEffect(() => {
    if (!isPlaying && !isPaused && timer.isRunning) {
      timer.reset();
    }
  }, [isPlaying, isPaused]);

  const handleTimeChange = (minutes: number) => {
    const seconds = minutes * 60;
    setCustomTime(seconds);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border transition-all duration-300
        ${isActive 
          ? 'bg-card-active border-gold/30 shadow-active' 
          : 'bg-card border-border hover:border-gold/20 shadow-card'
        }
      `}
    >
      {/* Indicador de ativo */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
      )}

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`
              p-3 rounded-lg transition-colors duration-300
              ${isActive ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground'}
            `}
          >
            <CeremonyIcon name={stage.icon} size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-medium text-foreground mb-1 truncate">
              {stage.symbolicName}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {stage.description}
            </p>
          </div>
        </div>

        {/* Timer Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          {stage.defaultTime > 0 && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useTimer}
                  onChange={(e) => setUseTimer(e.target.checked)}
                  className="rounded border-border bg-secondary text-gold focus:ring-gold"
                />
                Cronômetro
              </label>
              {useTimer && (
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={Math.floor(customTime / 60)}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground focus:border-gold focus:ring-1 focus:ring-gold"
                />
              )}
              {useTimer && <span className="text-sm text-muted-foreground">min</span>}
            </div>
          )}

          {/* Timer Display */}
          {(timer.isRunning || timer.isPaused) && (
            <div className="flex items-center gap-2">
              <TimerDisplay 
                seconds={timer.timeRemaining} 
                isActive={timer.isRunning && !timer.isPaused}
                size="md"
              />
              <button
                onClick={() => timer.reset()}
                className="p-1 text-muted-foreground hover:text-gold transition-colors"
                aria-label="Resetar cronômetro"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              onClick={handlePlayWithTimer}
              className="flex-1 sm:flex-none gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50"
              variant="outline"
            >
              <Play size={18} />
              <span>Iniciar</span>
            </Button>
          ) : (
            <>
              {isPlaying ? (
                <Button
                  onClick={handlePause}
                  className="flex-1 sm:flex-none gap-2 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40"
                  variant="outline"
                >
                  <Pause size={18} />
                  <span>Pausar</span>
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  className="flex-1 sm:flex-none gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30"
                  variant="outline"
                >
                  <Play size={18} />
                  <span>Continuar</span>
                </Button>
              )}
              <Button
                onClick={handleStop}
                className="gap-2 bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30"
                variant="outline"
              >
                <Square size={18} />
                <span className="hidden sm:inline">Parar</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Renomeando para evitar conflito
function useTimerHook(onComplete?: () => void) {
  return useTimer(onComplete);
}
