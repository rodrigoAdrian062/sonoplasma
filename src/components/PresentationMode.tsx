import { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Square, ChevronLeft, ChevronRight, Maximize, Minimize, Music, Clock, RotateCcw } from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PresentationModeProps {
  stages: CeremonyStage[];
  audiosByStageId: Record<string, StageAudio[]>;
  currentStageId: string | null;
  status: 'idle' | 'playing' | 'paused';
  onPlay: (stageId: string, audioUrl: string) => void;
  onPause: () => void;
  onStop: () => void;
  onClose: () => void;
  settings?: {
    nome_app?: string;
    logo_url?: string | null;
  } | null;
}

export function PresentationMode({
  stages,
  audiosByStageId,
  currentStageId,
  status,
  onPlay,
  onPause,
  onStop,
  onClose,
  settings,
}: PresentationModeProps) {
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customTime, setCustomTime] = useState(0);
  const [useTimerEnabled, setUseTimerEnabled] = useState(false);

  const currentStage = stages[selectedStageIndex];
  const audios = currentStage ? audiosByStageId[currentStage.id] || [] : [];
  const currentAudio = audios[selectedAudioIndex];
  const isActive = currentStageId === currentStage?.id && (status === 'playing' || status === 'paused');
  const isPlaying = currentStageId === currentStage?.id && status === 'playing';
  const isPaused = currentStageId === currentStage?.id && status === 'paused';

  const timer = useTimer(() => {
    onStop();
  });

  // Update timer settings when stage changes
  useEffect(() => {
    if (currentStage) {
      const defaultTime = currentStage.tempo_padrao || 0;
      setCustomTime(defaultTime);
      setUseTimerEnabled(defaultTime > 0);
    }
    setSelectedAudioIndex(0);
  }, [currentStage?.id]);

  // Reset timer when playback stops
  useEffect(() => {
    if (!isActive && timer.isRunning) {
      timer.reset();
    }
  }, [isActive]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (selectedStageIndex > 0) {
            setSelectedStageIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (selectedStageIndex < stages.length - 1) {
            setSelectedStageIndex(prev => prev + 1);
          }
          break;
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            handlePause();
          } else if (isPaused) {
            handleResume();
          } else if (currentAudio) {
            handlePlayWithTimer();
          }
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStageIndex, stages.length, isPlaying, isPaused, currentAudio]);

  const handlePlayWithTimer = () => {
    if (!currentAudio || !currentStage) return;
    
    if (useTimerEnabled && customTime > 0) {
      timer.start(customTime);
    }
    onPlay(currentStage.id, currentAudio.audio_url);
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
    if (currentAudio && currentStage) {
      onPlay(currentStage.id, currentAudio.audio_url);
    }
  };

  const handleStop = () => {
    timer.reset();
    onStop();
  };

  const handlePrevStage = () => {
    if (selectedStageIndex > 0) {
      if (isActive) handleStop();
      setSelectedStageIndex(prev => prev - 1);
    }
  };

  const handleNextStage = () => {
    if (selectedStageIndex < stages.length - 1) {
      if (isActive) handleStop();
      setSelectedStageIndex(prev => prev + 1);
    }
  };

  const handleTimeChange = (minutes: number) => {
    setCustomTime(minutes * 60);
  };

  const handleSelectAudio = (index: number) => {
    if (isActive) handleStop();
    setSelectedAudioIndex(index);
  };

  if (!currentStage) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nenhuma etapa disponível</p>
        <Button onClick={onClose} className="absolute top-4 right-4">
          <X size={24} />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {settings?.nome_app || 'Modo Apresentação'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedStageIndex + 1} / {stages.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-muted-foreground hover:text-gold"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-destructive"
          >
            <X size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Active Glow Effect */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Stage Icon */}
        <div
          className={cn(
            'p-8 rounded-3xl mb-6 transition-all duration-500',
            isActive 
              ? 'bg-gold/20 text-gold scale-110 shadow-[0_0_60px_rgba(212,175,55,0.3)]' 
              : 'bg-secondary text-muted-foreground'
          )}
        >
          <CeremonyIcon 
            name={currentStage.icone} 
            imageUrl={(currentStage as any).icone_url} 
            size={80} 
          />
        </div>

        {/* Stage Name */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground text-center mb-3">
          {currentStage.nome_simbolico}
        </h1>

        {/* Description */}
        {currentStage.descricao && (
          <p className="text-lg text-muted-foreground text-center max-w-2xl mb-6">
            {currentStage.descricao}
          </p>
        )}

        {/* Timer Display */}
        {(timer.isRunning || timer.isPaused) && (
          <div className="flex items-center gap-4 mb-6 animate-fade-in">
            <TimerDisplay 
              seconds={timer.timeRemaining} 
              isActive={timer.isRunning && !timer.isPaused}
              size="lg"
            />
            <button
              onClick={() => timer.reset()}
              className="p-2 text-muted-foreground hover:text-gold transition-colors rounded-lg hover:bg-secondary"
              aria-label="Resetar cronômetro"
            >
              <RotateCcw size={24} />
            </button>
          </div>
        )}

        {/* Audio Selector */}
        {audios.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-xl">
            {audios.map((audio, index) => (
              <button
                key={audio.id}
                onClick={() => handleSelectAudio(index)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm',
                  index === selectedAudioIndex
                    ? 'bg-gold/20 border-gold/50 text-gold'
                    : 'bg-secondary border-border text-muted-foreground hover:border-gold/30'
                )}
              >
                <Music size={14} />
                {audio.nome || `Áudio ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Timer Settings */}
        <div className="flex items-center gap-3 mb-8">
          <Clock size={18} className="text-muted-foreground" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={useTimerEnabled}
              onChange={(e) => setUseTimerEnabled(e.target.checked)}
              className="rounded border-border bg-secondary text-gold focus:ring-gold w-5 h-5"
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
                className="w-20 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:border-gold focus:ring-1 focus:ring-gold"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </>
          )}
        </div>

        {/* Play Controls */}
        <div className="flex items-center gap-4">
          {!isActive ? (
            <Button
              onClick={handlePlayWithTimer}
              disabled={audios.length === 0}
              size="lg"
              className={cn(
                'gap-3 px-8 py-6 text-lg rounded-xl transition-all',
                audios.length > 0
                  ? 'bg-gold hover:bg-gold-glow text-background shadow-lg hover:shadow-gold/30'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'
              )}
            >
              <Play size={28} />
              Iniciar
            </Button>
          ) : (
            <>
              {isPlaying ? (
                <Button
                  onClick={handlePause}
                  size="lg"
                  className="gap-3 px-8 py-6 text-lg rounded-xl bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40"
                  variant="outline"
                >
                  <Pause size={28} />
                  Pausar
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  size="lg"
                  className="gap-3 px-8 py-6 text-lg rounded-xl bg-gold hover:bg-gold-glow text-background shadow-lg"
                >
                  <Play size={28} />
                  Continuar
                </Button>
              )}
              <Button
                onClick={handleStop}
                size="lg"
                variant="outline"
                className="gap-3 px-6 py-6 text-lg rounded-xl bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30"
              >
                <Square size={28} />
                Parar
              </Button>
            </>
          )}
        </div>

        {/* No Audio Warning */}
        {audios.length === 0 && (
          <p className="text-sm text-gold/60 mt-4 flex items-center gap-2">
            <Music size={16} />
            Sem áudio configurado para esta etapa
          </p>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="flex items-center justify-between px-4 py-4 border-t border-border bg-card">
        <Button
          onClick={handlePrevStage}
          disabled={selectedStageIndex === 0}
          variant="ghost"
          size="lg"
          className={cn(
            'gap-2 px-6',
            selectedStageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <ChevronLeft size={24} />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Stage Indicators */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] py-2">
          {stages.map((stage, index) => (
            <button
              key={stage.id}
              onClick={() => {
                if (isActive) handleStop();
                setSelectedStageIndex(index);
              }}
              className={cn(
                'w-3 h-3 rounded-full transition-all shrink-0',
                index === selectedStageIndex
                  ? 'bg-gold w-8'
                  : currentStageId === stage.id && status !== 'idle'
                    ? 'bg-gold/50'
                    : 'bg-border hover:bg-muted-foreground'
              )}
              title={stage.nome_simbolico}
            />
          ))}
        </div>

        <Button
          onClick={handleNextStage}
          disabled={selectedStageIndex === stages.length - 1}
          variant="ghost"
          size="lg"
          className={cn(
            'gap-2 px-6',
            selectedStageIndex === stages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight size={24} />
        </Button>
      </footer>

      {/* Keyboard Hints */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-muted-foreground/50">
        <span>← → navegar</span>
        <span>espaço play/pause</span>
        <span>esc sair</span>
      </div>
    </div>
  );
}
