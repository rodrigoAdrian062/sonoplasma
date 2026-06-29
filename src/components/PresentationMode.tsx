import { useState, useEffect, useCallback } from 'react';
import { useClock } from '@/hooks/useClock';
import { ElegantClock } from './ElegantClock';
import { SessionStopwatch } from './SessionStopwatch';
import { X, Play, Pause, Square, ChevronLeft, ChevronRight, Maximize, Minimize, Music, Clock, RotateCcw, Volume2, VolumeX, Keyboard, SkipBack, SkipForward, SlidersHorizontal } from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { EqualizerPanel } from './EqualizerPanel';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { EQSettings } from '@/hooks/useUniversalAudioPlayer';
import presentationBanner from '@/assets/presentation-banner.png';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface PresentationModeProps {
  stages: CeremonyStage[];
  audiosByStageId: Record<string, StageAudio[]>;
  currentStageId: string | null;
  status: 'idle' | 'playing' | 'paused';
  volume: number;
  currentTime: number;
  duration: number;
  onVolumeChange: (value: number) => void;
  onPlay: (stageId: string, audioUrl: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClose: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onSeekTo?: (seconds: number) => void;
  settings?: {
    nome_app?: string;
    logo_url?: string | null;
  } | null;
  eq?: EQSettings;
  onEQChange?: (settings: Partial<EQSettings>) => void;
}

export function PresentationMode({
  stages,
  audiosByStageId,
  currentStageId,
  status,
  volume,
  onVolumeChange,
  onPlay,
  onPause,
  onResume,
  onStop,
  onClose,
  onSeekForward,
  onSeekBackward,
  onSeekTo,
  settings,
  currentTime: audioCurrentTime,
  duration: audioDuration,
  eq,
  onEQChange,
}: PresentationModeProps) {
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customTime, setCustomTime] = useState(0);
  const [useTimerEnabled, setUseTimerEnabled] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [showEQ, setShowEQ] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const { formatted: clockTime } = useClock();

  const currentStage = stages[selectedStageIndex];
  const audios = currentStage ? audiosByStageId[currentStage.id] || [] : [];
  const currentAudio = audios[selectedAudioIndex];
  const isActive = currentStageId === currentStage?.id && (status === 'playing' || status === 'paused');
  const isPlaying = currentStageId === currentStage?.id && status === 'playing';
  const isPaused = currentStageId === currentStage?.id && status === 'paused';
  const isMuted = volume === 0;

  const timer = useTimer(() => {
    onStop();
  });

  useEffect(() => {
    if (currentStage) {
      const defaultTime = currentStage.tempo_padrao || 0;
      setCustomTime(defaultTime);
      setUseTimerEnabled(defaultTime > 0);
    }
    setSelectedAudioIndex(0);
  }, [currentStage?.id]);




  useEffect(() => {
    if (!isActive && timer.isRunning) {
      timer.reset();
    }
  }, [isActive]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowKeyboardHints(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

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

  const handleToggleMute = () => {
    onVolumeChange(isMuted ? 0.7 : 0);
  };

  const handleVolumeUp = () => {
    onVolumeChange(Math.min(1, volume + 0.1));
  };

  const handleVolumeDown = () => {
    onVolumeChange(Math.max(0, volume - 0.1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setShowKeyboardHints(true);
      switch (e.key) {
        case 'ArrowLeft':
          if (selectedStageIndex > 0) setSelectedStageIndex(prev => prev - 1);
          break;
        case 'ArrowRight':
          if (selectedStageIndex < stages.length - 1) setSelectedStageIndex(prev => prev + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeDown();
          break;
        case ' ' :
          e.preventDefault();
          if (isPlaying) handlePause();
          else if (isPaused) handleResume();
          else if (currentAudio) handlePlayWithTimer();
          break;
        case 'm':
        case 'M':
          handleToggleMute();
          break;
        case 'Escape':
          if (!document.fullscreenElement) onClose();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
      setTimeout(() => setShowKeyboardHints(false), 3000);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStageIndex, stages.length, isPlaying, isPaused, currentAudio, volume]);

  const handlePlayWithTimer = () => {
    if (!currentAudio || !currentStage) return;
    if (useTimerEnabled && customTime > 0) timer.start(customTime);
    onPlay(currentStage.id, currentAudio.audio_url);
  };

  const handlePause = () => {
    if (timer.isRunning) timer.pause();
    onPause();
  };

  const handleResume = () => {
    if (timer.isPaused) timer.resume();
    onResume();
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header - responsive */}
      <header className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate hidden sm:block">
            {settings?.nome_app || 'Apresentação'}
          </span>
          <SessionStopwatch />
          <ElegantClock size="sm" />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Volume toggle for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowVolume(!showVolume)}
            className="h-8 w-8 text-muted-foreground hover:text-gold sm:hidden"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </Button>

          {/* Desktop volume */}
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-secondary rounded-lg">
            <button
              onClick={handleToggleMute}
              className="text-muted-foreground hover:text-gold transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={5}
              className="w-16"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {eq && onEQChange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEQ(!showEQ)}
              className={`h-8 w-8 ${showEQ ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}
            >
              <SlidersHorizontal size={16} />
            </Button>
          )}

          <span className="text-xs text-muted-foreground px-1">
            {selectedStageIndex + 1}/{stages.length}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-muted-foreground hover:text-gold hidden sm:flex"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Mobile volume slider - expandable */}
        {showVolume && (
          <div className="w-full flex items-center gap-2 px-1 py-1 sm:hidden animate-fade-in">
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}

        {/* Header Progress Bar */}
        {isActive && audioDuration > 0 && (
          <div className="w-full flex items-center gap-2 mt-1">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono w-8 sm:w-10 text-right">
              {formatTime(audioCurrentTime)}
            </span>
            <div
              className="flex-1 h-1 sm:h-1.5 bg-secondary rounded-full cursor-pointer relative group"
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
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gold rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono w-8 sm:w-10">
              {formatTime(audioDuration)}
            </span>
          </div>
        )}

        {/* EQ Panel */}
        {showEQ && eq && onEQChange && (
          <div className="w-full mt-2 animate-fade-in">
            <EqualizerPanel eq={eq} onEQChange={onEQChange} />
          </div>
        )}
      </header>

      {/* Main Content - scrollable on mobile */}
      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 relative overflow-y-auto">
        {/* Background Banner */}
        <img 
          src={presentationBanner} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/70 to-background pointer-events-none" />

        {/* Large Diagonal Volume Control - desktop side */}
        <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 z-20 flex-col items-center">
          <div className="rotate-[-45deg] flex flex-col items-center gap-5 bg-card/70 backdrop-blur-md border border-gold/20 rounded-3xl px-6 py-8 shadow-2xl shadow-black/40">
            <span className="text-base font-mono text-gold font-bold rotate-[45deg]">
              {Math.round(volume * 100)}%
            </span>
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={5}
              orientation="vertical"
              className="h-64"
            />
            <button
              onClick={handleToggleMute}
              className="text-gold hover:text-gold-glow transition-colors rotate-[45deg]"
              title={isMuted ? 'Reativar som' : 'Silenciar'}
            >
              {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
            </button>
          </div>
        </div>


        {/* Central Card - responsive sizing */}
        <div className="relative z-10 w-full max-w-2xl bg-card/80 backdrop-blur-md border border-gold/15 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-10 shadow-2xl shadow-black/30 flex flex-col items-center my-auto">
          {/* Active Glow */}
          {isActive && (
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-radial from-gold/5 via-transparent to-transparent pointer-events-none" />
          )}

          {/* Stage Icon - smaller on mobile */}
          <div
            className={cn(
              'rounded-2xl sm:rounded-3xl mb-3 sm:mb-5 transition-all duration-500 overflow-hidden',
              (currentStage as any).icone_url ? 'p-0' : 'p-4 sm:p-6 md:p-8',
              isActive 
                ? 'bg-gold/20 text-gold scale-105 sm:scale-110 shadow-[0_0_40px_rgba(212,175,55,0.3)]' 
                : 'bg-secondary text-muted-foreground'
            )}
          >
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={(currentStage as any).icone_url} 
              size={(currentStage as any).icone_url ? 96 : 48} 
              className="sm:hidden"
            />
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={(currentStage as any).icone_url} 
              size={(currentStage as any).icone_url ? 128 : 64} 
              className="hidden sm:block"
            />
          </div>

          {/* Stage Name */}
          <h1 className="font-display text-xl sm:text-2xl md:text-4xl font-bold text-foreground text-center mb-1 sm:mb-2">
            {currentStage.nome_simbolico}
          </h1>

          {/* Description */}
          {currentStage.descricao && (
            <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mb-3 sm:mb-5 line-clamp-2 sm:line-clamp-none">
              {currentStage.descricao}
            </p>
          )}

          {/* Timer Display */}
          {(timer.isRunning || timer.isPaused) && (
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-5 animate-fade-in">
              <TimerDisplay 
                seconds={timer.timeRemaining} 
                isActive={timer.isRunning && !timer.isPaused}
                size="lg"
              />
              <button
                onClick={() => timer.reset()}
                className="p-1.5 sm:p-2 text-muted-foreground hover:text-gold transition-colors rounded-lg hover:bg-secondary"
                aria-label="Resetar cronômetro"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          )}

          {/* Audio Selector - horizontal scroll on mobile */}
          {audios.length > 0 && (
            <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 max-w-full overflow-x-auto pb-1 scrollbar-none">
              {audios.map((audio, index) => (
                <button
                  key={audio.id}
                  onClick={() => handleSelectAudio(index)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all text-xs sm:text-sm whitespace-nowrap shrink-0',
                    index === selectedAudioIndex
                      ? 'bg-gold/20 border-gold/50 text-gold'
                      : 'bg-secondary border-border text-muted-foreground hover:border-gold/30'
                  )}
                >
                  <Music size={12} className="sm:hidden" />
                  <Music size={14} className="hidden sm:block" />
                  {audio.nome || `Áudio ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Timer Settings - compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Clock size={16} className="text-muted-foreground shrink-0" />
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={useTimerEnabled}
                onChange={(e) => setUseTimerEnabled(e.target.checked)}
                className="rounded border-border bg-secondary text-gold focus:ring-gold w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="hidden sm:inline">Cronômetro</span>
              <span className="sm:hidden">Timer</span>
            </label>
            {useTimerEnabled && (
              <>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={Math.floor(customTime / 60)}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 1)}
                  className="w-14 sm:w-20 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-secondary border border-border rounded-lg text-foreground focus:border-gold focus:ring-1 focus:ring-gold"
                />
                <span className="text-xs sm:text-sm text-muted-foreground">min</span>
              </>
            )}
          </div>

          {/* Play Controls - responsive */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {!isActive ? (
              <Button
                onClick={handlePlayWithTimer}
                disabled={audios.length === 0}
                size="lg"
                className={cn(
                  'gap-2 sm:gap-3 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-xl transition-all',
                  audios.length > 0
                    ? 'bg-gold hover:bg-gold-glow text-background shadow-lg hover:shadow-gold/30'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                )}
              >
                <Play size={22} className="sm:hidden" />
                <Play size={28} className="hidden sm:block" />
                Iniciar
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => onSeekTo?.(0)}
                  variant="outline"
                  className="px-3 sm:px-4 py-3 sm:py-6 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30"
                  title="Reiniciar"
                >
                  <RotateCcw size={20} className="sm:hidden" />
                  <RotateCcw size={24} className="hidden sm:block" />
                </Button>
                <Button
                  onClick={onSeekBackward}
                  variant="outline"
                  className="px-3 sm:px-4 py-3 sm:py-6 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30"
                  title="Retroceder 10s"
                >
                  <SkipBack size={20} className="sm:hidden" />
                  <SkipBack size={24} className="hidden sm:block" />
                </Button>
                {isPlaying ? (
                  <Button
                    onClick={handlePause}
                    className="gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-6 text-base sm:text-lg rounded-xl bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40"
                    variant="outline"
                  >
                    <Pause size={22} className="sm:hidden" />
                    <Pause size={28} className="hidden sm:block" />
                    <span className="hidden sm:inline">Pausar</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    className="gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-6 text-base sm:text-lg rounded-xl bg-gold hover:bg-gold-glow text-background shadow-lg"
                  >
                    <Play size={22} className="sm:hidden" />
                    <Play size={28} className="hidden sm:block" />
                    <span className="hidden sm:inline">Continuar</span>
                  </Button>
                )}
                <Button
                  onClick={onSeekForward}
                  variant="outline"
                  className="px-3 sm:px-4 py-3 sm:py-6 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30"
                  title="Avançar 10s"
                >
                  <SkipForward size={20} className="sm:hidden" />
                  <SkipForward size={24} className="hidden sm:block" />
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  className="gap-1.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-6 text-base sm:text-lg rounded-xl bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30"
                >
                  <Square size={20} className="sm:hidden" />
                  <Square size={28} className="hidden sm:block" />
                  <span className="hidden sm:inline">Parar</span>
                </Button>
              </>
            )}
          </div>

          {/* No Audio Warning */}
          {audios.length === 0 && (
            <p className="text-xs sm:text-sm text-gold/60 mt-3 sm:mt-4 flex items-center gap-2">
              <Music size={14} />
              Sem áudio configurado
            </p>
          )}
        </div>
      </main>

      {/* Navigation Footer - responsive */}
      <footer className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-border bg-card shrink-0">
        <Button
          onClick={handlePrevStage}
          disabled={selectedStageIndex === 0}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 sm:gap-2 px-2 sm:px-6',
            selectedStageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <ChevronLeft size={18} className="sm:hidden" />
          <ChevronLeft size={24} className="hidden sm:block" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Timeline - scrollable */}
        <div className="flex items-center gap-0 overflow-x-auto max-w-[55vw] sm:max-w-[60vw] py-1 sm:py-2 scrollbar-none">
          {stages.map((stage, index) => {
            const isSelected = index === selectedStageIndex;
            const isPlayingStage = currentStageId === stage.id && status !== 'idle';
            const isPast = index < selectedStageIndex;

            return (
              <div key={stage.id} className="flex items-center shrink-0">
                <button
                  onClick={() => {
                    if (isActive) handleStop();
                    setSelectedStageIndex(index);
                  }}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 group"
                  title={stage.nome_simbolico}
                >
                  <div
                    className={cn(
                      'w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all',
                      isSelected
                        ? 'bg-gold border-gold scale-125 shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                        : isPlayingStage
                          ? 'bg-gold/50 border-gold/50'
                          : isPast
                            ? 'bg-gold/30 border-gold/40'
                            : 'bg-secondary border-border group-hover:border-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[8px] sm:text-[10px] max-w-[40px] sm:max-w-[60px] truncate transition-colors',
                      isSelected ? 'text-gold font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                </button>
                {index < stages.length - 1 && (
                  <div
                    className={cn(
                      'w-4 sm:w-6 h-0.5 mx-0.5 transition-colors',
                      isPast ? 'bg-gold/40' : 'bg-border'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleNextStage}
          disabled={selectedStageIndex === stages.length - 1}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 sm:gap-2 px-2 sm:px-6',
            selectedStageIndex === stages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight size={18} className="sm:hidden" />
          <ChevronRight size={24} className="hidden sm:block" />
        </Button>
      </footer>

      {/* Keyboard Hints - hidden on mobile */}
      <div 
        className={cn(
          'absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 transition-all duration-300 hidden sm:block',
          showKeyboardHints ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-card/90 backdrop-blur-sm rounded-xl border border-border shadow-lg">
          <Keyboard size={14} className="text-gold mr-2" />
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">Espaço</kbd>
          <span className="text-[10px] text-muted-foreground mr-2">play</span>
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">← →</kbd>
          <span className="text-[10px] text-muted-foreground mr-2">etapas</span>
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">↑ ↓</kbd>
          <span className="text-[10px] text-muted-foreground mr-2">vol</span>
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">M</kbd>
          <span className="text-[10px] text-muted-foreground mr-2">mudo</span>
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">F</kbd>
          <span className="text-[10px] text-muted-foreground mr-2">fullscreen</span>
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-foreground">ESC</kbd>
          <span className="text-[10px] text-muted-foreground">sair</span>
        </div>
      </div>
    </div>
  );
}
