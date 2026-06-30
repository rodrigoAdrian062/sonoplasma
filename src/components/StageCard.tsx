import { useState, useEffect, useRef } from 'react';
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
  const [showAudioList, setShowAudioList] = useState(audios.length >= 5);
  
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
    if (selectedAudioIndex >= audios.length) {
      setSelectedAudioIndex(0);
    }
    if (audios.length >= 5) {
      setShowAudioList(true);
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

  const prevActiveRef = useRef(false);
  useEffect(() => {
    // Only reset timer when transitioning from active to idle (not on initial mount)
    if (prevActiveRef.current && !isPlaying && !isPaused && timer.isRunning) {
      timer.reset();
    }
    prevActiveRef.current = isPlaying || isPaused;
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
        'relative rounded-xl border transition-all duration-300 overflow-hidden',
        isActive 
          ? 'bg-card border-gold/40 shadow-[0_0_20px_-4px_hsl(var(--gold)/0.15)]' 
          : 'bg-card border-border/60 hover:border-gold/20'
      )}
    >
      {/* Active indicator line */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      )}

      <div className="p-3 sm:p-4 min-w-0 overflow-hidden">
        {/* Header row - icon, name, actions */}
        <div className="flex items-center gap-3 mb-2.5">
          <div
            className={cn(
              'shrink-0 rounded-lg overflow-hidden transition-colors duration-300',
              isActive ? 'bg-gold/15' : 'bg-secondary/80',
              (stage as any).icone_url ? 'p-0.5' : 'p-2'
            )}
          >
            <CeremonyIcon name={stage.icone} imageUrl={(stage as any).icone_url} size={(stage as any).icone_url ? 36 : 18} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground truncate leading-tight">
              {stage.nome_simbolico}
            </h3>
            {stage.descricao && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {stage.descricao}
              </p>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 text-muted-foreground/60 hover:text-gold transition-colors rounded-md hover:bg-gold/10"
              aria-label="Editar etapa"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-muted-foreground/60 hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
              aria-label="Remover etapa"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Audio selector */}
        {hasAudios ? (
          <div className="mb-2.5 min-w-0 overflow-hidden">
            <button
              onClick={() => setShowAudioList(!showAudioList)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all text-left overflow-hidden',
                isActive
                  ? 'bg-gold/8 border-gold/25 text-gold'
                  : 'bg-secondary/50 border-border/40 text-foreground hover:border-gold/25'
              )}
            >
              <Music size={14} className="text-gold/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {currentAudio?.nome || `Áudio ${selectedAudioIndex + 1}`}
                </p>
                {audios.length > 1 && (
                  <p className="text-[10px] text-muted-foreground/70">
                    {selectedAudioIndex + 1} de {audios.length} áudios
                  </p>
                )}
              </div>
              {audios.length > 1 && (
                showAudioList ? <ChevronUp size={14} className="text-muted-foreground/60" /> : <ChevronDown size={14} className="text-muted-foreground/60" />
              )}
            </button>

            {/* Audio list */}
            {showAudioList && (
              <div className="mt-1.5 rounded-md border border-border/40 bg-secondary/30 overflow-hidden max-h-48 overflow-y-auto w-full">
                {audios.map((audio, index) => (
                  <div
                    key={audio.id}
                    onClick={() => handleSelectAudio(index)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors cursor-pointer overflow-hidden',
                      index === selectedAudioIndex
                        ? 'bg-gold/10 text-gold'
                        : 'hover:bg-secondary/60 text-foreground'
                    )}
                  >
                    <Music size={12} className={cn('shrink-0', index === selectedAudioIndex ? 'text-gold' : 'text-muted-foreground/50')} />
                    <span className="text-xs truncate flex-1 min-w-0 block">{audio.nome || `Áudio ${index + 1}`}</span>
                    <button
                      onClick={(e) => handleDeleteAudio(audio.id, e)}
                      className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors rounded hover:bg-destructive/10 shrink-0"
                      title="Remover áudio"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/50 mb-2.5 flex items-center gap-1">
            <Music size={10} />
            Sem áudio configurado
          </p>
        )}

        {/* Timer + Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timer inline */}
          <div className="flex items-center gap-1.5 mr-auto">
            <Clock size={13} className="text-muted-foreground/50" />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <input
                type="checkbox"
                checked={useTimerEnabled}
                onChange={(e) => setUseTimerEnabled(e.target.checked)}
                className="rounded border-border bg-secondary text-gold focus:ring-gold w-3.5 h-3.5"
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
                  className="w-12 px-1.5 py-0.5 text-xs bg-secondary/60 border border-border/40 rounded text-foreground focus:border-gold focus:ring-1 focus:ring-gold"
                />
                <span className="text-xs text-muted-foreground/60">min</span>
              </>
            )}
            {(timer.isRunning || timer.isPaused) && (
              <div className="flex items-center gap-1 ml-1">
                <TimerDisplay 
                  seconds={timer.timeRemaining} 
                  isActive={timer.isRunning && !timer.isPaused}
                  size="sm"
                />
                <button
                  onClick={() => timer.reset()}
                  className="p-0.5 text-muted-foreground hover:text-gold transition-colors"
                  aria-label="Resetar cronômetro"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Play / Control buttons */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {!isActive ? (
            <Button
              onClick={handlePlayWithTimer}
              disabled={!hasAudios}
              className={cn(
                'w-full gap-2 text-sm font-semibold h-11 rounded-xl transition-all duration-200',
                hasAudios 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-none shadow-md shadow-emerald-500/20' 
                  : 'bg-secondary text-muted-foreground border-border cursor-not-allowed shadow-none'
              )}
            >
              <Play size={18} fill="currentColor" />
              Iniciar
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onSeekTo?.(0)}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-gold hover:bg-gold/10"
                aria-label="Reiniciar música"
                title="Reiniciar música"
              >
                <RotateCw size={14} aria-hidden="true" />
              </Button>

              <Button
                onClick={onSeekBackward}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-gold hover:bg-gold/10"
                aria-label="Retroceder 10 segundos"
                title="Retroceder 10s"
              >
                <SkipBack size={14} aria-hidden="true" />
              </Button>

              {isPlaying ? (
                <Button
                  onClick={handlePause}
                  className="flex-1 gap-1.5 text-xs font-semibold h-9 rounded-lg bg-gold hover:bg-gold/90 text-background border-none"
                >
                  <Pause size={15} fill="currentColor" />
                  Pausar
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  className="flex-1 gap-1.5 text-xs font-semibold h-9 rounded-lg bg-gold hover:bg-gold/90 text-background border-none"
                >
                  <Play size={15} fill="currentColor" />
                  Continuar
                </Button>
              )}

              <Button
                onClick={onSeekForward}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-gold hover:bg-gold/10"
                aria-label="Avançar 10 segundos"
                title="Avançar 10s"
              >
                <SkipForward size={14} aria-hidden="true" />
              </Button>

              <Button
                onClick={handleStop}
                variant="ghost"
                className="gap-1.5 h-8 px-2.5 text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              >
                <Square size={13} fill="currentColor" />
                Parar
              </Button>
            </>
          )}
        </div>

        {/* Audio progress bar */}
        {isActive && audioDuration > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground/60 font-mono w-8 text-right">
              {formatTime(audioCurrentTime)}
            </span>
            <div
              className="flex-1 h-1 bg-secondary/80 rounded-full cursor-pointer relative group"
              onClick={(e) => {
                if (!onSeekTo) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                onSeekTo(ratio * audioDuration);
              }}
            >
              <div
                className="h-full bg-gold/80 rounded-full transition-all relative"
                style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gold rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground/60 font-mono w-8">
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
