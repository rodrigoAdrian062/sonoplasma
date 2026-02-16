import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, RotateCcw, Pencil, Trash2, Music, ChevronDown, ChevronUp, X, SkipBack, SkipForward, RotateCw } from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface StageCardProps {
  stage: CeremonyStage;
  audios: StageAudio[];
  isPlaying: boolean;
  isPaused: boolean;
  currentTime?: number;
  duration?: number;
  onPlay: (audioUrl: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onSeekTo?: (seconds: number) => void;
}

export function StageCard({
  stage,
  audios,
  isPlaying,
  isPaused,
  currentTime: audioCurrentTime = 0,
  duration: audioDuration = 0,
  onPlay,
  onPause,
  onResume,
  onStop,
  onEdit,
  onDelete,
  onSeekForward,
  onSeekBackward,
  onSeekTo,
}: StageCardProps) {
  const queryClient = useQueryClient();
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
    onResume();
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

  const handleDeleteAudio = async (audioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('sonoplastia_etapa_audios')
        .delete()
        .eq('id', audioId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['stage-audios', stage.id] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
      toast.success('Áudio removido da etapa');
    } catch {
      toast.error('Erro ao remover áudio');
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

      <div className="p-3 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div
            className={cn(
              'p-2 sm:p-3 rounded-lg transition-colors duration-300',
              isActive ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground'
            )}
          >
            <CeremonyIcon name={stage.icone} imageUrl={(stage as any).icone_url} size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base sm:text-xl font-medium text-foreground mb-1">
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
          <div className="mb-3 sm:mb-4">
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
            {showAudioList && (
              <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
                {audios.map((audio, index) => (
                  <div
                    key={audio.id}
                    onClick={() => handleSelectAudio(index)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer',
                      index === selectedAudioIndex
                        ? 'bg-gold/10 text-gold'
                        : 'hover:bg-secondary text-foreground'
                    )}
                  >
                    <Music size={14} className={index === selectedAudioIndex ? 'text-gold' : 'text-muted-foreground'} />
                    <span className="text-sm truncate flex-1">{audio.nome || `Áudio ${index + 1}`}</span>
                    <button
                      onClick={(e) => handleDeleteAudio(audio.id, e)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-destructive/10"
                      title="Remover áudio"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gold/60 mb-3 sm:mb-4 flex items-center gap-1">
            <Music size={12} />
            Sem áudio configurado
          </p>
        )}

        {/* Timer Section */}
        <div className="flex flex-col gap-3 mb-3 sm:mb-4">
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
                'flex-1 gap-2 text-sm font-semibold h-10 rounded-lg shadow-sm transition-all duration-200',
                hasAudios 
                  ? 'bg-gold hover:bg-gold/90 text-background border-none shadow-gold/30 hover:shadow-gold/50 hover:shadow-lg' 
                  : 'bg-secondary text-muted-foreground border-border cursor-not-allowed shadow-none'
              )}
            >
              <Play size={18} fill="currentColor" />
              <span>Iniciar</span>
            </Button>
          ) : (
            <>
              {/* Restart audio */}
              <Button
                onClick={() => onSeekTo?.(0)}
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-lg bg-secondary border-border text-muted-foreground hover:text-gold hover:border-gold/30"
                title="Reiniciar música"
              >
                <RotateCw size={16} />
              </Button>

              {/* Seek backward */}
              <Button
                onClick={onSeekBackward}
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-lg bg-secondary border-border text-muted-foreground hover:text-gold hover:border-gold/30"
                title="Retroceder 10s"
              >
                <SkipBack size={16} />
              </Button>

              {isPlaying ? (
                <Button
                  onClick={handlePause}
                  className="flex-1 gap-2 text-sm font-semibold h-10 rounded-lg bg-gold hover:bg-gold/90 text-background border-none shadow-sm shadow-gold/30"
                >
                  <Pause size={18} fill="currentColor" />
                  <span>Pausar</span>
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  className="flex-1 gap-2 text-sm font-semibold h-10 rounded-lg bg-gold hover:bg-gold/90 text-background border-none shadow-sm shadow-gold/30"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Continuar</span>
                </Button>
              )}

              {/* Seek forward */}
              <Button
                onClick={onSeekForward}
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-lg bg-secondary border-border text-muted-foreground hover:text-gold hover:border-gold/30"
                title="Avançar 10s"
              >
                <SkipForward size={16} />
              </Button>

              <Button
                onClick={handleStop}
                className="gap-2 h-10 rounded-lg bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 hover:border-destructive/50 font-semibold text-sm"
                variant="outline"
              >
                <Square size={16} fill="currentColor" />
                <span>Parar</span>
              </Button>
            </>
          )}
        </div>

        {/* Audio Progress Bar */}
        {isActive && audioDuration > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
              {formatTime(audioCurrentTime)}
            </span>
            <div
              className="flex-1 h-1.5 bg-secondary rounded-full cursor-pointer relative group"
              onClick={(e) => {
                if (!onSeekTo) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                onSeekTo(ratio * audioDuration);
              }}
            >
              <div
                className="h-full bg-gold rounded-full transition-all relative"
                style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gold rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono w-10">
              {formatTime(audioDuration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
