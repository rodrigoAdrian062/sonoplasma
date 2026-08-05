import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, RotateCcw, Pencil, Trash2, Music, ChevronDown, ChevronUp, X, SkipBack, SkipForward, RotateCw, Loader2, Repeat, ArrowDown } from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { TimerDisplay } from './TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { AudioSourceIcon } from '@/components/AudioSourceIcon';
import { TrackHzBadge } from '@/components/TrackHzBadge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { prefetchAudios, isAudioCached, isCacheableAudioUrl } from '@/lib/audioCache';
import { usePrefetchEnabled } from '@/hooks/usePrefetchEnabled';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';

interface StageCardProps {
  stage: CeremonyStage;
  audios: StageAudio[];
  stageNumber?: number;
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
  continuousPlayback?: boolean;
}


export function StageCard({
  stage,
  audios,
  stageNumber,
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
  continuousPlayback = false,
}: StageCardProps) {

  const queryClient = useQueryClient();
  const defaultTime = stage.tempo_padrao || 300;
  const timerKey = `stage:timerSeconds:${stage.id}`;
  const timerEnabledKey = `stage:timerEnabled:${stage.id}`;
  const [customTime, setCustomTime] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(timerKey));
      if (Number.isFinite(saved) && saved >= 60 && saved <= 180 * 60) return saved;
    } catch {}
    return defaultTime;
  });
  const [useTimerEnabled, setUseTimerEnabled] = useState(() => {
    try {
      return localStorage.getItem(timerEnabledKey) !== '0';
    } catch {}
    return true;
  });
  // Persiste as preferências do cronômetro desta etapa
  useEffect(() => {
    try { localStorage.setItem(timerKey, String(customTime)); } catch {}
  }, [customTime, timerKey]);
  useEffect(() => {
    try { localStorage.setItem(timerEnabledKey, useTimerEnabled ? '1' : '0'); } catch {}
  }, [useTimerEnabled, timerEnabledKey]);
  const [loopUntilTimer, setLoopUntilTimer] = useState(false);
  const loopUntilTimerRef = useRef(loopUntilTimer);
  useEffect(() => { loopUntilTimerRef.current = loopUntilTimer; }, [loopUntilTimer]);
  const armedKey = `stage:armedAudio:${stage.id}`;
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(() => {
    try {
      const savedUrl = localStorage.getItem(armedKey);
      if (savedUrl) {
        const idx = audios.findIndex((a) => a.audio_url === savedUrl);
        if (idx >= 0) return idx;
      }
    } catch {}
    return 0;
  });
  // Persist the "armed" (prepared) track per stage.
  useEffect(() => {
    const a = audios[selectedAudioIndex];
    if (!a) return;
    try { localStorage.setItem(armedKey, a.audio_url); } catch {}
  }, [selectedAudioIndex, audios, armedKey]);
  const { currentUrl } = useUniversalAudioPlayer();

  // Sincroniza o índice destacado com o áudio que está realmente tocando
  // (necessário para reprodução contínua quando avança automaticamente).
  useEffect(() => {
    if (!currentUrl) return;
    const idx = audios.findIndex((a) => a.audio_url === currentUrl);
    if (idx >= 0 && idx !== selectedAudioIndex) {
      setSelectedAudioIndex(idx);
    }
  }, [currentUrl, audios, selectedAudioIndex]);

  const [showAudioList, setShowAudioList] = useState(audios.length >= 5);
  const [collapsed, setCollapsed] = useState(true);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (!next) {
        try { window.dispatchEvent(new CustomEvent('stage:expanded', { detail: { id: stage.id } })); } catch {}
      }
      return next;
    });
  };
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id && detail.id !== stage.id) setCollapsed(true);
    };
    window.addEventListener('stage:expanded', handler);
    return () => window.removeEventListener('stage:expanded', handler);
  }, [stage.id]);
  
  const timer = useTimer(() => {
    onStop();
  });

  const isActive = isPlaying || isPaused;
  const hasAudios = audios.length > 0;
  const currentAudio = audios[selectedAudioIndex];

  // Só usa o tempo padrão da etapa se ainda não houver escolha salva do usuário
  useEffect(() => {
    try {
      if (localStorage.getItem(timerKey)) return;
    } catch {}
    setCustomTime(defaultTime);
  }, [defaultTime, timerKey]);

  // Mantém a faixa selecionada mesmo quando a lista é reordenada/editada,
  // localizando o mesmo id/url na nova lista. Só reseta se não existir mais.
  const selectedAudioIdRef = useRef<string | null>(null);
  useEffect(() => {
    const current = audios[selectedAudioIndex];
    if (current) {
      selectedAudioIdRef.current = current.id ?? current.audio_url;
    }
  }, [selectedAudioIndex, audios]);
  useEffect(() => {
    if (audios.length === 0) {
      if (selectedAudioIndex !== 0) setSelectedAudioIndex(0);
    } else if (selectedAudioIndex >= audios.length) {
      const prevId = selectedAudioIdRef.current;
      const idx = prevId
        ? audios.findIndex((a) => (a.id ?? a.audio_url) === prevId)
        : -1;
      setSelectedAudioIndex(idx >= 0 ? idx : 0);
    }
    if (audios.length >= 5) {
      setShowAudioList(true);
    }
  }, [audios, selectedAudioIndex]);

  // Pré-carrega os áudios diretos da etapa para início instantâneo no tablet.
  // Só executa quando o usuário mantém o pré-carregamento habilitado.
  const [prefetchOn] = usePrefetchEnabled();
  useEffect(() => {
    if (!prefetchOn) return;
    if (audios.length > 0) {
      prefetchAudios(audios.map((a) => a.audio_url));
    }
  }, [audios, prefetchOn]);

  // Acompanha se o áudio selecionado já está pronto em cache (para indicador).
  const [audioReady, setAudioReady] = useState(true);
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // ~12s total, evita polling infinito quando o áudio nunca cacheia
    const url = currentAudio?.audio_url;
    if (!url || !isCacheableAudioUrl(url)) {
      setAudioReady(true);
      return;
    }
    setAudioReady(false);
    const check = async () => {
      const ready = await isAudioCached(url);
      if (!active) return;
      if (ready) { setAudioReady(true); return; }
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) { setAudioReady(true); return; }
      setTimeout(check, 800);
    };
    check();
    return () => { active = false; };
  }, [currentAudio?.audio_url]);

  // Pré-carrega ativamente a faixa "preparada" para tocar sem atraso.
  useEffect(() => {
    const url = currentAudio?.audio_url;
    if (!url) return;
    if (isCacheableAudioUrl(url)) {
      prefetchAudios([url]);
    }
  }, [currentAudio?.audio_url]);





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
    // Only handle transitions from active to idle (not on initial mount)
    if (prevActiveRef.current && !isPlaying && !isPaused && timer.isRunning) {
      // Repetir a música até o tempo do cronômetro terminar
      if (loopUntilTimerRef.current && currentAudio) {
        onPlay(currentAudio.audio_url);
        prevActiveRef.current = true;
        return;
      }
      timer.reset();
    }
    prevActiveRef.current = isPlaying || isPaused;
  }, [isPlaying, isPaused]);

  const savedToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTimeChange = (minutes: number) => {
    const clamped = Math.min(180, Math.max(1, Math.round(minutes)));
    const seconds = clamped * 60;
    setCustomTime(seconds);
    // Permite alterar o tempo mesmo com a música tocando
    if (timer.isRunning || timer.isPaused) {
      timer.setTime(seconds);
    }
    // Aviso curto de que o tempo ficou salvo (debounce para não repetir ao digitar)
    if (savedToastRef.current) clearTimeout(savedToastRef.current);
    savedToastRef.current = setTimeout(() => {
      toast.success(`Tempo salvo: ${clamped} min`, { duration: 1500 });
    }, 600);
  };
  useEffect(() => () => {
    if (savedToastRef.current) clearTimeout(savedToastRef.current);
  }, []);

  const handleSelectAudio = (index: number) => {
    setSelectedAudioIndex(index);
    setShowAudioList(false);
    if (isActive) {
      handleStop();
    }
  };

  const handlePlayAudio = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audios[index];
    if (!audio) return;
    setSelectedAudioIndex(index);
    if (isActive) {
      handleStop();
    }
    if (useTimerEnabled && customTime > 0) {
      timer.start(customTime);
    }
    onPlay(audio.audio_url);
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
        'group relative rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-sm',
        isActive
          ? 'bg-gradient-to-br from-gold/10 to-card/40 border-gold/40 ring-1 ring-gold/40 shadow-[0_0_28px_-6px_hsl(var(--gold)/0.25)]'
          : 'bg-gradient-to-br from-card/80 to-card/30 border-border/40 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/10'
      )}
    >
      {/* Barra dourada lateral */}
      <span
        className={cn(
          'absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold to-gold/20 origin-top transition-transform duration-300',
          isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
        )}
        aria-hidden="true"
      />
      {/* Brilho decorativo */}
      <span className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

      {/* Active indicator line */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      )}

      <div className="relative p-2.5 sm:p-3 md:p-4 min-w-0 overflow-hidden">
        {/* Header row - icon, name, actions */}
        <div
          className="flex items-center gap-2 sm:gap-3 mb-2.5 cursor-pointer"
          onClick={() => toggleCollapsed()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
        >
          {stageNumber !== undefined && (
            <span
              className={cn(
                'shrink-0 flex items-center justify-center rounded-full font-bold font-display transition-all duration-300 ring-2',
                isActive
                  ? 'h-9 w-9 sm:h-11 sm:w-11 text-base sm:text-lg bg-gold text-background ring-gold/60 shadow-[0_0_18px_-2px_hsl(var(--gold)/0.6)]'
                  : 'h-6 w-6 sm:h-7 sm:w-7 text-[10px] sm:text-xs bg-gold/15 text-gold ring-gold/20'
              )}
              aria-label={`Etapa número ${stageNumber}`}
            >
              {stageNumber}
            </span>
          )}
          <div
            className={cn(
              'shrink-0 rounded-xl overflow-hidden transition-all duration-300 ring-1',
              isActive ? 'bg-gold/15 ring-gold/30' : 'bg-secondary/80 ring-border/30 group-hover:ring-gold/25',
              (stage as any).icone_url ? 'p-0.5' : 'p-1.5 sm:p-2'
            )}
          >
            <CeremonyIcon name={stage.icone} imageUrl={(stage as any).icone_url} size={(stage as any).icone_url ? 32 : 16} className="sm:!w-[18px] sm:!h-[18px]" />
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

          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
            <button
              onClick={() => toggleCollapsed()}
              className="p-1.5 text-muted-foreground/60 hover:text-gold transition-colors rounded-md hover:bg-gold/10"
              aria-label={collapsed ? 'Expandir etapa' : 'Recolher etapa'}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

        </div>

        {!collapsed && (
          <>


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
              <AudioSourceIcon url={currentAudio?.audio_url} tipo={(currentAudio as any)?.tipo} size={14} active />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{currentAudio?.nome || `Áudio ${selectedAudioIndex + 1}`}</span>
                  {currentAudio && <TrackHzBadge url={currentAudio.audio_url} playing={isPlaying} />}
                  {!isActive && currentAudio && (
                    <span
                      className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9px] uppercase tracking-wider bg-gold/15 text-gold border border-gold/30"
                      title="Faixa preparada — pressione Play para tocar imediatamente"
                    >
                      <Play size={7} fill="currentColor" /> Preparada
                    </span>
                  )}
                </p>
                {audios.length > 1 && (
                  <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                    <span>{selectedAudioIndex + 1} de {audios.length} áudios</span>
                    {continuousPlayback && (
                      <span className="inline-flex items-center gap-0.5 text-gold/90">
                        <Repeat size={9} aria-hidden="true" />
                        <span>contínuo</span>
                      </span>
                    )}
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
                  <div key={audio.id}>
                    <div
                      onClick={() => handleSelectAudio(index)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors cursor-pointer overflow-hidden',
                        index === selectedAudioIndex
                          ? 'bg-gold/10 text-gold'
                          : 'hover:bg-secondary/60 text-foreground'
                      )}
                    >
                      <AudioSourceIcon url={audio.audio_url} tipo={(audio as any).tipo} size={12} active={index === selectedAudioIndex} />
                      <span className="text-xs truncate flex-1 min-w-0 block">{audio.nome || `Áudio ${index + 1}`}</span>
                      <TrackHzBadge url={audio.audio_url} playing={isPlaying && index === selectedAudioIndex} />
                      {index === selectedAudioIndex && !isActive && (
                        <span
                          className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9px] uppercase tracking-wider bg-gold/15 text-gold border border-gold/30"
                          title="Faixa preparada"
                        >
                          <Play size={7} fill="currentColor" /> Preparada
                        </span>
                      )}
                      {continuousPlayback && isPlaying && index === selectedAudioIndex && index < audios.length - 1 && (
                        <span className="text-[9px] uppercase tracking-wider text-gold/80 shrink-0">
                          a seguir ↓
                        </span>
                      )}
                      <button
                        onClick={(e) => handlePlayAudio(index, e)}
                        className={cn(
                          'p-1 rounded transition-colors shrink-0',
                          isPlaying && index === selectedAudioIndex
                            ? 'text-gold bg-gold/15'
                            : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title="Tocar áudio"
                      >
                        {isPlaying && index === selectedAudioIndex ? (
                          <Pause size={13} fill="currentColor" />
                        ) : (
                          <Play size={13} fill="currentColor" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeleteAudio(audio.id, e)}
                        className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors rounded hover:bg-destructive/10 shrink-0"
                        title="Remover áudio"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {continuousPlayback && index < audios.length - 1 && (
                      <div className="flex items-center justify-center py-0.5 text-gold/60" aria-hidden="true">
                        <ArrowDown size={10} />
                      </div>
                    )}
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
          <div className="flex flex-col gap-2 w-full mt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/40">
                <Clock size={14} className={cn("transition-colors", useTimerEnabled ? "text-gold" : "text-muted-foreground/40")} />
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useTimerEnabled}
                    onChange={(e) => setUseTimerEnabled(e.target.checked)}
                    className="rounded border-border bg-secondary text-gold focus:ring-gold w-4 h-4 transition-all"
                  />
                  Cronômetro
                </label>
              </div>
              
              {!useTimerEnabled && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <Play size={12} fill="currentColor" className="animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tempo Normal (Sem limite)</span>
                </div>
              )}
            </div>

            {useTimerEnabled && (
              <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5 p-1 bg-secondary/40 rounded-lg border border-border/30">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(Math.floor(customTime / 60) - 1)}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-md bg-background/50 text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                    title="Diminuir 1 minuto"
                  >
                    −
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={Math.floor(customTime / 60)}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value) || 1)}
                      className="w-10 text-center font-mono text-xs bg-transparent border-none p-0 focus:ring-0 text-foreground"
                    />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/50">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(Math.floor(customTime / 60) + 1)}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-md bg-background/50 text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                    title="Aumentar 1 minuto"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setLoopUntilTimer((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 h-[34px] rounded-lg text-xs font-semibold transition-all duration-300 border shadow-sm',
                    loopUntilTimer
                      ? 'bg-gold text-background border-gold shadow-gold/20'
                      : 'bg-secondary/40 border-border/40 text-muted-foreground/70 hover:text-foreground hover:border-gold/30'
                  )}
                  title="Repete a música em loop até o tempo do cronômetro acabar"
                  aria-pressed={loopUntilTimer}
                >
                  <Repeat size={14} className={cn("transition-transform duration-500", loopUntilTimer && "rotate-180")} aria-hidden="true" />
                  <span>Repetir até o tempo</span>
                </button>
              </div>
            )}
            {(timer.isRunning || timer.isPaused) && (
              <div className="flex items-center gap-1 mt-1">
                <TimerDisplay 
                  seconds={timer.timeRemaining} 
                  isActive={timer.isRunning && !timer.isPaused}
                  size="sm"
                />
                <button
                  onClick={() => timer.reset()}
                  className="p-1 text-muted-foreground hover:text-gold transition-colors rounded-md hover:bg-gold/10"
                  aria-label="Resetar cronômetro"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Play / Control buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 mt-2.5 flex-wrap">
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
              {hasAudios && !audioReady ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              {hasAudios && !audioReady ? 'Carregando…' : 'Iniciar'}
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
          </>
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
