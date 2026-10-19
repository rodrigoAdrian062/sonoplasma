import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, RotateCcw, Pencil, Trash2, Music, ChevronDown, ChevronUp, X, SkipBack, SkipForward, RotateCw, Loader2, Repeat, ArrowDown, Volume2, VolumeX, Eye, EyeOff, CheckCircle2, Plus, Search } from 'lucide-react';
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
import { useStages } from '@/hooks/useStages';
import { prefetchAudios, isAudioCached, isCacheableAudioUrl } from '@/lib/audioCache';
import { usePrefetchEnabled } from '@/hooks/usePrefetchEnabled';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Slider } from '@/components/ui/slider';
import { VolumePresets } from './VolumePresets';
import { RitualDetailsEditor, type RitualHarmonyAudio } from './RitualDetailsEditor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useStageAudios } from '@/hooks/useStageAudios';
import { formatDuration } from '@/types/audioLibrary';
import { DEFAULT_STAGE_VOLUME_SETTINGS, STAGE_RAMP_DURATIONS, clampPercent, type StagePlaybackVolume, type StageVolumeSettings } from '@/lib/stageVolume';
import {
  MAX_STAGE_TIMER_SECONDS,
  MIN_STAGE_TIMER_SECONDS,
  readStageTimerPreferences,
  saveStageTimerEnabled,
  saveStageTimerSeconds,
} from '@/lib/stageTimer';


interface StageCardProps {
  stage: CeremonyStage;
  audios: StageAudioWithSource[];
  stageNumber?: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime?: number;
  duration?: number;
  onPlay: (audioUrl: string, volumeSettings?: StagePlaybackVolume) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: (options?: { immediate?: boolean }) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onSeekTo?: (seconds: number) => void;
  continuousPlayback?: boolean;
}

type StageAudioWithSource = StageAudio & { tipo?: string | null };

