import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useClock } from '@/hooks/useClock';

import { ElegantClock } from './ElegantClock';
import { SessionStopwatch } from './SessionStopwatch';

import { X, Play, Pause, Square, ChevronLeft, ChevronRight, Maximize, Minimize, Music, Clock, RotateCcw, Volume2, VolumeX, Keyboard, SkipBack, SkipForward, SlidersHorizontal, Shrink, Expand, HelpCircle, Trash2, Plus, Minus, Pencil, EyeOff, CheckCircle2, Loader2, Palette } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VolumePresets } from './VolumePresets';
import { setPresentationActive } from '@/lib/presentationState';
import { cn } from '@/lib/utils';
import type { EQSettings } from '@/hooks/useUniversalAudioPlayer';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useStageAudios } from '@/hooks/useStageAudios';
import { AudioLines } from 'lucide-react';
import { AudioSourceIcon, getAudioSource, type AudioSource } from '@/components/AudioSourceIcon';
import { TrackHzBadge } from '@/components/TrackHzBadge';
import { RitualDetailsDisplay, RitualDetailsEditor, type RitualHarmonyAudio } from '@/components/RitualDetailsEditor';
import { formatDuration } from '@/types/audioLibrary';
import { DEFAULT_STAGE_VOLUME_SETTINGS, STAGE_RAMP_DURATIONS, clampPercent, type StagePlaybackVolume, type StageVolumeSettings } from '@/lib/stageVolume';
import {
  MAX_STAGE_TIMER_SECONDS,
  MIN_STAGE_TIMER_SECONDS,
  readStageTimerPreferences,
  saveStageTimerEnabled,
  saveStageTimerSeconds,
} from '@/lib/stageTimer';

import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { FolderMusicIcon } from '@/components/icons/FolderMusicIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';

import { prefetchAudios, isAudioCached, isCacheableAudioUrl } from '@/lib/audioCache';
import { PREFETCH_LOOKAHEAD } from '@/lib/prefetchSettings';
import { usePrefetchEnabled } from '@/hooks/usePrefetchEnabled';
import { Download } from 'lucide-react';
import { loadCloudState, saveCloudState } from '@/lib/cloudState';

import presentationBanner from '@/assets/presentation-banner.png';
import { QuickSoundsPanel } from './QuickSoundsPanel';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const STAGE_COLORS_STORAGE_KEY = 'sonoplastia:stageColors';
const STAGE_COLORS_CLOUD_KEY = 'stageColors';

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

function readStageColors(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STAGE_COLORS_STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => isHexColor(entry[1]))
    );
  } catch {
    return {};
  }
}

interface PresentationModeProps {
  stages: CeremonyStage[];
  audiosByStageId: Record<string, PresentationAudio[]>;
  currentStageId: string | null;
  currentUrl?: string | null;
  secaoId?: string;
  secaoNome?: string;

  status: 'idle' | 'playing' | 'paused';
  volume: number;
  currentTime: number;
  duration: number;
  onVolumeChange: (value: number) => void;
  onPlay: (stageId: string, audioUrl: string, volumeSettings?: StagePlaybackVolume) => void;
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

export function PresentationMode(props: PresentationModeProps) {
  return <PresentationContent {...props} />;
}

type PresentationAudio = StageAudio & { tipo?: string | null };

interface MidiMessageLike {
  data: Uint8Array;
}

interface MidiInputLike {
  state: string;
  onmidimessage: ((event: MidiMessageLike) => void) | null;
}

interface MidiInputMapLike {
  forEach(callback: (input: MidiInputLike) => void): void;
}

interface MidiAccessLike {
  inputs: MidiInputMapLike;
  onstatechange: ((event: Event) => void) | null;
}

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface VendorFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface VendorFullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

type BrowserNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
  requestMIDIAccess?: () => Promise<MidiAccessLike>;
};

