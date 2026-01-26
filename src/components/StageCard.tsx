import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, RotateCcw, Pencil, Trash2, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StageCardProps {
  stage: CeremonyStage;
  audios: StageAudio[];
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: (audioUrl: string) => void;
  onPause: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StageCard({
  stage,
  audios,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  onEdit,
  onDelete,
}: StageCardProps) {
  const defaultTime = stage.tempo_padrao || 0;
  const [customTime, setCustomTime] = useState(defaultTime);
  const [useTimerEnabled, setUseTimerEnabled] = useState(defaultTime > 0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [showAudioList, setShowAudioList] = useState(false);
  
  const timer = useTimer(() => {
    onStop();
  });

  const isActive = isPlaying || isPaused;
  const hasAudios = audios.length > 0;
  const currentAudio = audios[selectedAudioIndex];

  useEffect(() => {
    setCustomTime(defaultTime);
    setUseTimerEnabled(defaultTime > 0);
  }, [defaultTime]);

  useEffect(() => {
    // Reset selected audio when audios change
    if (selectedAudioIndex >= audios.length) {
      setSelectedAudioIndex(0);
    }
  }, [audios.length, selectedAudioIndex]);

  const handlePlayWithTimer = () => {
    if (!currentAudio) return;
    
    if (useTimerEnabled && customTime > 0) {
      timer.start(customTime);
    }
    onPlay(currentAudio.audio_url);
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
    if (currentAudio) {
      onPlay(currentAudio.audio_url);
    }
  };

  useEffect(() => {
    if (!isPlaying && !isPaused && timer.isRunning) {
      timer.reset();
    }
  }, [isPlaying, isPaused]);

  const handleTimeChange = (minutes: number) => {
    const seconds = minutes * 60;
    setCustomTime(seconds);
  };

  const handleSelectAudio = (index: number) => {
    setSelectedAudioIndex(index);
    setShowAudioList(false);
    if (isActive) {
      handleStop();
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border transition-all duration-300',
        isActive 
          ? 'bg-card-active border-gold/30 shadow-active' 
          : 'bg-card border-border hover:border-gold/20 shadow-card'
      )}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
      )}

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn(
              'p-3 rounded-lg transition-colors duration-300',
              isActive ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground'
            )}
          >
            <CeremonyIcon name={stage.icone} imageUrl={(stage as any).icone_url} size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg sm:text-xl font-medium text-foreground mb-1">
                {stage.nome_simbolico}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={onEdit}
                  className="p-2 text-muted-foreground hover:text-gold transition-colors rounded-lg hover:bg-secondary"
                  aria-label="Editar etapa"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-secondary"
                  aria-label="Remover etapa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {stage.descricao}
            </p>
          </div>
        </div>

        {/* Audio Selector */}
        {hasAudios ? (
          <div className="mb-4">
            <button
              onClick={() => setShowAudioList(!showAudioList)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left',
                isActive
                  ? 'bg-gold/10 border-gold/30 text-gold'
                  : 'bg-secondary border-border text-foreground hover:border-gold/30'
              )}
            >
              <Music size={16} className="text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentAudio?.nome || `Áudio ${selectedAudioIndex + 1}`}
                </p>
                {audios.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAudioIndex + 1} de {audios.length} áudios
                  </p>
                )}
              </div>
              {audios.length > 1 && (
                showAudioList ? <ChevronUp size={16} /> : <ChevronDown size={16} />
              )}
            </button>

            {/* Audio List Dropdown */}
            {showAudioList && audios.length > 1 && (
              <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
                {audios.map((audio, index) => (
                  <button
                    key={audio.id}
                    onClick={() => handleSelectAudio(index)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                      index === selectedAudioIndex
                        ? 'bg-gold/10 text-gold'
                        : 'hover:bg-secondary text-foreground'
                    )}
                  >
                    <Music size={14} className={index === selectedAudioIndex ? 'text-gold' : 'text-muted-foreground'} />
                    <span className="text-sm truncate">{audio.nome || `Áudio ${index + 1}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gold/60 mb-4 flex items-center gap-1">
            <Music size={12} />
            Sem áudio configurado
          </p>
        )}

        {/* Timer Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={useTimerEnabled}
                onChange={(e) => setUseTimerEnabled(e.target.checked)}
                className="rounded border-border bg-secondary text-gold focus:ring-gold"
              />
              Cronômetro
            </label>
            {useTimerEnabled && (
              <>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={Math.floor(customTime / 60)}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground focus:border-gold focus:ring-1 focus:ring-gold"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </>
            )}
          </div>

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
              disabled={!hasAudios}
              className={cn(
                'flex-1 sm:flex-none gap-2 border',
                hasAudios 
                  ? 'bg-gold/10 hover:bg-gold/20 text-gold border-gold/30 hover:border-gold/50' 
                  : 'bg-secondary text-muted-foreground border-border cursor-not-allowed'
              )}
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