function readStoredVolumeSettings(stageId: string): StageVolumeSettings {
  try {
    const stored = localStorage.getItem(`stage:volumeSettings:${stageId}`);
    if (stored) return { ...DEFAULT_STAGE_VOLUME_SETTINGS, ...JSON.parse(stored) };
  } catch { /* use server values or defaults */ }
  return DEFAULT_STAGE_VOLUME_SETTINGS;
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
  const { audios: libraryAudios, isLoading: isLibraryLoading, error: libraryError } = useAudioLibrary();
  const { createAudio: createStageAudio } = useStageAudios();
  const { toggleStageVisibility } = useStages();
  const [harmonyPickerOpen, setHarmonyPickerOpen] = useState(false);
  const [harmonySearch, setHarmonySearch] = useState('');
  const addingHarmonyUrls = useRef(new Set<string>());
  const pendingHarmonyInsert = useRef<((audio: RitualHarmonyAudio) => void) | null>(null);
  const initialTimerPreferences = readStageTimerPreferences(stage.id, stage.tempo_padrao);
  const [customTime, setCustomTime] = useState(() => {
    return initialTimerPreferences.seconds;
  });
  const [useTimerEnabled, setUseTimerEnabled] = useState(() => {
    return initialTimerPreferences.enabled;
  });
  useEffect(() => {
    const timerPreferences = readStageTimerPreferences(stage.id, stage.tempo_padrao);
    setCustomTime(timerPreferences.seconds);
    setUseTimerEnabled(timerPreferences.enabled);
  }, [stage.id, stage.tempo_padrao]);
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
    } catch {
      // Keep the default selection when browser storage is unavailable.
    }
    return 0;
  });

  // Track the custom volume and ritual details for the current stage
  const stageVolumeKey = `stage:volume:${stage.id}`;
  const stageRitualDetailsKey = `stage:ritualDetails:${stage.id}`;
  const [stageVolume, setStageVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(stageVolumeKey);
      if (saved !== null) return Number(saved);
    } catch {
      // Use the server-provided volume when browser storage is unavailable.
    }
    return stage.volume_config ?? 0.7;
  });
  const [stageVolumeSettings, setStageVolumeSettings] = useState<StageVolumeSettings>(() => {
    const stored = readStoredVolumeSettings(stage.id);
    const initialPercent = stage.volume_start_percent ?? stored.initialPercent;
    return {
      initialPercent,
      rampEnabled: stage.volume_ramp_enabled ?? stored.rampEnabled,
      finalPercent: Math.max(initialPercent, stage.volume_final_percent ?? stored.finalPercent),
      rampSeconds: stage.volume_ramp_seconds ?? stored.rampSeconds,
    };
  });
  const [savingVolumeSettings, setSavingVolumeSettings] = useState(false);
  const [ritualDetails, setRitualDetails] = useState(() => {
    return stage.ritual_detalhes || localStorage.getItem(stageRitualDetailsKey) || '';
  });

  useEffect(() => {
    if (stage.ritual_detalhes !== undefined && stage.ritual_detalhes !== null) {
      setRitualDetails(stage.ritual_detalhes);
    }
  }, [stage.ritual_detalhes]);

  const saveRitualDetails = async (text: string) => {
    setRitualDetails(text);
    localStorage.setItem(stageRitualDetailsKey, text);
    queryClient.setQueryData<CeremonyStage[]>(['stages'], (currentStages) =>
      currentStages?.map((currentStage) =>
        currentStage.id === stage.id
          ? { ...currentStage, ritual_detalhes: text }
          : currentStage,
      ),
    );
    try {
      const { error } = await supabase
        .from('sonoplastia_etapas')
        .update({ ritual_detalhes: text })
        .eq('id', stage.id);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar detalhes do ritual:', err);
      toast.error('Não foi possível salvar os detalhes do ritual no servidor.');
    }
  };

  useEffect(() => {
    try { localStorage.setItem(stageVolumeKey, String(stageVolume)); } catch {
      // Volume remains active in memory when browser storage is unavailable.
    }
  }, [stageVolume, stageVolumeKey]);

  useEffect(() => {
    const stored = readStoredVolumeSettings(stage.id);
    setStageVolumeSettings({
      initialPercent: stage.volume_start_percent ?? stored.initialPercent,
      rampEnabled: stage.volume_ramp_enabled ?? stored.rampEnabled,
      finalPercent: stage.volume_final_percent ?? stored.finalPercent,
      rampSeconds: stage.volume_ramp_seconds ?? stored.rampSeconds,
    });
  }, [stage.id, stage.volume_start_percent, stage.volume_ramp_enabled, stage.volume_final_percent, stage.volume_ramp_seconds]);

  const saveStageVolumeSettings = async () => {
    const settings = {
      volume_start_percent: clampPercent(stageVolumeSettings.initialPercent),
      volume_ramp_enabled: stageVolumeSettings.rampEnabled,
      volume_final_percent: Math.max(
        clampPercent(stageVolumeSettings.initialPercent),
        clampPercent(stageVolumeSettings.finalPercent),
      ),
      volume_ramp_seconds: stageVolumeSettings.rampSeconds,
    };
    setSavingVolumeSettings(true);
    try {
      const { error } = await supabase
        .from('sonoplastia_etapas')
        .update(settings)
        .eq('id', stage.id);
      if (error) throw error;
      try {
        localStorage.setItem(`stage:volumeSettings:${stage.id}`, JSON.stringify({
          initialPercent: settings.volume_start_percent,
          rampEnabled: settings.volume_ramp_enabled,
          finalPercent: settings.volume_final_percent,
          rampSeconds: settings.volume_ramp_seconds,
        }));
      } catch (storageError) {
        console.warn('Não foi possível armazenar localmente o volume da etapa:', storageError);
      }
      queryClient.setQueryData<CeremonyStage[]>(['stages'], (currentStages) =>
        currentStages?.map((currentStage) =>
          currentStage.id === stage.id ? { ...currentStage, ...settings } : currentStage,
        ),
      );
      setStageVolumeSettings((current) => ({
        ...current,
        initialPercent: settings.volume_start_percent,
        finalPercent: settings.volume_final_percent,
      }));
      toast.success('Configurações de volume salvas.');
    } catch (error) {
      console.error('Erro ao salvar configurações de volume da etapa:', error);
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Erro desconhecido ao salvar no servidor.';
      toast.error('Não foi possível salvar as configurações de volume.', { description: message });
    } finally {
      setSavingVolumeSettings(false);
    }
  };

  // Persist the "armed" (prepared) track per stage.
  useEffect(() => {
    const a = audios[selectedAudioIndex];
    if (!a) return;
    try { localStorage.setItem(armedKey, a.audio_url); } catch {
      // Keep the prepared audio active in memory when storage is unavailable.
    }
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
        try { window.dispatchEvent(new CustomEvent('stage:expanded', { detail: { id: stage.id } })); } catch {
          // The local expansion event is an optional cross-card coordination hint.
        }
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
    onStop({ immediate: true });
  });
  const { isRunning: timerIsRunning, reset: resetTimer } = timer;
  const getStagePlaybackVolume = (audioUrl: string): StagePlaybackVolume => ({
    masterVolume: audios.find((audio) => audio.audio_url === audioUrl)?.volume_config ?? stageVolume,
    ...stageVolumeSettings,
  });
  const startStageTimer = () => {
    if (useTimerEnabled && customTime > 0) timer.start(customTime);
    else timer.reset();
  };
  const startStageAudio = (audioUrl: string) => {
    startStageTimer();
    onPlay(audioUrl, getStagePlaybackVolume(audioUrl));
  };
  const handleTimerEnabledChange = (enabled: boolean) => {
    setUseTimerEnabled(enabled);
    try { saveStageTimerEnabled(stage.id, enabled); } catch {
      // Timer behavior remains available in memory if preference storage fails.
    }
    if (!enabled) timer.reset();
    else if (isPlaying || isPaused) timer.start(customTime);
  };

  const isActive = isPlaying || isPaused;
  const hasAudios = audios.length > 0;
  const currentAudio = audios[selectedAudioIndex];
  const currentAudioRef = useRef(currentAudio);
  const onPlayRef = useRef(onPlay);
  useEffect(() => { currentAudioRef.current = currentAudio; }, [currentAudio]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  const normalizedHarmonySearch = harmonySearch.trim().toLocaleLowerCase();
  const filteredLibraryAudios = libraryAudios.filter((audio) =>
    audio.nome.toLocaleLowerCase().includes(normalizedHarmonySearch)
  );
  const nextHarmonyOrder = useRef({ stageId: stage.id, order: audios.reduce((max, audio) => Math.max(max, audio.ordem), -1) + 1 });

  useEffect(() => {
    const nextOrder = audios.reduce((max, audio) => Math.max(max, audio.ordem), -1) + 1;
    if (nextHarmonyOrder.current.stageId !== stage.id) {
      nextHarmonyOrder.current = { stageId: stage.id, order: nextOrder };
    } else {
      nextHarmonyOrder.current.order = Math.max(nextHarmonyOrder.current.order, nextOrder);
    }
  }, [audios, stage.id]);

  const addHarmonyToStage = (audio: (typeof libraryAudios)[number]) => {
    if (audios.some((item) => item.audio_url === audio.audio_url)) {
      const insert = pendingHarmonyInsert.current;
      if (insert) {
        pendingHarmonyInsert.current = null;
        insert(audio);
        setHarmonyPickerOpen(false);
        toast.success(`"${audio.nome}" inserida nas instruções`);
      }
      return;
    }
    if (addingHarmonyUrls.current.has(audio.audio_url)) {
      return;
    }

    addingHarmonyUrls.current.add(audio.audio_url);
    const order = nextHarmonyOrder.current.order++;
    createStageAudio.mutate(
      {
        etapa_id: stage.id,
        nome: audio.nome,
        audio_url: audio.audio_url,
        ordem: order,
      },
      {
        onSuccess: () => {
          addingHarmonyUrls.current.delete(audio.audio_url);
          const insert = pendingHarmonyInsert.current;
          if (insert) {
            pendingHarmonyInsert.current = null;
            insert(audio);
            setHarmonyPickerOpen(false);
            toast.success(`"${audio.nome}" inserida nas instruções`);
          } else {
            toast.success(`"${audio.nome}" adicionada à etapa`);
          }
        },
        onError: () => {
          addingHarmonyUrls.current.delete(audio.audio_url);
        },
      },
    );
  };

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
    startStageAudio(currentAudio.audio_url);
  };

  const handleStop = () => {
    timer.reset();
    onStop({ immediate: loopUntilTimer });
  };

  const handlePause = () => {
    if (loopUntilTimer) {
      timer.reset();
      onStop({ immediate: true });
      return;
    }
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
    if (prevActiveRef.current && !isPlaying && !isPaused && timerIsRunning) {
      // Repetir a música até o tempo do cronômetro terminar
      const audioToRepeat = currentAudioRef.current;
      if (loopUntilTimerRef.current && audioToRepeat) {
        onPlayRef.current(audioToRepeat.audio_url);
        prevActiveRef.current = true;
        return;
      }
      resetTimer();
    }
    prevActiveRef.current = isPlaying || isPaused;
  }, [isPlaying, isPaused, timerIsRunning, resetTimer]);

  const savedToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTimeChange = (minutes: number) => {
    const clamped = Math.min(
      MAX_STAGE_TIMER_SECONDS / 60,
      Math.max(MIN_STAGE_TIMER_SECONDS / 60, Math.round(minutes)),
    );
    const seconds = clamped * 60;
    setCustomTime(seconds);
    try { saveStageTimerSeconds(stage.id, seconds); } catch {
      // Timer behavior remains available in memory if preference storage fails.
    }
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

  const handleToggleHidden = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStageVisibility.mutate({ 
      id: stage.id, 
      oculto: !stage.oculto 
    });
  };


  const handlePlayAudio = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audios[index];
    if (!audio) return;
    setSelectedAudioIndex(index);
    if (isActive) {
      handleStop();
    }
    startStageAudio(audio.audio_url);
  };

  const handleRitualHarmonyPlay = (audioUrl: string) => {
    const audioIndex = audios.findIndex((audio) => audio.audio_url === audioUrl);
    if (audioIndex >= 0) setSelectedAudioIndex(audioIndex);
    startStageAudio(audioUrl);
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
          : 'bg-gradient-to-br from-card/80 to-card/30 border-border/40 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/10',
        stage.oculto && !isActive && 'opacity-60 grayscale-[0.5]'
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
              stage.icone_url ? 'p-0.5' : 'p-1.5 sm:p-2'
            )}
          >
            <CeremonyIcon name={stage.icone} imageUrl={stage.icone_url} size={stage.icone_url ? 32 : 16} className="sm:!w-[18px] sm:!h-[18px]" />
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
              onClick={handleToggleHidden}
              className={cn(
                "p-1.5 transition-all rounded-md flex items-center gap-1",
                stage.oculto 
                  ? "text-destructive bg-destructive/10 hover:bg-destructive/20" 
                  : "text-muted-foreground/60 hover:text-gold hover:bg-gold/10"
              )}
              title={stage.oculto ? "Etapa Oculta (Não aparece na apresentação)" : "Etapa Visível"}
              aria-label={stage.oculto ? "Tornar visível" : "Ocultar etapa"}
            >
              {stage.oculto ? (
                <>
                  <EyeOff size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Oculto</span>
                </>
              ) : (
                <Eye size={14} />
              )}
            </button>
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
          <div className="mt-2 mb-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-gold/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Volume da Etapa
                </span>
              </div>
              <span className="text-[10px] font-mono text-gold font-bold bg-gold/10 px-1.5 py-0.5 rounded">
                {Math.round(stageVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[stageVolume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(vals) => setStageVolume(vals[0] / 100)}
              className="py-2"
            />
            <VolumePresets volume={stageVolume} onVolumeChange={setStageVolume} className="mt-1" />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-gold/15 bg-background/40 p-2">
              <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Iniciar em ({stageVolumeSettings.initialPercent}%)
                <select
                  value={stageVolumeSettings.initialPercent}
                  onChange={(event) => {
                    const initialPercent = Number(event.target.value);
                    setStageVolumeSettings((current) => ({
                      ...current,
                      initialPercent,
                      finalPercent: Math.max(initialPercent, current.finalPercent),
                    }));
                  }}
                  className="rounded border border-gold/25 bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                  aria-label="Volume inicial da etapa"
                >
                  {Array.from({ length: 101 }, (_, percent) => (
                    <option key={percent} value={percent}>{percent}%</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={stageVolumeSettings.rampEnabled}
                  onChange={(event) => setStageVolumeSettings((current) => ({
                    ...current,
                    rampEnabled: event.target.checked,
                  }))}
                  className="accent-[hsl(var(--gold))]"
                />
                Subida suave
              </label>
              {stageVolumeSettings.rampEnabled && (
                <>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Volume final ({stageVolumeSettings.finalPercent}%)
                    <select
                      value={stageVolumeSettings.finalPercent}
                      onChange={(event) => setStageVolumeSettings((current) => ({
                        ...current,
                        finalPercent: Number(event.target.value),
                      }))}
                      className="rounded border border-gold/25 bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      aria-label="Volume final da subida"
                    >
                      {Array.from(
                        { length: 101 - stageVolumeSettings.initialPercent },
                        (_, index) => index + stageVolumeSettings.initialPercent,
                      ).map((percent) => (
                        <option key={percent} value={percent}>{percent}%</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Duração da subida
                    <select
                      value={stageVolumeSettings.rampSeconds}
                      onChange={(event) => setStageVolumeSettings((current) => ({
                        ...current,
                        rampSeconds: Number(event.target.value),
                      }))}
                      className="rounded border border-gold/25 bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      aria-label="Duração da subida suave"
                    >
                      {STAGE_RAMP_DURATIONS.map((seconds) => (
                        <option key={seconds} value={seconds}>{seconds} segundo{seconds > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={saveStageVolumeSettings}
                disabled={savingVolumeSettings}
                className="col-span-2 h-7 border-gold/30 text-[10px] text-gold hover:bg-gold/10"
              >
                {savingVolumeSettings ? 'Salvando...' : 'Salvar volume da etapa'}
              </Button>
            </div>
          </div>
        )}

        {!collapsed && (
          <>
            <div className="mt-2 mb-4 px-1">
              <div className="flex items-center gap-2 mb-2">
                <Pencil size={14} className="text-gold/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Detalhes do Ritual
                </span>
              </div>
              <RitualDetailsEditor
                value={ritualDetails}
                onChange={(value) => void saveRitualDetails(value)}
                onRequestAddHarmony={(insert) => {
                  pendingHarmonyInsert.current = insert;
                  setHarmonyPickerOpen(true);
                }}
                placeholder="Escreva aqui as instruções ou detalhes desta etapa do ritual..."
                className="border-border/40"
                minHeight={80}
                compact
              />
            </div>
            
          </>
        )}

        {!collapsed && (
          <>
        {/* Audio selector */}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Harmonias ({audios.length})
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-gold hover:bg-gold/10"
            onClick={(event) => {
              event.stopPropagation();
              setHarmonyPickerOpen(true);
            }}
          >
            <Plus size={13} />
            Adicionar harmonia
          </Button>
        </div>
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
              <AudioSourceIcon url={currentAudio?.audio_url} tipo={currentAudio?.tipo} size={14} active />
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
                  {currentAudio && isCacheableAudioUrl(currentAudio.audio_url) && (
                    <span 
                      className={cn(
                        "shrink-0 inline-flex items-center gap-0.5 px-1 rounded-full text-[8px] transition-colors",
                        audioReady 
                          ? "text-emerald-500/80 bg-emerald-500/5" 
                          : "text-muted-foreground/40 bg-secondary/50"
                      )}
                      title={audioReady ? "Pronto para offline" : "Baixando para cache..."}
                    >
                      {audioReady ? <CheckCircle2 size={10} /> : <Loader2 size={10} className="animate-spin" />}
                      <span className="uppercase tracking-tighter">{audioReady ? 'Local' : 'Cache'}</span>
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
                      <AudioSourceIcon url={audio.audio_url} tipo={audio.tipo} size={12} active={index === selectedAudioIndex} />
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
                      {audio && isCacheableAudioUrl(audio.audio_url) && (
                        <span 
                          className={cn(
                            "shrink-0 inline-flex items-center gap-0.5 px-1 rounded-full text-[8px]",
                            (index === selectedAudioIndex ? audioReady : false) // Simplificado: só checamos o selecionado por performance
                              ? "text-emerald-500/80" 
                              : "text-muted-foreground/30"
                          )}
                          title="Cache status"
                        >
                          <CheckCircle2 size={10} />
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

        <Dialog
          open={harmonyPickerOpen}
          onOpenChange={(open) => {
            setHarmonyPickerOpen(open);
            if (!open) setHarmonySearch('');
          }}
        >
          <DialogContent className="max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-foreground">
                Adicionar harmonia
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Pesquise no acervo e selecione uma ou mais faixas para esta etapa.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={harmonySearch}
                onChange={(event) => setHarmonySearch(event.target.value)}
                placeholder="Pesquisar harmonias..."
                className="border-border bg-secondary pl-9"
                aria-label="Pesquisar harmonias no acervo"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {isLibraryLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Carregando acervo...</p>
              ) : libraryError ? (
                <p className="py-6 text-center text-sm text-destructive">
                  Não foi possível carregar o acervo: {libraryError.message}
                </p>
              ) : filteredLibraryAudios.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma harmonia encontrada.
                </p>
              ) : (
                filteredLibraryAudios.map((audio) => {
                  const alreadyAdded = audios.some((item) => item.audio_url === audio.audio_url);
                  const isAdding = addingHarmonyUrls.current.has(audio.audio_url);
                  const isInlineInsert = pendingHarmonyInsert.current !== null;

                  return (
                    <div
                      key={audio.id}
                      className="flex items-center gap-1 rounded-lg border border-transparent px-1.5 transition-colors hover:border-gold/25 hover:bg-secondary/70"
                    >
                      <button
                        type="button"
                        aria-label={`Ouvir ${audio.nome}`}
                        title={`Ouvir ${audio.nome}`}
                        onClick={() => onPlay(audio.audio_url, {
                          masterVolume: stageVolume,
                          ...stageVolumeSettings,
                        })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gold hover:bg-gold/10"
                      >
                        <Play size={15} fill="currentColor" />
                      </button>
                      <button
                        type="button"
                        disabled={(alreadyAdded && !isInlineInsert) || isAdding}
                        onClick={() => addHarmonyToStage(audio)}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-left transition-colors disabled:cursor-default',
                          alreadyAdded ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        <AudioSourceIcon url={audio.audio_url} tipo={audio.tipo} size={15} />
                        <span className="min-w-0 flex-1 truncate text-sm">{audio.nome}</span>
                        {audio.duracao_segundos != null && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDuration(audio.duracao_segundos)}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-gold">
                          {isAdding
                            ? 'Salvando...'
                            : alreadyAdded
                              ? isInlineInsert ? 'Inserir no texto' : 'Adicionada'
                              : <Plus size={15} />}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                    onChange={(e) => handleTimerEnabledChange(e.target.checked)}
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
                      aria-label="Duração do cronômetro em minutos"
                      title="Informe minutos (60 minutos = 1 hora)"
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
                  title="Repete a música continuamente até o cronômetro terminar ou você parar"
                  aria-pressed={loopUntilTimer}
                >
                  <Repeat size={14} className={cn("transition-transform duration-500", loopUntilTimer && "rotate-180")} aria-hidden="true" />
                  <span>Loop</span>
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
