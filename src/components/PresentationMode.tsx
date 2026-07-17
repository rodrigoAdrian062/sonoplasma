import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useClock } from '@/hooks/useClock';

import { ElegantClock } from './ElegantClock';
import { SessionStopwatch } from './SessionStopwatch';

import { X, Play, Pause, Square, ChevronLeft, ChevronRight, Maximize, Minimize, Music, Clock, RotateCcw, Volume2, VolumeX, Keyboard, SkipBack, SkipForward, SlidersHorizontal, Check, Shrink, Expand, HelpCircle, Trash2, Plus, Minus, ScrollText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useRoteiroBySection } from '@/hooks/useRoteiros';
import { parseRoteiro, paginateBlocks, RoteiroBlock } from '@/lib/roteiroFormat';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { EqualizerPanel } from './EqualizerPanel';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { setPresentationActive } from '@/lib/presentationState';
import { cn } from '@/lib/utils';
import type { EQSettings } from '@/hooks/useUniversalAudioPlayer';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useStageAudios } from '@/hooks/useStageAudios';
import { AudioLines } from 'lucide-react';
import { AudioSourceIcon, getAudioSource, type AudioSource } from '@/components/AudioSourceIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { FolderMusicIcon } from '@/components/icons/FolderMusicIcon';