function PresentationContent({
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
    const firstVisibleIndex = stages.findIndex((stage) => !stage.oculto);
    return firstVisibleIndex >= 0 ? firstVisibleIndex : 0;
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
  const [customTime, setCustomTime] = useState(300);
  const [useTimerEnabled, setUseTimerEnabled] = useState(true);
  const [stageVolume, setStageVolume] = useState(0.7);
  const [stageVolumeSettings, setStageVolumeSettings] = useState<StageVolumeSettings>(DEFAULT_STAGE_VOLUME_SETTINGS);
  const [savingVolumeSettings, setSavingVolumeSettings] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [pinKeyboardHints, setPinKeyboardHints] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [contingencyOpen, setContingencyOpen] = useState(false);
  const [stageColors, setStageColors] = useState<Record<string, string>>(readStageColors);
  const stageColorsDirtyRef = useRef(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [midiAccess, setMidiAccess] = useState<MidiAccessLike | null>(null);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);
  const focusMode = false;
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | AudioSource>('all');
  const [audioToDelete, setAudioToDelete] = useState<StageAudio | null>(null);
  const { createAudio: createStageAudio, deleteAudio } = useStageAudios();
  const { audios: libraryAudios } = useAudioLibrary();
  const [harmonyPickerOpen, setHarmonyPickerOpen] = useState(false);
  const [harmonySearch, setHarmonySearch] = useState('');
  const pendingHarmonyInsert = useRef<((audio: RitualHarmonyAudio) => void) | null>(null);
  const addingHarmonyUrls = useRef(new Set<string>());
  const stagesById = new Map(stages.map((s) => [s.id, s] as const));
  const libraryById = new Map(libraryAudios.map((a) => [a.id, a] as const));

  const [ritualDetails, setRitualDetails] = useState('');
  const [isRitualEditing, setIsRitualEditing] = useState(false);
  const [audioReady, setAudioReady] = useState(true);

  const saveRitualDetails = async (text: string) => {
    if (!currentStage) return;
    setRitualDetails(text);
    localStorage.setItem(`stage:ritualDetails:${currentStage.id}`, text);
    try {
      await supabase
        .from('sonoplastia_etapas')
        .update({ ritual_detalhes: text })
        .eq('id', currentStage.id);
    } catch (err) {
      console.error('Erro ao salvar detalhes do ritual:', err);
    }
  };

  const chooseRitualHarmony = (audio: RitualHarmonyAudio) => {
    if (!currentStage) return;
    const alreadyAdded = audios.some((item) => item.audio_url === audio.audio_url);
    const insertMarker = () => {
      const insert = pendingHarmonyInsert.current;
      if (!insert) return;
      pendingHarmonyInsert.current = null;
      insert(audio);
      setHarmonyPickerOpen(false);
      toast.success(`"${audio.nome}" inserida nas instruções`);
    };

    if (alreadyAdded) {
      insertMarker();
      return;
    }
    if (addingHarmonyUrls.current.has(audio.audio_url)) return;

    addingHarmonyUrls.current.add(audio.audio_url);
    const nextOrder = audios.reduce((maxOrder, item) => Math.max(maxOrder, item.ordem), -1) + 1;
    createStageAudio.mutate(
      {
        etapa_id: currentStage.id,
        nome: audio.nome,
        audio_url: audio.audio_url,
        ordem: nextOrder,
      },
      {
        onSuccess: () => {
          addingHarmonyUrls.current.delete(audio.audio_url);
          insertMarker();
        },
        onError: () => addingHarmonyUrls.current.delete(audio.audio_url),
      },
    );
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
  const {
    fadeEnabled,
    setFadeEnabled,
  } = useUniversalAudioPlayer();
  const queryClient = useQueryClient();

  // Filtra etapas ocultas apenas para navegação/exibição se não for a etapa atual forçada
  const visibleStages = stages.filter(s => !s.oculto || s.id === currentStageId);
  const visibleStagePosition = visibleStages.findIndex((stage) => stage.id === stages[selectedStageIndex]?.id);
  const currentStage = stages[selectedStageIndex];
  const audios = currentStage ? audiosByStageId[currentStage.id] || [] : [];
  const currentAudio = audios[selectedAudioIndex];
  const isActive = currentStageId === currentStage?.id && (status === 'playing' || status === 'paused');
  const isPlaying = currentStageId === currentStage?.id && status === 'playing';
  const isPaused = currentStageId === currentStage?.id && status === 'paused';
  const isMuted = volume === 0;
  const currentStageColor = currentStage ? stageColors[currentStage.id] : undefined;

  useEffect(() => {
    let cancelled = false;
    void loadCloudState<Record<string, string>>(STAGE_COLORS_CLOUD_KEY).then((remote) => {
      if (cancelled) return;
      const local = readStageColors();
      if (stageColorsDirtyRef.current) {
        void saveCloudState(STAGE_COLORS_CLOUD_KEY, local);
        return;
      }
      if (remote && typeof remote === 'object' && !Array.isArray(remote)) {
        const validRemote = Object.fromEntries(
          Object.entries(remote).filter((entry): entry is [string, string] => isHexColor(entry[1]))
        );
        if (Object.keys(validRemote).length > 0 || Object.keys(local).length === 0) {
          localStorage.setItem(STAGE_COLORS_STORAGE_KEY, JSON.stringify(validRemote));
          setStageColors(validRemote);
        } else {
          void saveCloudState(STAGE_COLORS_CLOUD_KEY, local);
        }
      } else if (Object.keys(local).length > 0) {
        void saveCloudState(STAGE_COLORS_CLOUD_KEY, local);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStageColor = (stageId: string, color: string) => {
    if (!isHexColor(color)) return;
    const next = { ...stageColors, [stageId]: color };
    stageColorsDirtyRef.current = true;
    localStorage.setItem(STAGE_COLORS_STORAGE_KEY, JSON.stringify(next));
    void saveCloudState(STAGE_COLORS_CLOUD_KEY, next);
    setStageColors(next);
  };

  // Status de cache do áudio atual
  useEffect(() => {
    let active = true;
    let attempts = 0;
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
      attempts++;
      if (attempts >= 15) { setAudioReady(true); return; }
      setTimeout(check, 800);
    };
    check();
    return () => { active = false; };
  }, [currentAudio?.audio_url]);

  const timer = useTimer(() => {
    onStop();
  });

  // Pré-carregamento das próximas etapas: baixa em background os áudios
  // das N próximas etapas para que o start seja quase instantâneo. Não
  // toca nada — só popula o cache. Respeita o toggle do usuário.
  const [prefetchOn, setPrefetchOn] = usePrefetchEnabled();
  const { prefetchNextStages } = useUniversalAudioPlayer();

  useEffect(() => {
    if (!prefetchOn || !currentStage) return;
    prefetchNextStages(currentStage.id, stages, audiosByStageId);
  }, [prefetchOn, currentStage?.id, stages, audiosByStageId, prefetchNextStages]);

  useEffect(() => {
    if (!currentStage) return;
    const timerPreferences = readStageTimerPreferences(currentStage.id, currentStage.tempo_padrao);
    setCustomTime(timerPreferences.seconds);
    setUseTimerEnabled(timerPreferences.enabled);
  }, [currentStage?.id, currentStage?.tempo_padrao]);



  useEffect(() => {
    if (currentStage) {
      const savedVol = localStorage.getItem(`stage:volume:${currentStage.id}`);
      if (savedVol !== null) {
        setStageVolume(Number(savedVol));
      } else {
        setStageVolume(currentStage.volume_config ?? 0.7);
      }
      let localSettings: Partial<StageVolumeSettings> = {};
      try {
        const stored = localStorage.getItem(`stage:volumeSettings:${currentStage.id}`);
        if (stored) localSettings = JSON.parse(stored) as Partial<StageVolumeSettings>;
      } catch { /* fall back to the values fetched from the server */ }
      const initialPercent = currentStage.volume_start_percent ?? localSettings.initialPercent ?? 100;
      setStageVolumeSettings({
        initialPercent,
        rampEnabled: currentStage.volume_ramp_enabled ?? localSettings.rampEnabled ?? false,
        finalPercent: Math.max(initialPercent, currentStage.volume_final_percent ?? localSettings.finalPercent ?? 100),
        rampSeconds: currentStage.volume_ramp_seconds ?? localSettings.rampSeconds ?? 3,
      });

      const savedDetails = currentStage.ritual_detalhes ?? localStorage.getItem(`stage:ritualDetails:${currentStage.id}`) ?? '';
      setRitualDetails(savedDetails);
    }
    // Não reseta o áudio na primeira montagem (preserva a música em reprodução)
    if (didInitRef.current) {
      didInitRef.current = false;
      return;
    }
    setSelectedAudioIndex(0);
  }, [currentStage?.id]);


  useEffect(() => {
    if (currentStage) {
      localStorage.setItem(`stage:volume:${currentStage.id}`, String(stageVolume));
    }
  }, [stageVolume, currentStage?.id]);


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
    let wakeLock: WakeLockSentinelLike | null = null;
    let released = false;

    const requestWakeLock = async () => {
      try {
        const screenWakeLock = (navigator as BrowserNavigator).wakeLock;
        if (screenWakeLock) {
          wakeLock = await screenWakeLock.request('screen');
        }
      } catch {
        /* The browser may not support Wake Lock or may deny the request. */
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
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: 'Apresentação em andamento',
          artist: 'Sonoplastia',
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch {
        /* Media Session metadata is an optional browser integration. */
      }
    }

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        wakeLock.release().catch((error: unknown) => {
          console.warn('Could not release screen wake lock:', error);
        });
      }
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'none'; } catch { /* Media Session cleanup is best-effort. */ }
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
        const el: VendorFullscreenElement = containerRef.current || document.documentElement;
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
        const fullscreenDocument = document as VendorFullscreenDocument;
        const exit =
          document.exitFullscreen ||
          fullscreenDocument.webkitExitFullscreen ||
          fullscreenDocument.mozCancelFullScreen ||
          fullscreenDocument.msExitFullscreen;
        if (!exit) {
          toast.error('Tela cheia não é suportada neste navegador.');
          return;
        }
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
    onVolumeChange(Math.min(1, Math.round((volume + 0.01) * 100) / 100));
  };

  const handleVolumeFineDown = () => {
    onVolumeChange(Math.max(0, Math.round((volume - 0.01) * 100) / 100));
  };

  const handleMidiToggle = async () => {
    if (midiEnabled) {
      setMidiEnabled(false);
      setMidiConnected(false);
      return;
    }
    try {
      const requestMIDIAccess = (navigator as BrowserNavigator).requestMIDIAccess;
      if (!requestMIDIAccess) {
        toast.error('Este navegador não oferece suporte a dispositivos MIDI.');
        return;
      }
      const access = await requestMIDIAccess.call(navigator);
      setMidiAccess(access);
      setMidiEnabled(true);
    } catch {
      toast.error('Não foi possível acessar a mesa MIDI. Verifique a conexão e a permissão do navegador.');
    }
  };

  useEffect(() => {
    if (!midiEnabled || !midiAccess) return;
    const attachInputs = () => {
      let connectedInputs = 0;
      midiAccess.inputs.forEach((input) => {
        if (input.state !== 'connected') {
          input.onmidimessage = null;
          return;
        }
        connectedInputs += 1;
        input.onmidimessage = (event) => {
          const [statusByte, controller, value] = event.data || [];
          // CC7 (volume) é o controle MIDI padrão para volume.
          if ((statusByte & 0xf0) === 0xb0 && controller === 7 && Number.isFinite(value)) {
            onVolumeChange(value / 127);
          }
        };
      });
      setMidiConnected(connectedInputs > 0);
    };
    attachInputs();
    midiAccess.onstatechange = attachInputs;
    return () => {
      midiAccess.inputs.forEach((input) => { input.onmidimessage = null; });
      midiAccess.onstatechange = null;
    };
  }, [midiEnabled, midiAccess, onVolumeChange]);

  // Rolagem do mouse sobre o controle de volume
  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    const newVolume = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
    onVolumeChange(newVolume);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não sequestrar teclas quando o usuário está digitando em um input/textarea/contentEditable
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
          return;
        }
      }
      setShowKeyboardHints(true);
      switch (e.key) {
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          handlePrevStage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextStage();
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
      if (!target) return;
      // Bug corrigido: o handler global sequestrava a rolagem de qualquer
      // elemento (modais, listas, atalhos, dropdowns). Agora respeitamos
      // qualquer container marcado com data-allow-scroll, o painel do
      // roteiro e qualquer elemento com overflow rolável real.
      if (target.closest('[data-quick-sounds],[data-roteiro-scroll],[data-allow-scroll],[role="dialog"],[role="menu"],[role="listbox"],input,textarea,select')) return;
      // Verifica se algum ancestral tem overflow rolável nativo.
      let el: HTMLElement | null = target;
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.01 : -0.01;
      onVolumeChange(Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100)));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [volume, onVolumeChange]);


  const handlePlayWithTimer = () => {
    if (!currentAudio || !currentStage) return;
    startTimedStageAudio(currentAudio.audio_url);
  };

  const saveStageVolumeSettings = async () => {
    if (!currentStage) return;
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
        .eq('id', currentStage.id);
      if (error) throw error;
      try {
        localStorage.setItem(`stage:volumeSettings:${currentStage.id}`, JSON.stringify({
          initialPercent: settings.volume_start_percent,
          rampEnabled: settings.volume_ramp_enabled,
          finalPercent: settings.volume_final_percent,
          rampSeconds: settings.volume_ramp_seconds,
        }));
      } catch (storageError) {
        console.warn('Não foi possível armazenar localmente o volume da etapa:', storageError);
      }
      queryClient.setQueryData<CeremonyStage[]>(['stages'], (cachedStages) =>
        cachedStages?.map((stage) => stage.id === currentStage.id ? { ...stage, ...settings } : stage),
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
    const prevVisibleIdx = [...Array(selectedStageIndex).keys()].reverse().find(i => !stages[i].oculto || stages[i].id === currentStageId);
    if (prevVisibleIdx !== undefined) {
      if (isActive) handleStop();
      setSelectedStageIndex(prevVisibleIdx);
    }
  };

  const handleNextStage = () => {
    const nextVisibleIdx = [...Array(stages.length).keys()].slice(selectedStageIndex + 1).find(i => !stages[i].oculto || stages[i].id === currentStageId);
    if (nextVisibleIdx !== undefined) {
      if (isActive) handleStop();
      setSelectedStageIndex(nextVisibleIdx);
    }
  };

  const handleTimeChange = (minutes: number) => {
    const clamped = Math.min(
      MAX_STAGE_TIMER_SECONDS / 60,
      Math.max(MIN_STAGE_TIMER_SECONDS / 60, Math.round(minutes)),
    );
    const seconds = clamped * 60;
    setCustomTime(seconds);
    if (currentStage) {
      try { saveStageTimerSeconds(currentStage.id, seconds); } catch {
        // The timer remains usable in memory when browser storage is unavailable.
      }
    }
  };

  const handleTimerEnabledChange = (enabled: boolean) => {
    setUseTimerEnabled(enabled);
    if (currentStage) {
      try { saveStageTimerEnabled(currentStage.id, enabled); } catch {
        // The timer remains usable in memory when browser storage is unavailable.
      }
    }
    if (!enabled) timer.reset();
    else if (isActive) timer.start(customTime);
  };

  const startTimedStageAudio = (audioUrl: string) => {
    if (!currentStage) return;
    if (useTimerEnabled && customTime > 0) timer.start(customTime);
    else timer.reset();
    const audio = audios.find((item) => item.audio_url === audioUrl);
    onPlay(currentStage.id, audioUrl, {
      masterVolume: audio?.volume_config ?? stageVolume,
      ...stageVolumeSettings,
    });
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
    <div
      ref={containerRef}
      data-presentation-root
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
    >
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
        </div>

        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">





          {!focusMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMidiToggle}
                title={midiEnabled ? 'Desativar controle MIDI de volume' : 'Ativar controle MIDI de volume (CC7)'}
                className={cn('h-8 gap-1.5 px-2 text-xs', midiEnabled ? 'border-gold/50 text-gold' : 'text-muted-foreground')}
              >
                <SlidersHorizontal size={14} />
                <span>{midiEnabled ? (midiConnected ? 'MIDI ativo' : 'MIDI aguardando') : 'Conectar mesa'}</span>
              </Button>
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

              <DropdownMenu modal={false} open={contingencyOpen} onOpenChange={setContingencyOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs border-gold/40 bg-gold/5 text-gold shadow-[0_0_0_1px_rgba(212,175,55,0.15)]"
                    aria-label={contingencyOpen ? 'Fechar painel de contingência' : 'Abrir painel de contingência'}
                    aria-expanded={contingencyOpen}
                  >
                    <SlidersHorizontal size={14} />
                    <span className="hidden sm:inline">Contingência</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-[70vh] w-80 overflow-y-auto"
                  onInteractOutside={(event) => event.preventDefault()}
                  onEscapeKeyDown={(event) => event.preventDefault()}
                >
                  <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={!currentAudio || !isActive}
                    onSelect={(event) => {
                      event.preventDefault();
                      onSeekTo?.(0);
                    }}
                  >
                    <RotateCcw size={14} className="mr-2" /> Reiniciar áudio da etapa atual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleToggleMute();
                    }}
                  >
                    {isMuted ? <Volume2 size={14} className="mr-2" /> : <VolumeX size={14} className="mr-2" />}
                    {isMuted ? 'Reativar som' : 'Silenciar temporariamente'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Pular para uma etapa</DropdownMenuLabel>
                  {visibleStages.map((stage, index) => {
                    const stageIndex = stages.findIndex((item) => item.id === stage.id);
                    const stageColor = stageColors[stage.id];
                    return (
                      <div
                        key={stage.id}
                        className={cn(
                          'flex items-center gap-1 rounded-md border px-1',
                          stageIndex === selectedStageIndex
                            ? 'border-gold bg-gold/15 shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : 'border-transparent'
                        )}
                        style={{
                          backgroundColor: stageIndex === selectedStageIndex
                            ? 'color-mix(in srgb, hsl(var(--gold)) 18%, hsl(var(--card)))'
                            : stageColor
                              ? `color-mix(in srgb, ${stageColor} 28%, transparent)`
                            : undefined,
                        }}
                      >
                        <button
                          type="button"
                          disabled={stageIndex === selectedStageIndex}
                          className={cn(
                            'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-100',
                            stageIndex === selectedStageIndex && 'font-bold text-gold'
                          )}
                          onClick={() => {
                            if (isActive) handleStop();
                            setSelectedStageIndex(stageIndex);
                          }}
                        >
                          <span
                            className="inline-flex h-3 w-3 shrink-0 rounded-full border border-foreground/30"
                            style={{
                              backgroundColor: stageColor
                                || (stageIndex === selectedStageIndex ? 'hsl(var(--gold))' : undefined),
                            }}
                          />
                          <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                          <span className="min-w-0 flex-1 truncate">{stage.nome_simbolico}</span>
                          {stageIndex === selectedStageIndex && (
                            <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                              Atual
                            </span>
                          )}
                        </button>
                        <label
                          className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-accent"
                          title={`Escolher cor da etapa ${stage.nome_simbolico}`}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <Palette size={14} style={{ color: stageColor || 'hsl(var(--muted-foreground))' }} />
                          <input
                            type="color"
                            value={stageColor || '#D4AF37'}
                            onChange={(event) => updateStageColor(stage.id, event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            aria-label={`Escolher cor da etapa ${stage.nome_simbolico}`}
                          />
                        </label>
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                title="Ajuda e atalhos"
                className="h-8 w-8 text-gold border border-gold/20 bg-gold/5"
              >
                <HelpCircle size={16} />
              </Button>

            </>
          )}

          <span className="text-xs text-muted-foreground px-1">
            {visibleStagePosition + 1}/{visibleStages.length}
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
        {showVolume && (
          <div className="w-full px-1 pb-1 sm:hidden animate-fade-in">
            <VolumePresets volume={volume} onVolumeChange={onVolumeChange} compact />
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
      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 relative overflow-y-auto">
        {/* Background Banner */}
        <img 
          src={presentationBanner} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/70 to-background pointer-events-none" />
        {currentStageColor && (
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-500"
            style={{
              background: `radial-gradient(ellipse at center, color-mix(in srgb, ${currentStageColor} 22%, transparent) 0%, transparent 72%)`,
            }}
          />
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
            <div className="w-full pt-3 border-t border-gold/20">
              <VolumePresets volume={volume} onVolumeChange={onVolumeChange} compact />
            </div>

            <div className="flex flex-col items-center gap-1 pt-3 border-t border-gold/20 w-full">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Iniciar em ({stageVolumeSettings.initialPercent}%)
              </span>
              <select
                value={stageVolumeSettings.initialPercent}
                onChange={(e) => {
                  const initialPercent = Number(e.target.value);
                  setStageVolumeSettings((current) => ({
                    ...current,
                    initialPercent,
                    finalPercent: Math.max(initialPercent, current.finalPercent),
                  }));
                }}
                aria-label="Volume inicial da etapa"
                className="bg-background/80 border border-gold/30 text-gold text-xs rounded-md px-2 py-1 outline-none"
              >
                {Array.from({ length: 101 }, (_, i) => i).map((p) => (
                  <option key={p} value={p}>{p}%</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center gap-1 pt-3 border-t border-gold/20 w-full">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={stageVolumeSettings.rampEnabled}
                  onChange={(e) => setStageVolumeSettings((current) => ({
                    ...current,
                    rampEnabled: e.target.checked,
                  }))}
                  className="accent-[hsl(var(--gold))]"
                />
                Subida suave
              </label>
              {stageVolumeSettings.rampEnabled && (
                <div className="flex flex-col items-center gap-1">
                  <select
                    value={stageVolumeSettings.finalPercent}
                    onChange={(e) => setStageVolumeSettings((current) => ({
                      ...current,
                      finalPercent: Number(e.target.value),
                    }))}
                    aria-label="Volume final da subida suave"
                    className="bg-background/80 border border-gold/30 text-gold text-xs rounded-md px-2 py-1 outline-none"
                  >
                    {Array.from(
                      { length: 101 - stageVolumeSettings.initialPercent },
                      (_, index) => index + stageVolumeSettings.initialPercent,
                    ).map((p) => (
                      <option key={p} value={p}>até {p}%</option>
                    ))}
                  </select>
                  <select
                    value={stageVolumeSettings.rampSeconds}
                    onChange={(e) => setStageVolumeSettings((current) => ({
                      ...current,
                      rampSeconds: Number(e.target.value),
                    }))}
                    aria-label="Duração da subida suave"
                    className="bg-background/80 border border-gold/30 text-gold text-xs rounded-md px-2 py-1 outline-none"
                  >
                    {STAGE_RAMP_DURATIONS.map((s) => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!currentStage || savingVolumeSettings}
                onClick={saveStageVolumeSettings}
                className="h-7 border-gold/30 text-[10px] text-gold hover:bg-gold/10"
              >
                {savingVolumeSettings ? 'Salvando...' : 'Salvar etapa'}
              </Button>
            </div>

          </div>
        </div>



        {/* Central Card - responsive sizing (levemente reduzido para deixar
            visível a faixa das próximas etapas acima do rodapé) */}
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center my-auto sm:scale-[0.92] md:scale-[0.9] origin-center sm:mb-16">
          {/* Removed Background Music option from here as requested */}


          <div className={cn('relative w-full bg-gradient-to-br from-card/90 via-card/70 to-card/40 backdrop-blur-xl border border-gold/20 ring-1 ring-white/5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 flex flex-col items-center', compact ? 'p-3 sm:p-4 md:p-5' : 'p-4 sm:p-5 md:p-8')}>

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
              currentStage.icone_url ? 'p-0' : compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6 md:p-8',
              isActive 
                ? 'bg-gold/20 text-gold scale-105 sm:scale-110 shadow-[0_0_50px_rgba(212,175,55,0.35)] ring-gold/40' 
                : 'bg-secondary/80 text-muted-foreground ring-border/40'
            )}
          >
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={currentStage.icone_url}
              size={currentStage.icone_url ? (compact ? 64 : 96) : (compact ? 36 : 48)}
              className="sm:hidden"
            />
            <CeremonyIcon 
              name={currentStage.icone} 
              imageUrl={currentStage.icone_url}
              size={currentStage.icone_url ? (compact ? 80 : 128) : (compact ? 44 : 64)}
              className="hidden sm:block"
            />
          </div>

          {/* Stage Name */}
          <h1 className={cn(
            'font-display font-bold text-center rounded-xl px-4 py-1',
            currentStageColor
              ? 'text-foreground'
              : 'bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent',
            compact ? 'text-lg sm:text-xl md:text-2xl mb-1' : 'text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2'
          )}
            style={currentStageColor ? {
              backgroundColor: `color-mix(in srgb, ${currentStageColor} 24%, transparent)`,
              outline: `1px solid color-mix(in srgb, ${currentStageColor} 58%, transparent)`,
            } : undefined}
          >
            {currentStage.nome_simbolico}
          </h1>
          {currentAudio && (
            <div className="flex justify-center mb-2">
              <TrackHzBadge url={currentAudio.audio_url} playing={isPlaying} size="sm" />
            </div>
          )}

          {currentAudio && isCacheableAudioUrl(currentAudio.audio_url) && (
            <div className="flex justify-center mb-4">
              <span 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
                  audioReady 
                    ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30" 
                    : "text-muted-foreground/60 bg-secondary/80 border border-border/40"
                )}
                title={audioReady ? "Áudio disponível localmente" : "Baixando para uso offline..."}
              >
                {audioReady ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                {audioReady ? 'Disponível Offline' : 'Cacheando...'}
              </span>
            </div>
          )}


          {/* Description */}
          {currentStage.descricao && !compact && (
            <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mb-3 sm:mb-5 line-clamp-2 sm:line-clamp-none">
              {currentStage.descricao}
            </p>
          )}

          {/* Ritual Details Area */}
          <div className="w-full mt-2 mb-4 px-4 sm:px-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Pencil size={14} className="text-gold/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Instruções do Ritual
                </span>
              </div>
              <button 
                onClick={() => setIsRitualEditing(!isRitualEditing)}
                className="text-[10px] text-gold hover:text-gold-glow transition-colors font-medium underline underline-offset-2"
              >
                {isRitualEditing ? 'Concluir' : 'Editar'}
              </button>
            </div>
            
            {isRitualEditing ? (
              <RitualDetailsEditor
                value={ritualDetails}
                onChange={(value) => void saveRitualDetails(value)}
                onRequestAddHarmony={(insert) => {
                  pendingHarmonyInsert.current = insert;
                  setHarmonyPickerOpen(true);
                }}
                placeholder="Escreva aqui detalhes importantes para o Mestre de Harmonia..."
                className="border-gold/20 shadow-inner"
                minHeight={100}
                autoFocus
              />
            ) : (
              <div 
                onClick={() => setIsRitualEditing(true)}
                className={cn(
                  "w-full min-h-[60px] p-4 rounded-xl border border-dashed border-gold/10 bg-gold/5 cursor-pointer hover:border-gold/30 transition-all",
                  !ritualDetails && "flex items-center justify-center italic text-muted-foreground/40 text-sm"
                )}
              >
                {ritualDetails ? (
                  <RitualDetailsDisplay
                    value={ritualDetails}
                    className="text-sm text-foreground/90 leading-relaxed text-center italic"
                    onHarmonyPlay={(audioUrl) => {
                      startTimedStageAudio(audioUrl);
                    }}
                  />
                ) : (
                  "Nenhuma instrução definida para esta etapa. Clique para adicionar detalhes."
                )}
              </div>
            )}
          </div>

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
            const sourcesPresent = new Set(audios.map((a) => getAudioSource(a.audio_url, a.tipo)));
            const filterOptions: Array<{ key: 'all' | AudioSource; label: string; icon: JSX.Element }> = [
              { key: 'all', label: 'Todas', icon: <Music size={13} className="shrink-0" /> },
              { key: 'youtube', label: 'YouTube', icon: <YoutubeIcon size={13} className="shrink-0" /> },
              
              { key: 'file', label: 'Baixado', icon: <FolderMusicIcon size={13} className="shrink-0" /> },
            ];

            const visibleFilters = filterOptions.filter((f) => f.key === 'all' || sourcesPresent.has(f.key as AudioSource));
            const effectiveFilter = sourceFilter !== 'all' && !sourcesPresent.has(sourceFilter as AudioSource) ? 'all' : sourceFilter;
            const filteredAudios = audios
              .map((audio, index) => ({ audio, index }))
              .filter(({ audio }) => effectiveFilter === 'all' || getAudioSource(audio.audio_url, audio.tipo) === effectiveFilter);

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
                          <AudioSourceIcon url={audio.audio_url} tipo={audio.tipo} size={12} className="sm:hidden" active={selected} />
                          <AudioSourceIcon url={audio.audio_url} tipo={audio.tipo} size={14} className="hidden sm:block" active={selected} />
                          {audio.nome || `Áudio ${index + 1}`}
                          <TrackHzBadge url={audio.audio_url} playing={selected && isPlaying} className="ml-1" />
                          {selected && audio && isCacheableAudioUrl(audio.audio_url) && (
                            <span className={cn("ml-1", audioReady ? "text-emerald-500" : "text-muted-foreground/40")}>
                              <CheckCircle2 size={10} />
                            </span>
                          )}
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
                onChange={(e) => handleTimerEnabledChange(e.target.checked)}
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
                  max={String(MAX_STAGE_TIMER_SECONDS / 60)}
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
      </div>
    </main>


      {/* Navigation Footer - responsive */}
      <footer className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-gold/10 bg-card/70 backdrop-blur-xl shrink-0">
        <Button
          onClick={handlePrevStage}
          disabled={!stages.slice(0, selectedStageIndex).some(s => !s.oculto || s.id === currentStageId)}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 sm:gap-2 px-2 sm:px-6',
            !stages.slice(0, selectedStageIndex).some(s => !s.oculto || s.id === currentStageId) ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <ChevronLeft size={18} className="sm:hidden" />
          <ChevronLeft size={24} className="hidden sm:block" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Timeline - scrollable */}
        <div className="flex items-center gap-0 overflow-x-auto max-w-[55vw] sm:max-w-[60vw] py-1 sm:py-2 scrollbar-none">
          {stages.map((stage, index) => {
            const isOculto = stage.oculto && stage.id !== currentStageId;
            if (isOculto) return null;
            
            const isSelected = index === selectedStageIndex;
            const isPlayingStage = currentStageId === stage.id && status !== 'idle';
            const isPast = index < selectedStageIndex;

            // Encontra a próxima etapa visível para saber se desenha a linha
            const hasNextVisible = stages.slice(index + 1).some(s => !s.oculto || s.id === currentStageId);

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
                      'w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all relative',
                      isSelected
                        ? 'bg-gold border-gold scale-125 shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                        : isPlayingStage
                          ? 'bg-gold/50 border-gold/50'
                          : isPast
                            ? 'bg-gold/30 border-gold/40'
                            : 'bg-secondary border-border group-hover:border-muted-foreground',
                      stage.oculto && 'opacity-50 ring-1 ring-destructive/30'
                    )}
                  >
                    {stage.oculto && (
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-destructive rounded-full" title="Etapa oculta" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[8px] sm:text-[10px] max-w-[40px] sm:max-w-[60px] truncate transition-colors',
                      isSelected ? 'text-gold font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                </button>
                {index < stages.length - 1 && hasNextVisible && (
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
          disabled={!stages.slice(selectedStageIndex + 1).some(s => !s.oculto || s.id === currentStageId)}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 sm:gap-2 px-2 sm:px-6',
            !stages.slice(selectedStageIndex + 1).some(s => !s.oculto || s.id === currentStageId) ? 'opacity-30 cursor-not-allowed' : 'hover:text-gold'
          )}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight size={18} className="sm:hidden" />
          <ChevronRight size={24} className="hidden sm:block" />
        </Button>
      </footer>

      {/* Next Stage Info (Desktop) */}
      {(() => {
        const nextVisibleIdx = [...Array(stages.length).keys()].slice(selectedStageIndex + 1).find(i => !stages[i].oculto || stages[i].id === currentStageId);
        if (nextVisibleIdx === undefined) return null;
        const nextNextVisibleIdx = [...Array(stages.length).keys()].slice(nextVisibleIdx + 1).find(i => !stages[i].oculto || stages[i].id === currentStageId);

        return (
          <div 
            className="absolute bottom-[74px] left-1/2 -translate-x-1/2 transition-all duration-300 animate-fade-in hidden sm:block max-w-[90vw]"
          >
            <div className="flex items-center gap-2">
              {/* Próxima */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-gold/30 shadow-xl shadow-black/60">
                <ChevronRight size={14} className="text-gold shrink-0" />
                <span className="text-[9px] text-gold/60 uppercase tracking-widest font-bold shrink-0">Próxima</span>
                <span className="text-xs text-foreground font-display font-medium truncate max-w-[220px]">
                  {stages[nextVisibleIdx]?.nome_simbolico}
                </span>
              </div>

              {/* Segunda Próxima (ao lado) */}
              {nextNextVisibleIdx !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg border border-gold/10 opacity-70">
                  <ChevronRight size={12} className="text-gold/50 shrink-0" />
                  <span className="text-[8px] text-gold/40 uppercase tracking-widest font-bold shrink-0">Em seguida</span>
                  <span className="text-[11px] text-foreground/70 font-display truncate max-w-[180px]">
                    {stages[nextNextVisibleIdx]?.nome_simbolico}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* Painel de Sons Rápidos (coluna lateral esquerda em tela cheia) */}
      <div className="hidden lg:flex fixed left-0 top-[52px] bottom-0 w-[240px] z-30 animate-fade-in">
        <QuickSoundsPanel fullHeight />
      </div>
      <QuickSoundsPanel horizontal />




      {/* Próxima Etapa no Header para Mobile */}
      {(() => {
        const nextVisibleIdx = [...Array(stages.length).keys()].slice(selectedStageIndex + 1).find(i => !stages[i].oculto || stages[i].id === currentStageId);
        if (nextVisibleIdx === undefined) return null;
        
        return (
          <div className="fixed top-[52px] left-0 right-0 z-[60] px-4 py-2 sm:hidden flex justify-center animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-md rounded-lg border border-gold/20 shadow-lg">
              <span className="text-[9px] text-gold/60 uppercase tracking-widest font-bold">Próxima:</span>
              <span className="text-xs text-foreground font-medium truncate max-w-[150px]">
                {stages[nextVisibleIdx]?.nome_simbolico}
              </span>
            </div>
          </div>
        );
      })()}


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
              Pesquise no acervo e selecione a faixa para este ponto das instruções.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Music size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={harmonySearch}
              onChange={(event) => setHarmonySearch(event.target.value)}
              placeholder="Pesquisar harmonias..."
              className="border-border bg-secondary pl-9"
              aria-label="Pesquisar harmonias no acervo"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {libraryAudios
              .filter((audio) => audio.nome.toLocaleLowerCase().includes(harmonySearch.trim().toLocaleLowerCase()))
              .map((audio) => {
                const alreadyAdded = audios.some((item) => item.audio_url === audio.audio_url);
                const isAdding = addingHarmonyUrls.current.has(audio.audio_url);
                return (
                  <div
                    key={audio.id}
                    className="flex items-center gap-1 rounded-lg border border-transparent px-1.5 transition-colors hover:border-gold/25 hover:bg-secondary/70"
                  >
                    <button
                      type="button"
                      aria-label={`Ouvir ${audio.nome}`}
                      title={`Ouvir ${audio.nome}`}
                      disabled={!currentStage}
                      onClick={() => currentStage && onPlay(currentStage.id, audio.audio_url, {
                        masterVolume: stageVolume,
                        ...stageVolumeSettings,
                      })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gold hover:bg-gold/10 disabled:opacity-50"
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => chooseRitualHarmony(audio)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-left transition-colors',
                        'text-foreground hover:bg-secondary/50 disabled:cursor-wait disabled:opacity-60',
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
                        {isAdding ? 'Salvando...' : alreadyAdded ? 'Inserir' : <Plus size={15} />}
                      </span>
                    </button>
                  </div>
                );
              })}
            {libraryAudios.filter((audio) =>
              audio.nome.toLocaleLowerCase().includes(harmonySearch.trim().toLocaleLowerCase())
            ).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma harmonia encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              { keys: ['Backspace'], desc: 'Voltar rapidamente uma etapa' },
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

      {/* Sons rápidos (mobile) */}
      <div
        className="lg:hidden fixed z-50 touch-none"
        style={{ left: '12px', bottom: '96px' }}
        draggable
        onDragEnd={(event) => {
          const panel = event.currentTarget;
          const left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, event.clientX - panel.offsetWidth / 2));
          const top = Math.max(56, Math.min(window.innerHeight - panel.offsetHeight, event.clientY - panel.offsetHeight / 2));
          panel.style.left = `${left}px`;
          panel.style.top = `${top}px`;
          panel.style.bottom = 'auto';
        }}
      >
        <QuickSoundsPanel compact />
      </div>

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