import presentationBanner from '@/assets/presentation-banner.png';
import { PresentationHeaderBgMusic } from './PresentationHeaderBgMusic';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface PresentationModeProps {
  stages: CeremonyStage[];
  audiosByStageId: Record<string, StageAudio[]>;
  currentStageId: string | null;
  currentUrl?: string | null;
  secaoId?: string;
  secaoNome?: string;

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
  currentUrl,
  secaoId,
  secaoNome,

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
  // Restaura a etapa que está tocando ao abrir a apresentação
  const initialStageIndex = (() => {
    if (currentStageId) {
      const idx = stages.findIndex((s) => s.id === currentStageId);
      if (idx >= 0) return idx;
    }
    return 0;
  })();
  const initialAudioIndex = (() => {
    if (currentStageId && currentUrl) {
      const idx = stages.findIndex((s) => s.id === currentStageId);
      if (idx >= 0) {
        const list = audiosByStageId[stages[idx].id] || [];
        const aIdx = list.findIndex((a) => a.audio_url === currentUrl);
        if (aIdx >= 0) return aIdx;
      }
    }
    return 0;
  })();

  const [selectedStageIndex, setSelectedStageIndex] = useState(initialStageIndex);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(initialAudioIndex);
  const didInitRef = useRef(true);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customTime, setCustomTime] = useState(0);
  const [useTimerEnabled, setUseTimerEnabled] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [pinKeyboardHints, setPinKeyboardHints] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const focusMode = false;
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | AudioSource>('all');
  const [audioToDelete, setAudioToDelete] = useState<StageAudio | null>(null);
  const [showRoteiro, setShowRoteiro] = useState(false);
  const [roteiroPage, setRoteiroPage] = useState(0);
  const [roteiroGoto, setRoteiroGoto] = useState('');
  const [activeCueKey, setActiveCueKey] = useState<string | null>(null);
  const [hoverLineIdx, setHoverLineIdx] = useState<number | null>(null);
  const { deleteAudio } = useStageAudios();
  const { data: roteiro } = useRoteiroBySection(secaoId);
  const { audios: libraryAudios } = useAudioLibrary();
  const roteiroBlocks = roteiro ? parseRoteiro(roteiro.conteudo) : [];
  const roteiroPages = roteiro ? paginateBlocks(roteiroBlocks, 900) : [];
  const roteiroTotalPages = Math.max(1, roteiroPages.length);
  const roteiroCurrentPage = roteiroPages[Math.min(roteiroPage, roteiroTotalPages - 1)] || [];
  const stagesById = new Map(stages.map((s) => [s.id, s] as const));
  const libraryById = new Map(libraryAudios.map((a) => [a.id, a] as const));

  const fireRoteiroCue = (block: { type: 'cue'; etapaId: string } | { type: 'track'; audioId: string }) => {
    const key = block.type === 'cue' ? `cue:${block.etapaId}` : `track:${block.audioId}`;
    setActiveCueKey(key);
    if (block.type === 'cue') {
      const stage = stagesById.get(block.etapaId);
      if (!stage) { toast.error('Etapa não encontrada'); return; }
      const list = audiosByStageId[stage.id] || [];
      if (!list.length) { toast.error(`"${stage.nome_simbolico}" sem áudio`); return; }
      const idx = stages.findIndex((s) => s.id === stage.id);
      if (idx >= 0) setSelectedStageIndex(idx);
      onPlay(stage.id, list[0].audio_url);
      toast.success(`▶ ${stage.nome_simbolico}`);
    } else {
      const tr = libraryById.get(block.audioId);
      if (!tr) { toast.error('Faixa não encontrada'); return; }
      onPlay(`track:${tr.id}`, tr.audio_url);
      toast.success(`▶ ${tr.nome}`);
    }
  };

  const handleConfirmDeleteAudio = () => {
    if (!audioToDelete) return;
    if (currentStageId === audioToDelete.etapa_id && currentUrl === audioToDelete.audio_url) {
      onStop();
    }
    deleteAudio.mutate({ id: audioToDelete.id, etapa_id: audioToDelete.etapa_id });
    setSelectedAudioIndex(0);
    setAudioToDelete(null);
  };

  // Modo compacto: reduz textos e botões quando há muitas etapas/músicas
  const totalAudios = stages.reduce((n, s) => n + (audiosByStageId[s.id]?.length || 0), 0);
  const shouldAutoCompact = stages.length > 8 || totalAudios > 12;
  const [compact, setCompact] = useState(shouldAutoCompact);

  const { formatted: clockTime } = useClock();
  const { fadeEnabled, setFadeEnabled } = useUniversalAudioPlayer();

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
    if (status === 'idle') setActiveCueKey(null);
  }, [status]);

  useEffect(() => {
    if (currentStage) {
      const defaultTime = currentStage.tempo_padrao || 0;
      setCustomTime(defaultTime);
      setUseTimerEnabled(defaultTime > 0);
    }
    // Não reseta o áudio na primeira montagem (preserva a música em reprodução)
    if (didInitRef.current) {
      didInitRef.current = false;
      return;
    }
    setSelectedAudioIndex(0);
  }, [currentStage?.id]);





  useEffect(() => {
    if (!isActive && timer.isRunning) {
      timer.reset();
    }
  }, [isActive]);

  useEffect(() => {
    setPresentationActive(true);
    return () => setPresentationActive(false);
  }, []);

  // Modo foco: mantém a tela ativa (Wake Lock) e reivindica a sessão de mídia
  // para reduzir interrupções de sons/alertas de outros apps durante a apresentação.
  useEffect(() => {
    if (!focusMode) return;
    let wakeLock: any = null;
    let released = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        /* ignora se não suportado */
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !released) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Media Session: informa ao sistema que este app está reproduzindo áudio
    if ('mediaSession' in navigator) {
      try {
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
          title: 'Apresentação em andamento',
          artist: 'Sonoplastia',
        });
        (navigator as any).mediaSession.playbackState = 'playing';
      } catch {
        /* ignora */
      }
    }

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        try { wakeLock.release(); } catch { /* ignora */ }
      }
      if ('mediaSession' in navigator) {
        try { (navigator as any).mediaSession.playbackState = 'none'; } catch { /* ignora */ }
      }
    };
  }, [focusMode]);



  useEffect(() => {
    if (pinKeyboardHints) return;
    const timeout = setTimeout(() => {
      setShowKeyboardHints(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [pinKeyboardHints]);

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el: any = containerRef.current || document.documentElement;
        const request =
          el.requestFullscreen ||
          el.webkitRequestFullscreen ||
          el.webkitRequestFullScreen ||
          el.mozRequestFullScreen ||
          el.msRequestFullscreen;
        if (!request) {
          toast.error('Tela cheia não é suportada neste navegador.');
          return;
        }
        await request.call(el);
        setIsFullscreen(true);
      } else {
        const exit: any =
          document.exitFullscreen ||
          (document as any).webkitExitFullscreen ||
          (document as any).mozCancelFullScreen ||
          (document as any).msExitFullscreen;
        await exit.call(document);
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      toast.error('Não foi possível abrir em tela cheia. Se estiver na pré-visualização, abra o app publicado.');
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

  // Ajuste fino do volume (aos poucos)
  const handleVolumeFineUp = () => {
    onVolumeChange(Math.min(1, Math.round((volume + 0.02) * 100) / 100));
  };

  const handleVolumeFineDown = () => {
    onVolumeChange(Math.max(0, Math.round((volume - 0.02) * 100) / 100));
  };

  // Rolagem do mouse sobre o controle de volume
  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.02 : -0.02;
    onVolumeChange(Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100)));
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
          handleVolumeFineUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeFineDown();
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
          if (!document.fullscreenElement) handleClose();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
      if (!pinKeyboardHints) setTimeout(() => setShowKeyboardHints(false), 3000);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStageIndex, stages.length, isPlaying, isPaused, currentAudio, volume, pinKeyboardHints]);

  // Rolagem do mouse em qualquer lugar da apresentação ajusta o volume
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      // Permitir rolagem normal dentro do painel do roteiro
      if (target && target.closest('[data-roteiro-scroll]')) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.02 : -0.02;
      onVolumeChange(Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100)));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [volume, onVolumeChange]);


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
    const audio = audios[index];
    if (currentStage && audio) {
      try {
        localStorage.setItem(`presMode:selectedAudio:${currentStage.id}`, audio.audio_url);
      } catch {
        // ignore storage errors
      }
    }
  };

  // Restaura a música salva sempre que a etapa selecionada muda
  useEffect(() => {
    if (!currentStage) return;
    if (currentStageId === currentStage.id) return; // não sobrescreve o que está tocando
    try {
      const savedUrl = localStorage.getItem(`presMode:selectedAudio:${currentStage.id}`);
      if (!savedUrl) return;
      const list = audiosByStageId[currentStage.id] || [];
      const idx = list.findIndex((a) => a.audio_url === savedUrl);
      if (idx >= 0) setSelectedAudioIndex(idx);
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStageIndex]);

  const handleClose = () => {
    if (status === 'playing' || status === 'paused') {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  };

  const handleKeepPlaying = () => {
    setShowExitDialog(false);
    onClose();
  };

  const handleStopAndExit = () => {
    setShowExitDialog(false);
    onStop();
    onClose();
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
    <div ref={containerRef} className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header - responsive */}
      <header className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-gold/10 bg-card/70 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate hidden sm:block">
            {settings?.nome_app || 'Apresentação'}
          </span>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <SessionStopwatch />
            </div>
            <ElegantClock size="sm" />
            
          </div>
          <PresentationHeaderBgMusic />
          {roteiro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoteiro((v) => !v)}
              title={showRoteiro ? 'Ocultar roteiro' : 'Mostrar roteiro'}
              className={cn(
                'h-8 gap-1.5 px-2 border border-gold/20',
                showRoteiro ? 'text-gold bg-gold/10' : 'text-muted-foreground hover:text-gold'
              )}
            >
              {showRoteiro ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              <ScrollText size={14} />
              <span className="hidden sm:inline text-xs">Roteiro</span>
            </Button>
          )}
        </div>

        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">





          {!focusMode && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFadeEnabled(!fadeEnabled)}
                title={fadeEnabled ? 'Fade ativado (diminui o volume ao pausar/parar)' : 'Fade desativado (para o som de imediato)'}
                className={`h-8 w-8 ${fadeEnabled ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}
              >
                <AudioLines size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPinKeyboardHints((prev) => {
                    const next = !prev;
                    setShowKeyboardHints(next);
                    return next;
                  });
                }}
                title={pinKeyboardHints ? 'Ocultar atalhos do teclado' : 'Manter atalhos do teclado visíveis'}
                className={cn(
                  'h-8 w-8 hover:text-gold hidden sm:inline-flex',
                  pinKeyboardHints ? 'text-gold' : 'text-muted-foreground'
                )}
              >
                <Keyboard size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                title="Ajuda e atalhos"
                className="h-8 w-8 text-muted-foreground hover:text-gold"
              >
                <HelpCircle size={16} />
              </Button>

            </>
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
            onClick={handleClose}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Mobile volume slider - expandable */}
        {showVolume && (
          <div className="w-full flex items-center gap-2 px-1 py-1 sm:hidden animate-fade-in">
            <button
              onClick={handleVolumeFineDown}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-gold shrink-0"
              title="Diminuir aos poucos"
            >
              <Minus size={16} />
            </button>
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
            <button
              onClick={handleVolumeFineUp}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-gold shrink-0"
              title="Aumentar aos poucos"
            >
              <Plus size={16} />
            </button>
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
      </header>

      {/* Main Content - scrollable on mobile */}
      <main className={`flex-1 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 relative overflow-y-auto transition-[padding] duration-200 ${showRoteiro && roteiro ? 'sm:pl-[480px] md:pl-[560px] lg:pl-[640px]' : ''}`}>
        {/* Background Banner */}
        <img 
          src={presentationBanner} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/70 to-background pointer-events-none" />

        {/* Roteiro Side Panel */}
        {showRoteiro && roteiro && (
          <aside className="absolute left-0 top-0 bottom-0 z-30 w-full sm:w-[380px] md:w-[440px] lg:w-[500px] max-w-[92vw] bg-card/95 backdrop-blur-xl border-r border-gold/20 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold/10 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gold/70">Roteiro</div>
                <div className="text-sm font-semibold truncate">{roteiro.titulo}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRoteiro(false)}
                className="h-8 w-8 text-muted-foreground hover:text-gold shrink-0"
                title="Ocultar"
              >
                <PanelLeftClose size={16} />
              </Button>
            </div>
            <div data-roteiro-scroll className="flex-1 overflow-y-auto px-6 py-5 font-serif text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
              {roteiroBlocks.length === 0 && (
                <div className="text-muted-foreground italic">Roteiro vazio.</div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground/60 mb-2 text-right">
                pág. {Math.min(roteiroPage, roteiroTotalPages - 1) + 1} / {roteiroTotalPages}
              </div>
              {(() => {
                // Agrupar blocos da página em parágrafos (linhas de leitura)
                const paragraphs: RoteiroBlock[][] = [];
                let cur: RoteiroBlock[] = [];
                roteiroCurrentPage.forEach((b) => {
                  if (b.type === 'page') return;
                  if (b.type === 'text') {
                    const parts = b.text.split(/\n\s*\n/);
                    parts.forEach((p, i) => {
                      if (i > 0) { if (cur.length) paragraphs.push(cur); cur = []; }
                      if (p) cur.push({ type: 'text', text: p } as RoteiroBlock);
                    });
                  } else {
                    cur.push(b);
                  }
                });
                if (cur.length) paragraphs.push(cur);

                return paragraphs.map((para, pIdx) => {
                  const paraKeys = para
                    .map((b) => b.type === 'cue' ? `cue:${b.etapaId}` : b.type === 'track' ? `track:${b.audioId}` : null)
                    .filter(Boolean) as string[];
                  const hasActive = activeCueKey && paraKeys.includes(activeCueKey);
                  const isHover = hoverLineIdx === pIdx;
                  return (
                    <div
                      key={pIdx}
                      onMouseEnter={() => setHoverLineIdx(pIdx)}
                      onMouseLeave={() => setHoverLineIdx((v) => (v === pIdx ? null : v))}
                      className={[
                        'transition-all duration-200 rounded-lg px-3 py-2 my-1 border border-transparent',
                        hasActive
                          ? 'bg-gold/15 border-gold/60 shadow-[0_0_24px_rgba(212,175,55,0.25)] ring-1 ring-gold/40'
                          : isHover
                            ? 'bg-gold/5 border-gold/20'
                            : '',
                      ].join(' ')}
                    >
                      {para.map((b, i) => {
                        if (b.type === 'text') return <span key={i}>{b.text}</span>;
                        if (b.type === 'page') return null;
                        const key = b.type === 'cue' ? `cue:${b.etapaId}` : `track:${b.audioId}`;
                        const label = b.type === 'cue'
                          ? (stagesById.get(b.etapaId)?.nome_simbolico ?? '⚠ etapa removida')
                          : (libraryById.get(b.audioId)?.nome ?? '⚠ faixa removida');
                        const active = activeCueKey === key;
                        const cueBlock = b;
                        return (
                          <button
                            key={i}
                            onClick={() => fireRoteiroCue(cueBlock)}
                            className={[
                              'inline-flex items-center gap-1.5 my-1 mx-0.5 px-2.5 py-1 rounded-md text-xs font-semibold align-middle transition-all',
                              active
                                ? 'border border-gold bg-gold text-background shadow-[0_0_16px_rgba(212,175,55,0.6)] animate-pulse'
                                : 'border border-gold/40 bg-gold/10 text-gold hover:bg-gold/25',
                            ].join(' ')}
                          >
                            <Play size={12} />
                            <span className="truncate max-w-[260px]">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Navegação de páginas */}
            {roteiro && (
              <div className="border-t border-gold/10 px-3 py-2 flex items-center gap-2 shrink-0 bg-black/30">
                <Button
                  size="icon" variant="ghost"
                  onClick={() => setRoteiroPage((p) => Math.max(0, p - 1))}
                  disabled={roteiroPage === 0}
                  className="h-8 w-8 text-muted-foreground hover:text-gold"
                  title="Página anterior (←)"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs font-mono text-muted-foreground flex-1 text-center">
                  {Math.min(roteiroPage, roteiroTotalPages - 1) + 1} / {roteiroTotalPages}
                </span>
                <Button
                  size="icon" variant="ghost"
                  onClick={() => setRoteiroPage((p) => Math.min(roteiroTotalPages - 1, p + 1))}
                  disabled={roteiroPage >= roteiroTotalPages - 1}
                  className="h-8 w-8 text-muted-foreground hover:text-gold"
                  title="Próxima página (→)"
                >
                  <ChevronRight size={16} />
                </Button>
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = parseInt(roteiroGoto, 10);
                    if (!Number.isNaN(n)) setRoteiroPage(Math.max(0, Math.min(roteiroTotalPages - 1, n - 1)));
                    setRoteiroGoto('');
                  }}
                >
                  <Input
                    value={roteiroGoto}
                    onChange={(e) => setRoteiroGoto(e.target.value.replace(/\D/g, ''))}
                    placeholder="pág."
                    className="h-8 w-14 text-xs"
                  />
                </form>
              </div>
            )}
          </aside>
        )}



        {/* Large Vertical Volume Control - desktop side */}
        <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 z-20 flex-col items-center">
          <div
            className="flex flex-col items-center gap-4 bg-card/70 backdrop-blur-md border border-gold/20 rounded-3xl px-6 py-6 shadow-2xl shadow-black/40"
            onWheel={handleVolumeWheel}
            title="Role o mouse para ajustar o volume aos poucos"
          >
            <span className="text-base font-mono text-gold font-bold">
              {Math.round(volume * 100)}%
            </span>
            {/* Ajuste fino: aumentar aos poucos */}
            <button
              onClick={handleVolumeFineUp}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gold/10 hover:bg-gold/25 text-gold border border-gold/30 transition-colors"
              title="Aumentar volume aos poucos (+2%)"
            >
              <Plus size={20} />
            </button>
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={1}
              orientation="vertical"
              className="h-56"
            />
            {/* Ajuste fino: diminuir aos poucos */}
            <button
              onClick={handleVolumeFineDown}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gold/10 hover:bg-gold/25 text-gold border border-gold/30 transition-colors"
              title="Diminuir volume aos poucos (-2%)"
            >
              <Minus size={20} />
            </button>
            <button
              onClick={handleToggleMute}
              className="text-gold hover:text-gold-glow transition-colors"
              title={isMuted ? 'Reativar som' : 'Silenciar'}
            >
              {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            </button>
          </div>
        </div>



        {/* Central Card - responsive sizing */}
        <div className={cn('relative z-10 w-full max-w-2xl bg-gradient-to-br from-card/90 via-card/70 to-card/40 backdrop-blur-xl border border-gold/20 ring-1 ring-white/5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 flex flex-col items-center my-auto', compact ? 'p-3 sm:p-5 md:p-6' : 'p-4 sm:p-6 md:p-10')}>
          {/* Active Glow */}
          {isActive && (
            <>
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-radial from-gold/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute -inset-px rounded-2xl sm:rounded-3xl border border-gold/40 pointer-events-none animate-pulse" />
            </>
          )}
          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-2/3 bg-gradient-to-r from-transparent via-gold/70 to-transparent rounded-full" />

          {/* Stage Icon - smaller on mobile */}
          <div
            className={cn(
              'rounded-2xl sm:rounded-3xl transition-all duration-500 overflow-hidden ring-1',
              compact ? 'mb-2 sm:mb-3' : 'mb-3 sm:mb-5',
              (currentStage as any).icone_url ? 'p-0' : compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6 md:p-8',
              isActive 
                ? 'bg-gold/20 text-gold scale-105 sm:scale-110 shadow-[0_0_50px_rgba(212,175,55,0.35)] ring-gold/40' 
                : 'bg-secondary/80 text-muted-foreground ring-border/40'
            )}
          >
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={(currentStage as any).icone_url} 
              size={(currentStage as any).icone_url ? (compact ? 64 : 96) : (compact ? 36 : 48)} 
              className="sm:hidden"
            />
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={(currentStage as any).icone_url} 
              size={(currentStage as any).icone_url ? (compact ? 80 : 128) : (compact ? 44 : 64)} 
              className="hidden sm:block"
            />
          </div>

          {/* Stage Name */}
          <h1 className={cn(
            'font-display font-bold text-center bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent',
            compact ? 'text-lg sm:text-xl md:text-2xl mb-1' : 'text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2'
          )}>
            {currentStage.nome_simbolico}
          </h1>


          {/* Description */}
          {currentStage.descricao && !compact && (
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
          {audios.length > 0 && (() => {
            // Fontes disponíveis nesta etapa
            const sourcesPresent = new Set(audios.map((a) => getAudioSource(a.audio_url, (a as any).tipo)));
            const filterOptions: Array<{ key: 'all' | AudioSource; label: string; icon: JSX.Element }> = [
              { key: 'all', label: 'Todas', icon: <Music size={13} className="shrink-0" /> },
              { key: 'youtube', label: 'YouTube', icon: <YoutubeIcon size={13} className="shrink-0" /> },
              { key: 'spotify', label: 'Spotify', icon: <SpotifyIcon size={13} className="shrink-0 text-[#1DB954]" /> },
              { key: 'file', label: 'Baixado', icon: <FolderMusicIcon size={13} className="shrink-0" /> },
            ];
            const visibleFilters = filterOptions.filter((f) => f.key === 'all' || sourcesPresent.has(f.key as AudioSource));
            const effectiveFilter = sourceFilter !== 'all' && !sourcesPresent.has(sourceFilter as AudioSource) ? 'all' : sourceFilter;
            const filteredAudios = audios
              .map((audio, index) => ({ audio, index }))
              .filter(({ audio }) => effectiveFilter === 'all' || getAudioSource(audio.audio_url, (audio as any).tipo) === effectiveFilter);

            return (
              <div className="w-full mb-4 sm:mb-6">
                {audios.length > 1 && (
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground/70 text-center mb-2">
                    {isActive ? 'Tocando agora' : 'Selecione a música que vai tocar'}
                  </p>
                )}

                {/* Filtro por fonte */}
                {visibleFilters.length > 2 && (
                  <div className="flex justify-start sm:justify-center gap-1.5 mb-3 overflow-x-auto scrollbar-none">
                    {visibleFilters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setSourceFilter(f.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0',
                          effectiveFilter === f.key
                            ? 'bg-gold/15 border-gold/50 text-gold'
                            : 'bg-secondary/60 border-border text-muted-foreground hover:border-gold/30 hover:text-foreground'
                        )}
                      >
                        {f.icon}
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-auto pb-1 scrollbar-none">
                  {filteredAudios.map(({ audio, index }) => {
                    const selected = index === selectedAudioIndex;
                    return (
                      <div
                        key={audio.id}
                        className={cn(
                          'group/pill flex items-center rounded-full border transition-all whitespace-nowrap shrink-0',
                          compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm',
                          selected
                            ? 'bg-gold/25 border-gold text-gold font-semibold ring-2 ring-gold/40 shadow-[0_0_16px_-2px_hsl(var(--gold)/0.4)] scale-[1.03]'
                            : 'bg-secondary border-border text-muted-foreground hover:border-gold/30 hover:text-foreground'
                        )}
                      >
                        <button
                          data-selected={selected}
                          ref={(el) => {
                            if (selected && el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
                          }}
                          onClick={() => handleSelectAudio(index)}
                          className={cn(
                            'flex items-center gap-1.5',
                            compact ? 'pl-2.5 pr-1 py-1' : 'pl-3 pr-1 py-1.5 sm:pl-4 sm:py-2'
                          )}
                        >
                          {selected ? (
                            <Check size={14} className="shrink-0" />
                          ) : (
                            <>
                              <AudioSourceIcon url={audio.audio_url} tipo={(audio as any).tipo} size={12} className="sm:hidden" active={false} />
                              <AudioSourceIcon url={audio.audio_url} tipo={(audio as any).tipo} size={14} className="hidden sm:block" active={false} />
                            </>
                          )}
                          {audio.nome || `Áudio ${index + 1}`}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAudioToDelete(audio);
                          }}
                          title="Excluir música"
                          aria-label={`Excluir ${audio.nome || 'música'}`}
                          className={cn(
                            'flex items-center justify-center rounded-full mr-1 transition-colors text-muted-foreground/70 hover:text-destructive hover:bg-destructive/15',
                            compact ? 'p-0.5' : 'p-1'
                          )}
                        >
                          <Trash2 size={compact ? 12 : 14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}



          {/* Timer Settings - compact on mobile */}
          <div className={cn('flex items-center gap-2 sm:gap-3', compact ? 'mb-3 sm:mb-4' : 'mb-4 sm:mb-6')}>
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
                  'gap-2 sm:gap-3 rounded-xl transition-all',
                  compact ? 'px-5 sm:px-6 py-3 sm:py-4 text-sm sm:text-base' : 'px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg',
                  audios.length > 0
                    ? 'bg-gold hover:bg-gold-glow text-background shadow-lg hover:shadow-gold/30'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                )}
              >
                <Play size={compact ? 18 : 22} className="sm:hidden" />
                <Play size={compact ? 22 : 28} className="hidden sm:block" />
                Iniciar
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => onSeekTo?.(0)}
                  variant="outline"
                  className={cn('rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30', compact ? 'px-2.5 sm:px-3 py-2 sm:py-3' : 'px-3 sm:px-4 py-3 sm:py-6')}
                  title="Reiniciar"
                >
                  <RotateCcw size={compact ? 18 : 20} className="sm:hidden" />
                  <RotateCcw size={compact ? 20 : 24} className="hidden sm:block" />
                </Button>
                <Button
                  onClick={onSeekBackward}
                  variant="outline"
                  className={cn('rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30', compact ? 'px-2.5 sm:px-3 py-2 sm:py-3' : 'px-3 sm:px-4 py-3 sm:py-6')}
                  title="Retroceder 10s"
                >
                  <SkipBack size={compact ? 18 : 20} className="sm:hidden" />
                  <SkipBack size={compact ? 20 : 24} className="hidden sm:block" />
                </Button>
                {isPlaying ? (
                  <Button
                    onClick={handlePause}
                    className={cn('gap-2 sm:gap-3 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40', compact ? 'px-4 sm:px-5 py-2 sm:py-3 text-sm sm:text-base' : 'px-5 sm:px-8 py-3 sm:py-6 text-base sm:text-lg')}
                    variant="outline"
                  >
                    <Pause size={compact ? 18 : 22} className="sm:hidden" />
                    <Pause size={compact ? 22 : 28} className="hidden sm:block" />
                    <span className="hidden sm:inline">Pausar</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    className={cn('gap-2 sm:gap-3 rounded-xl bg-gold hover:bg-gold-glow text-background shadow-lg', compact ? 'px-4 sm:px-5 py-2 sm:py-3 text-sm sm:text-base' : 'px-5 sm:px-8 py-3 sm:py-6 text-base sm:text-lg')}
                  >
                    <Play size={compact ? 18 : 22} className="sm:hidden" />
                    <Play size={compact ? 22 : 28} className="hidden sm:block" />
                    <span className="hidden sm:inline">Continuar</span>
                  </Button>
                )}
                <Button
                  onClick={onSeekForward}
                  variant="outline"
                  className={cn('rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-gold border border-border hover:border-gold/30', compact ? 'px-2.5 sm:px-3 py-2 sm:py-3' : 'px-3 sm:px-4 py-3 sm:py-6')}
                  title="Avançar 10s"
                >
                  <SkipForward size={compact ? 18 : 20} className="sm:hidden" />
                  <SkipForward size={compact ? 20 : 24} className="hidden sm:block" />
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  className={cn('gap-1.5 sm:gap-3 rounded-xl bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30', compact ? 'px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base' : 'px-4 sm:px-6 py-3 sm:py-6 text-base sm:text-lg')}
                >
                  <Square size={compact ? 18 : 20} className="sm:hidden" />
                  <Square size={compact ? 22 : 28} className="hidden sm:block" />
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
      <footer className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-gold/10 bg-card/70 backdrop-blur-xl shrink-0">
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
          showKeyboardHints && !focusMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
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

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="bg-card border-gold/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold">
              <Keyboard size={18} />
              Atalhos e ajuda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              { keys: ['Espaço'], desc: 'Tocar / pausar o áudio' },
              { keys: ['←', '→'], desc: 'Etapa anterior / próxima' },
              { keys: ['↑', '↓'], desc: 'Aumentar / diminuir volume' },
              { keys: ['M'], desc: 'Mudo / ativar som' },
              { keys: ['F'], desc: 'Tela cheia' },
              { keys: ['ESC'], desc: 'Sair da apresentação' },
            ].map((row) => (
              <div key={row.desc} className="flex items-center justify-between gap-3 py-1 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{row.desc}</span>
                <span className="flex items-center gap-1">
                  {row.keys.map((k) => (
                    <kbd key={k} className="px-2 py-0.5 bg-secondary rounded text-xs text-foreground border border-border">
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50 space-y-1">
            <p>• Toque em uma faixa para tocá-la; toque de novo para pausar.</p>
            <p>• O ícone de ondas ativa/desativa o <strong>fade</strong> (volume diminui suave ao pausar/parar).</p>
          </div>
        </DialogContent>
      </Dialog>



      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-card border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gold">
              <Music size={18} />
              Áudio em reprodução
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentAudio?.nome ? (
                <>Ainda há um áudio ativo: <strong className="text-foreground">{currentAudio.nome}</strong>. Deseja continuar ouvindo ao sair da apresentação ou parar o som?</>
              ) : (
                <>Ainda há um áudio ativo. Deseja continuar ouvindo ao sair da apresentação ou parar o som?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleStopAndExit}>
              <Square size={16} className="mr-1" /> Parar e sair
            </Button>
            <Button className="bg-gold text-background hover:bg-gold/90" onClick={handleKeepPlaying}>
              <Play size={16} className="mr-1" /> Continuar ouvindo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!audioToDelete} onOpenChange={(open) => { if (!open) setAudioToDelete(null); }}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={18} />
              Excluir música
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong className="text-foreground">{audioToDelete?.nome || 'esta música'}</strong> desta etapa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setAudioToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteAudio}>
              <Trash2 size={16} className="mr-1" /> Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
