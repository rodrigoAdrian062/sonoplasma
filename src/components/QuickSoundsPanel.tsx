import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, Plus, X, Volume2, Zap, Search, Pencil, Check, Repeat, Rows3, Columns3, GripVertical, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VolumePresets } from './VolumePresets';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { toast } from 'sonner';
import { getYouTubeVideoId } from '@/lib/embedUrl';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import {
  QUICK_SOUNDS_CLOUD_KEY,
  QUICK_SOUNDS_HORIZONTAL_CLOUD_KEY,
  QUICK_SOUNDS_HORIZONTAL_STORAGE_KEY,
  QUICK_SOUNDS_STORAGE_KEY,
  quickSoundKind,
  type QuickSoundData,
} from '@/lib/quickSounds';
import { playQuickYouTube, stopQuickYouTube, setQuickYouTubeVolume, destroyQuickYouTube } from '@/lib/quickYoutubePlayer';
import { playSpotifyEntity, pauseSpotifyEntity } from '@/lib/spotifyIframePlayer';


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuickSoundTrimDialog } from './QuickSoundTrimDialog';

import { loadCloudState, saveCloudState, saveCloudStateDebounced } from '@/lib/cloudState';

const VOLUME_KEY = 'sonoplastia:quickSoundsVolume';
const MAX_SLOTS = 20;

type QuickSound = QuickSoundData;

function loadSounds(storageKey: string): QuickSound[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SLOTS) : [];
  } catch {
    return [];
  }
}

/** Formatos que o navegador não reproduz (ex.: WMA). */
function isUnsupportedFormat(url: string): boolean {
  const clean = (url || '').split('?')[0].toLowerCase();
  return /\.(wma|wmv|asf|ra|rm|aiff?)$/.test(clean);
}

function loadVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.7;
}

interface QuickSoundsHorizontalBarProps {
  sounds: QuickSound[];
  playingId: string | null;
  draggingId: string | null;
  onAdd: () => void;
  onPlay: (sound: QuickSound) => void;
  onDrop: (targetId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (soundId: string, event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onTrim: (sound: QuickSound) => void;
  onLoop: (soundId: string) => void;
  onFadeStop: (soundId: string) => void;
  onRename: (sound: QuickSound) => void;
  onRemove: (soundId: string) => void;
}

function QuickSoundsHorizontalBar({
  sounds,
  playingId,
  draggingId,
  onAdd,
  onPlay,
  onDrop,
  onDragStart,
  onDragEnd,
  onTrim,
  onLoop,
  onFadeStop,
  onRename,
  onRemove,
}: QuickSoundsHorizontalBarProps) {
  return (
    <div
      data-quick-sounds-horizontal
      className="fixed left-[240px] right-[200px] top-[52px] z-30 flex h-[100px] items-center gap-2 border-b border-gold/15 bg-background/70 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-md"
    >
      <div className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-1 border-r border-gold/15 pr-2">
        <Zap size={14} className={cn('text-gold', playingId && 'animate-pulse')} />
        <span className="text-center text-[9px] font-bold uppercase tracking-[0.14em] text-gold/80">
          Sons rápidos
        </span>
        {sounds.length < MAX_SLOTS && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-6 items-center gap-1 rounded-md px-2 text-[9px] text-gold hover:bg-gold/10"
            title="Adicionar som rápido"
          >
            <Plus size={11} /> Atalho
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
        {sounds.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground">Adicione sons rápidos para acessá-los aqui.</p>
        )}
        {sounds.map((sound, index) => (
          <div
            key={sound.id}
            className={cn(
              'group relative flex h-[76px] w-[138px] shrink-0 flex-col justify-end rounded-lg border border-gold/15 bg-black/25 px-1.5 pb-1',
              draggingId === sound.id && 'opacity-50'
            )}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => onDrop(sound.id, event)}
          >
            <button
              type="button"
              onClick={() => onPlay(sound)}
              title={sound.nome}
              className={cn(
                'flex h-9 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-[10px] font-medium transition-colors',
                playingId === sound.id
                  ? 'bg-gold text-background'
                  : 'bg-secondary/70 text-foreground hover:bg-gold/15 hover:text-gold'
              )}
            >
              {playingId === sound.id ? <Square size={10} className="shrink-0" /> : <Play size={10} className="shrink-0" />}
              <span className="truncate">{index + 1}. {sound.nome}</span>
              {(sound.trimStartSeconds !== undefined || sound.trimEndSeconds !== undefined) && (
                <Scissors size={9} className="shrink-0 text-gold" />
              )}
            </button>
            <div className="mt-1 flex h-5 items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                draggable
                onDragStart={(event) => onDragStart(sound.id, event)}
                onDragEnd={onDragEnd}
                onClick={(event) => event.preventDefault()}
                className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground"
                title="Arraste para reordenar"
                aria-label={`Arrastar ${sound.nome} para reordenar`}
              >
                <GripVertical size={11} />
              </button>
              <button
                type="button"
                onClick={() => onTrim(sound)}
                disabled={quickSoundKind(sound.url) !== 'file'}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-gold disabled:opacity-40"
                title="Cortar som"
                aria-label={`Cortar ${sound.nome}`}
              >
                <Scissors size={11} />
              </button>
              <button
                type="button"
                onClick={() => onLoop(sound.id)}
                className={cn('flex h-5 w-5 items-center justify-center rounded', sound.loop ? 'text-gold' : 'text-muted-foreground hover:text-gold')}
                title={sound.loop ? 'Desativar loop' : 'Ativar loop'}
                aria-label={sound.loop ? 'Desativar loop' : 'Ativar loop'}
              >
                <Repeat size={11} />
              </button>
              <button
                type="button"
                onClick={() => onFadeStop(sound.id)}
                className={cn('flex h-5 w-5 items-center justify-center rounded', sound.fadeStop ? 'text-blue-400' : 'text-muted-foreground hover:text-gold')}
                title={sound.fadeStop ? 'Desativar fade-out' : 'Ativar fade-out'}
                aria-label={sound.fadeStop ? 'Desativar fade-out' : 'Ativar fade-out'}
              >
                <Volume2 size={11} />
              </button>
              <button
                type="button"
                onClick={() => onRename(sound)}
                className="flex h-5 w-5 items-center justify-center rounded bg-gold/10 text-gold hover:bg-gold/20"
                title="Renomear som"
                aria-label={`Renomear ${sound.nome}`}
              >
                <Pencil size={10} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(sound.id)}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                title="Remover som"
                aria-label={`Remover ${sound.nome}`}
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sons rápidos (soundboard) — atalhos de play para efeitos curtos. */
export function QuickSoundsPanel({
  compact = false,
  fullHeight = false,
  horizontal = false,
}: {
  compact?: boolean;
  fullHeight?: boolean;
  horizontal?: boolean;
}) {
  const storageKey = horizontal ? QUICK_SOUNDS_HORIZONTAL_STORAGE_KEY : QUICK_SOUNDS_STORAGE_KEY;
  const cloudKey = horizontal ? QUICK_SOUNDS_HORIZONTAL_CLOUD_KEY : QUICK_SOUNDS_CLOUD_KEY;
  const { audios, isLoading } = useAudioLibrary();
  const [sounds, setSounds] = useState<QuickSound[]>(() => loadSounds(storageKey));
  const [volume, setVolume] = useState<number>(loadVolume);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [horizontalPortalTarget, setHorizontalPortalTarget] = useState<HTMLElement | null>(null);
  const [compactVertical, setCompactVertical] = useState(() => localStorage.getItem('sonoplastia:quickSoundsVertical') === 'true');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [trimEditingSound, setTrimEditingSound] = useState<QuickSound | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const loopRef = useRef(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!horizontal) {
      setHorizontalPortalTarget(null);
      return;
    }
    setHorizontalPortalTarget(document.querySelector('[data-presentation-root]'));
  }, [horizontal]);

  useEffect(() => {
    const syncSounds = () => {
      setSounds(loadSounds(storageKey));
    };

    const handleAddExternal = (e: CustomEvent<{ nome: string; url: string }>) => {
      const { nome, url } = e.detail;
      
      const currentSounds = loadSounds(storageKey);

      if (currentSounds.length >= MAX_SLOTS) {
        toast.error(`Limite de ${MAX_SLOTS} sons rápidos atingido.`);
        return;
      }
      if (currentSounds.some((s) => s.url === url)) {
        toast.info(`"${nome}" já está nos sons rápidos.`);
        return;
      }
      
      const newSound: QuickSound = { 
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, 
        nome, 
        url, 
        loop: false 
      };
      
      const newSounds = [...currentSounds, newSound];
      localStorage.setItem(storageKey, JSON.stringify(newSounds));
      setSounds(newSounds);
      
      // Notificar todas as instâncias e outras abas
      window.dispatchEvent(new Event('sonoplastia:quickSoundsUpdated'));
      
      // Também dispara um evento de storage manual para garantir que outras abas ou componentes escutem
      window.dispatchEvent(new StorageEvent('storage', {
        key: storageKey,
        newValue: JSON.stringify(newSounds)
      }));
      
      toast.success(`"${nome}" adicionado aos sons rápidos!`);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) syncSounds();
    };

    if (!horizontal) {
      window.addEventListener('sonoplastia:addQuickSound', handleAddExternal as EventListener);
    }
    window.addEventListener('sonoplastia:quickSoundsUpdated', syncSounds);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      if (!horizontal) {
        window.removeEventListener('sonoplastia:addQuickSound', handleAddExternal as EventListener);
      }
      window.removeEventListener('sonoplastia:quickSoundsUpdated', syncSounds);
      window.removeEventListener('storage', handleStorage);
    };
  }, [horizontal, storageKey]);

  // Hidrata do banco ao montar (garante persistência após F5 / outro dispositivo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await loadCloudState<QuickSound[]>(cloudKey);
      if (cancelled) return;
      const local = loadSounds(storageKey);
      if (Array.isArray(remote)) {
        // Se o banco tem dados, ele é a fonte da verdade na entrada.
        if (remote.length > 0 || local.length === 0) {
          const next = remote.slice(0, MAX_SLOTS);
          localStorage.setItem(storageKey, JSON.stringify(next));
          setSounds(next);
          window.dispatchEvent(new Event('sonoplastia:quickSoundsUpdated'));
        } else if (local.length > 0) {
          // Primeira migração: envia o que existe localmente para o banco.
          void saveCloudState(cloudKey, local);
        }
      } else if (local.length > 0) {
        void saveCloudState(cloudKey, local);
      }
      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [cloudKey, storageKey]);

  // Sincronizar quando a biblioteca de áudios carregar (correção para audios adicionados externamente)
  useEffect(() => {
    if (!isLoading) {
      setSounds(loadSounds(storageKey));
    }
  }, [isLoading, audios, storageKey]);

  useEffect(() => {
    // Apenas persistir e notificar se o estado mudar via UI interna (como remoção ou renomeação)
    const currentStored = localStorage.getItem(storageKey);
    const newStored = JSON.stringify(sounds);
    if (currentStored !== newStored) {
      localStorage.setItem(storageKey, newStored);
      window.dispatchEvent(new Event('sonoplastia:quickSoundsUpdated'));
    }
    if (hydratedRef.current) saveCloudStateDebounced(cloudKey, sounds);
  }, [sounds, storageKey, cloudKey]);


  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (audioRef.current) audioRef.current.volume = volume;
    setQuickYouTubeVolume(volume);
  }, [volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      destroyQuickYouTube();
    };
  }, []);


  /** Erros de interrupção (troca rápida de faixa) não são falhas reais. */
  const isAbortError = (err: unknown) =>
    err instanceof Error && (err.name === 'AbortError' || /interrupt/i.test(err.message));

  /** Mensagem clara conforme o código de erro do elemento de mídia. */
  const mediaErrorText = (el: HTMLAudioElement) => {
    switch (el.error?.code) {
      case 1: return 'reprodução cancelada.';
      case 2: return 'falha de rede ao baixar o arquivo.';
      case 3: return 'arquivo de áudio corrompido.';
      case 4: return 'formato não suportado pelo navegador.';
      default: return 'erro desconhecido.';
    }
  };

  const clearFade = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  const togglePreview = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingId === id) {
      previewAudioRef.current?.pause();
      setPreviewingId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.onerror = null;
      previewAudioRef.current.onended = null;
      previewAudioRef.current.pause();
    }

    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.volume = volume;
    el.onended = () => setPreviewingId(null);
    el.onerror = () => {
      if (previewAudioRef.current !== el) return;
      setPreviewingId(null);
      toast.error(`Não foi possível ouvir a prévia: ${mediaErrorText(el)}`);
    };
    previewAudioRef.current = el;
    setPreviewingId(id);
    el.play().catch((err) => {
      if (previewAudioRef.current !== el || isAbortError(err)) return;
      setPreviewingId(null);
      toast.error('Toque na tela para liberar o áudio e tente novamente.');
    });
  };

  const stop = (soundId?: string) => {
    clearFade();
    // Encerra também players de stream (YouTube/Spotify), se ativos.
    const target = sounds.find((s) => s.id === (soundId || playingId));
    if (target && quickSoundKind(target.url) !== 'file') {
      if (quickSoundKind(target.url) === 'youtube') stopQuickYouTube();
      else void pauseSpotifyEntity();
      setPlayingId((cur) => (cur === target.id ? null : cur));
      return;
    }
    if (audioRef.current) {

      const currentSound = sounds.find(s => s.id === (soundId || playingId));

      if (currentSound?.fadeStop && !audioRef.current.paused) {
        const audio = audioRef.current;
        const initialVolume = audio.volume;
        const fadeOutDuration = 1500; // 1.5 segundos
        const interval = 50;
        const step = initialVolume / (fadeOutDuration / interval);

        fadeIntervalRef.current = setInterval(() => {
          // Se outro som assumiu o elemento, encerra o fade sem interferir.
          if (audioRef.current !== audio) {
            clearFade();
            return;
          }
          if (audio.volume > step) {
            audio.volume = Math.max(0, audio.volume - step);
          } else {
            audio.volume = 0;
            audio.pause();
            if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
              audio.currentTime = currentSound?.trimStartSeconds ?? 0;
            }
            audio.volume = volume;
            audio.onloadedmetadata = null;
            audio.ontimeupdate = null;
            clearFade();
            setPlayingId(null);
          }
        }, interval);
      } else {
        audioRef.current.onloadedmetadata = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.pause();
        if (audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
          audioRef.current.currentTime = currentSound?.trimStartSeconds ?? 0;
        }
        audioRef.current.volume = volume;
        setPlayingId(null);
      }
    } else {
      setPlayingId(null);
    }
    loopRef.current = false;
  };

  const openTrimEditor = (sound: QuickSound) => {
    if (quickSoundKind(sound.url) !== 'file') {
      toast.info('O corte está disponível apenas para arquivos de áudio.');
      return;
    }
    if (isUnsupportedFormat(sound.url)) {
      toast.error('Este formato não é compatível com o corte no navegador.');
      return;
    }

    if (playingId) stop();
    previewAudioRef.current?.pause();
    setPreviewingId(null);
    setTrimEditingSound(sound);
  };

  const saveTrim = (start: number | undefined, end: number | undefined) => {
    if (!trimEditingSound) return;
    if (playingId === trimEditingSound.id) stop(trimEditingSound.id);
    setSounds((prev) => prev.map((sound) => (
      sound.id === trimEditingSound.id
        ? { ...sound, trimStartSeconds: start, trimEndSeconds: end }
        : sound
    )));
    toast.success(
      start === undefined && end === undefined
        ? `Corte removido de "${trimEditingSound.nome}".`
        : `Corte salvo para "${trimEditingSound.nome}".`
    );
    setTrimEditingSound(null);
  };

  const trigger = (sound: QuickSound) => {
    if (playingId === sound.id) {
      stop(sound.id);
      return;
    }
    stop();
    // Um fade em andamento não pode continuar baixando/pausando o novo som.
    clearFade();

    const kind = quickSoundKind(sound.url);

    // YouTube e Spotify usam players próprios (isolados das etapas).
    if (kind !== 'file') {
      try { audioRef.current?.pause(); } catch { /* noop */ }
      stopQuickYouTube();
      void pauseSpotifyEntity();

      if (kind === 'youtube') {
        setPlayingId(sound.id);
        playQuickYouTube(sound.url, {
          volume,
          loop: !!sound.loop,
          onEnded: () => setPlayingId((cur) => (cur === sound.id ? null : cur)),
          onError: (msg) => {
            setPlayingId((cur) => (cur === sound.id ? null : cur));
            toast.error(`Não foi possível tocar "${sound.nome}": ${msg}`);
          },
        }).catch((err) => {
          setPlayingId((cur) => (cur === sound.id ? null : cur));
          toast.error(err?.message || 'Falha ao iniciar o vídeo do YouTube.');
        });
        return;
      }

      setPlayingId(sound.id);
      playSpotifyEntity(sound.url).catch((err) => {
        setPlayingId((cur) => (cur === sound.id ? null : cur));
        toast.error(err?.message || 'Falha ao iniciar a faixa do Spotify.');
      });
      return;
    }

    if (isUnsupportedFormat(sound.url)) {
      toast.error('Formato não suportado pelo navegador (WMA). Use MP3, M4A, OGG ou WAV.');
      return;
    }
    // Reutiliza sempre o mesmo elemento, totalmente reiniciado.
    const el = audioRef.current ?? new Audio();
    el.onended = null;
    el.onerror = null;
    el.onloadedmetadata = null;
    el.ontimeupdate = null;
    try { el.pause(); } catch { /* noop */ }
    el.crossOrigin = null;
    el.preload = 'auto';
    const trimStart = Math.max(0, sound.trimStartSeconds ?? 0);
    const hasCustomRange = trimStart > 0 || sound.trimEndSeconds !== undefined;
    if (sound.trimEndSeconds !== undefined && sound.trimEndSeconds <= trimStart) {
      toast.error(`O trecho de "${sound.nome}" está inválido. Ajuste o corte e tente novamente.`);
      return;
    }
    el.loop = !!sound.loop && !hasCustomRange;
    loopRef.current = !!sound.loop;
    el.volume = volume;
    el.src = sound.url;
    el.load();
    const startPlayback = () => {
      if (audioRef.current !== el) return;
      el.currentTime = trimStart;
      attempt();
    };
    el.onloadedmetadata = startPlayback;
    el.ontimeupdate = () => {
      if (
        audioRef.current !== el ||
        sound.trimEndSeconds === undefined ||
        el.currentTime < sound.trimEndSeconds
      ) return;

      if (loopRef.current) {
        el.currentTime = trimStart;
        el.play().catch((err) => {
          if (audioRef.current === el && !isAbortError(err)) {
            setPlayingId(null);
            toast.error(`Falha ao repetir "${sound.nome}": ${err?.message || 'erro desconhecido'}`);
          }
        });
      } else {
        el.pause();
        el.currentTime = trimStart;
        setPlayingId((cur) => (cur === sound.id ? null : cur));
      }
    };
    el.onended = () => {
      if (loopRef.current && hasCustomRange) {
        el.currentTime = trimStart;
        el.play().catch((err) => {
          if (audioRef.current === el && !isAbortError(err)) {
            setPlayingId(null);
            toast.error(`Falha ao repetir "${sound.nome}": ${err?.message || 'erro desconhecido'}`);
          }
        });
        return;
      }
      setPlayingId((cur) => (cur === sound.id ? null : cur));
    };
    el.onerror = () => {
      if (audioRef.current !== el) return;
      setPlayingId((cur) => (cur === sound.id ? null : cur));
      toast.error(`Não foi possível tocar "${sound.nome}": ${mediaErrorText(el)}`);
    };
    audioRef.current = el;
    setPlayingId(sound.id);

    const attempt = (retry = 0) => {
      el.play().catch((err) => {
        // Troca rápida de faixa: ignora, o novo som assume.
        if (audioRef.current !== el || isAbortError(err)) return;
        if (retry === 0 && err?.name !== 'NotAllowedError') {
          setTimeout(() => attempt(1), 400);
          return;
        }
        setPlayingId(null);
        toast.error(
          err?.name === 'NotAllowedError'
            ? 'Toque na tela para liberar o áudio e tente novamente.'
            : `Falha ao tocar "${sound.nome}": ${err?.message || 'erro desconhecido'}`
        );
      });
    };
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback();
  };


  const addSound = (nome: string, url: string) => {
    setSounds((prev) => {
      if (prev.length >= MAX_SLOTS) {
        toast.error(`Limite de ${MAX_SLOTS} sons rápidos atingido.`);
        return prev;
      }
      if (prev.some((s) => s.url === url)) {
        toast.info(`"${nome}" já está nos sons rápidos.`);
        return prev;
      }
      toast.success(`"${nome}" adicionado aos sons rápidos!`);
      return [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nome, url, loop: false }];
    });
  };

  const renameSound = (id: string, nome: string) => {
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, nome } : s)));
  };

  const toggleLoop = (id: string) => {
    setSounds((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, loop: !s.loop } : s));
      const target = next.find((s) => s.id === id);
      if (target && playingId === id && audioRef.current) {
        const hasCustomRange = (target.trimStartSeconds ?? 0) > 0 || target.trimEndSeconds !== undefined;
        audioRef.current.loop = !!target.loop && !hasCustomRange;
        loopRef.current = !!target.loop;
      }
      toast.success(target?.loop ? `Loop ativado: ${target.nome}` : `Loop desativado: ${target?.nome}`);
      return next;
    });
  };

  const toggleFadeStop = (id: string) => {
    setSounds((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, fadeStop: !s.fadeStop } : s));
      const target = next.find((s) => s.id === id);
      toast.success(target?.fadeStop ? `Fade-out ativado: ${target.nome}` : `Fade-out desativado: ${target?.nome}`);
      return next;
    });
  };

  const removeSound = (id: string) => {
    setSounds((prev) => prev.filter((s) => s.id !== id));
    if (playingId === id) stop(id);
  };

  const moveSound = (soundId: string, direction: -1 | 1) => {
    setSounds((prev) => {
      const from = prev.findIndex((sound) => sound.id === soundId);
      if (from < 0) return prev;
      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const reorderSound = (targetId: string, sourceId: string | null = draggingId) => {
    if (!sourceId || sourceId === targetId) return;
    setSounds((prev) => {
      const from = prev.findIndex((sound) => sound.id === sourceId);
      const to = prev.findIndex((sound) => sound.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggingId(null);
  };


  const playableAudios = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (audios || [])
      .filter((a) => !!a.audio_url)
      .filter((a) => (term ? (a.nome || '').toLowerCase().includes(term) : true))
      .slice(0, 200);
  }, [audios, search]);


  const handleWheel = (e: React.WheelEvent) => {
    // Volume isolado: nunca deixa o handler global da apresentação alterar o volume principal
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    setVolume((v) => Math.min(1, Math.max(0, Math.round((v + delta) * 100) / 100)));
  };

  const picker = (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="bg-card border-gold/20 max-w-2xl w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold">
            <Zap size={18} /> Adicionar som rápido
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na biblioteca..."
            className="pl-9"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {playableAudios.length === 0 && (
            <p className="text-xs text-muted-foreground py-10 text-center">
              Nenhum áudio encontrado na biblioteca.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
            {playableAudios.map((a) => {
              const kind = quickSoundKind(a.audio_url!);
              return (
              <div
                key={a.id}
                className="w-full flex items-center gap-2 p-1.5 rounded-xl border border-gold/10 bg-black/20 hover:border-gold/30 transition-all group"
              >
                {kind === 'file' ? (
                  <button
                    onClick={(e) => togglePreview(a.id, a.audio_url!, e)}
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                      previewingId === a.id ? "bg-gold text-background" : "bg-gold/10 text-gold hover:bg-gold/20"
                    )}
                    title={previewingId === a.id ? "Parar prévia" : "Ouvir prévia"}
                  >
                    {previewingId === a.id ? <Square size={14} /> : <Play size={14} />}
                  </button>
                ) : (
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center bg-black/30"
                    title={kind === 'youtube' ? 'Faixa do YouTube' : 'Faixa do Spotify'}
                  >
                    {kind === 'youtube' ? <YoutubeIcon size={16} /> : <SpotifyIcon size={16} />}
                  </div>
                )}

                <button
                  onClick={() => {
                    addSound(a.nome, a.audio_url!);
                    setPickerOpen(false);
                    if (previewAudioRef.current) previewAudioRef.current.pause();
                    setPreviewingId(null);
                  }}
                  className="flex-1 text-left py-2 group-hover:text-gold transition-colors truncate"
                >
                  <span className="text-sm font-medium truncate block">
                    {a.nome}
                  </span>
                </button>

                <button
                  onClick={() => {
                    addSound(a.nome, a.audio_url!);
                    setPickerOpen(false);
                    if (previewAudioRef.current) previewAudioRef.current.pause();
                    setPreviewingId(null);
                  }}
                  className="h-9 w-9 rounded-lg flex items-center justify-center bg-gold/5 text-gold/40 hover:bg-gold/20 hover:text-gold transition-all"
                  title="Adicionar"
                >
                  <Plus size={16} />
                </button>
              </div>
              );
            })}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Máximo de {MAX_SLOTS} atalhos. Arquivos, YouTube e Spotify são aceitos.

        </p>
      </DialogContent>
    </Dialog>
  );

  const trimEditor = (
    <QuickSoundTrimDialog
      sound={trimEditingSound}
      volume={volume}
      onOpenChange={(open) => {
        if (!open) setTrimEditingSound(null);
      }}
      onSave={saveTrim}
    />
  );

  if (horizontal) {
    return (
      <>
        {horizontalPortalTarget && createPortal(
          <QuickSoundsHorizontalBar
            sounds={sounds}
            playingId={playingId}
            draggingId={draggingId}
            onAdd={() => setPickerOpen(true)}
            onPlay={trigger}
            onDrop={(targetId, event) => {
              event.preventDefault();
              reorderSound(targetId, event.dataTransfer.getData('text/plain') || draggingId);
            }}
            onDragStart={(soundId, event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', soundId);
              setDraggingId(soundId);
            }}
            onDragEnd={() => setDraggingId(null)}
            onTrim={openTrimEditor}
            onLoop={toggleLoop}
            onFadeStop={toggleFadeStop}
            onRename={(sound) => {
              setEditingId(sound.id);
              setEditingName(sound.nome);
            }}
            onRemove={removeSound}
          />,
          horizontalPortalTarget
        )}
        {trimEditor}
        {picker}
      </>
    );
  }

  if (compact) {
    return (
      <div
        data-quick-sounds
        onWheel={handleWheel}
        className="flex flex-col gap-2 bg-card/80 backdrop-blur-md border border-gold/30 rounded-2xl p-2 shadow-xl shadow-black/40 max-w-[164px]"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] uppercase tracking-[0.18em] text-gold/70 font-bold text-center">Sons rápidos</span>
          <button
            type="button"
            onClick={() => setCompactVertical((vertical) => {
              localStorage.setItem('sonoplastia:quickSoundsVertical', String(!vertical));
              return !vertical;
            })}
            className="h-6 w-6 shrink-0 rounded-md text-gold/70 hover:bg-gold/10 hover:text-gold flex items-center justify-center"
            title={compactVertical ? 'Organizar sons na horizontal' : 'Organizar sons na vertical'}
            aria-label={compactVertical ? 'Organizar sons na horizontal' : 'Organizar sons na vertical'}
          >
            {compactVertical ? <Rows3 size={13} /> : <Columns3 size={13} />}
          </button>
        </div>

        <div className={cn('grid gap-1.5', compactVertical ? 'grid-cols-1' : 'grid-cols-2')}>
          {sounds.map((s) => (
            <div
              key={s.id}
              className={cn('relative', draggingId === s.id && 'opacity-50')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                reorderSound(s.id, e.dataTransfer.getData('text/plain') || draggingId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveSound(s.id, -1);
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveSound(s.id, 1);
                }
              }}
              tabIndex={0}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  trigger(s);
                }}
                title={`${s.nome} · arraste para reordenar`}
                aria-label={`${s.nome}. Arraste para reordenar ou use as setas do teclado.`}
                className={cn(
                  'w-full flex items-center justify-start gap-1 h-9 rounded-lg border text-[10px] font-medium truncate px-1 transition-all',
                  playingId === s.id
                    ? 'bg-gold text-background border-gold'
                    : 'bg-black/40 text-foreground border-gold/20 hover:border-gold/50'
                )}
              >
                {playingId === s.id ? (
                  <div className="flex gap-0.5 items-end h-2.5 shrink-0 mr-0.5">
                    <div className="w-0.5 bg-background animate-[music-bar_0.6s_ease-in-out_infinite] h-full" />
                    <div className="w-0.5 bg-background animate-[music-bar_0.8s_ease-in-out_infinite_0.1s] h-[60%]" />
                    <div className="w-0.5 bg-background animate-[music-bar_0.7s_ease-in-out_infinite_0.2s] h-[80%]" />
                  </div>
                ) : (
                  <Play size={10} className="shrink-0" />
                )}
                {(s.trimStartSeconds !== undefined || s.trimEndSeconds !== undefined) && (
                  <Scissors size={9} className="shrink-0 text-gold" />
                )}
                <span className="truncate">{s.nome}</span>
              </button>
              <div className="absolute -top-1 -right-1 flex flex-col gap-0.5 pointer-events-auto">
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', s.id);
                    setDraggingId(s.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={(e) => e.preventDefault()}
                  className="h-4 w-4 rounded-full flex items-center justify-center border border-background bg-secondary/90 text-muted-foreground hover:text-foreground shadow-sm cursor-grab active:cursor-grabbing"
                  title="Arraste para reordenar"
                  aria-label={`Arrastar ${s.nome} para reordenar`}
                >
                  <GripVertical size={8} />
                </button>
                <button
                  type="button"
                  onClick={() => openTrimEditor(s)}
                  disabled={quickSoundKind(s.url) !== 'file'}
                  className="h-4 w-4 rounded-full flex items-center justify-center border border-background bg-secondary text-muted-foreground hover:text-gold shadow-sm disabled:opacity-40"
                  title={quickSoundKind(s.url) === 'file' ? 'Escolher trecho do áudio' : 'Corte disponível apenas para arquivos de áudio'}
                  aria-label={`Cortar ${s.nome}`}
                >
                  <Scissors size={8} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLoop(s.id)}
                  title={s.loop ? 'Loop ativo' : 'Ativar loop infinito'}
                  className={cn(
                    'h-4 w-4 rounded-full flex items-center justify-center border border-background shadow-sm',
                    s.loop ? 'bg-gold text-background' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <Repeat size={8} />
                </button>
                <button
                  onClick={() => toggleFadeStop(s.id)}
                  title={s.fadeStop ? 'Fade-out ativo' : 'Ativar fade-out ao parar'}
                  className={cn(
                    'h-4 w-4 rounded-full flex items-center justify-center border border-background shadow-sm',
                    s.fadeStop ? 'bg-blue-500 text-white' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <Volume2 size={8} />
                </button>
              </div>
            </div>
          ))}
          {sounds.length < MAX_SLOTS && (
            <button
              onClick={() => setPickerOpen(true)}
              className="h-9 rounded-lg border border-dashed border-gold/30 text-gold/70 flex items-center justify-center hover:bg-gold/10"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
        {trimEditor}
        {picker}
      </div>
    );
  }

  return (
    <div
      data-quick-sounds
      onWheel={handleWheel}
      className={cn(
        'flex flex-col gap-3 bg-card/70 backdrop-blur-md border-gold/20 shadow-2xl shadow-black/40',
        fullHeight
          ? 'w-full h-full border-r px-4 py-5 overflow-y-auto scrollbar-thin'
          : 'w-[184px] border rounded-3xl px-4 py-5'
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <Zap size={16} className={cn("text-gold", playingId && "animate-pulse")} />
          {playingId && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-gold/70 font-bold text-center">
          Sons Rápidos
        </span>
      </div>

      <div className="w-full h-px bg-gold/20" />

      <div className={cn('flex flex-col gap-1.5', fullHeight && 'flex-1')}>
        {sounds.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center leading-tight py-2">
            Adicione atalhos para tocar efeitos curtos com um clique.
          </p>
        )}
        {sounds.map((s, i) => (
          <div
            key={s.id}
            className={cn('group relative', draggingId === s.id && 'opacity-50')}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              reorderSound(s.id, e.dataTransfer.getData('text/plain') || draggingId);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSound(s.id, -1);
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSound(s.id, 1);
              }
            }}
            tabIndex={0}
          >
            {editingId === s.id ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameSound(s.id, editingName.trim() || s.nome);
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-8 text-[11px] px-2"
                />
                <button
                  onClick={() => {
                    renameSound(s.id, editingName.trim() || s.nome);
                    setEditingId(null);
                  }}
                  className="h-8 w-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center"
                  title="Salvar nome"
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => trigger(s)}
                  title={`${s.nome} · arraste para reordenar`}
                  aria-label={`${s.nome}. Arraste para reordenar ou use as setas do teclado.`}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 rounded-xl border text-left transition-all',
                    fullHeight ? 'py-3' : 'py-2',
                    playingId === s.id
                      ? 'bg-gold text-background border-gold shadow-lg shadow-gold/20'
                      : 'bg-black/40 text-foreground border-gold/20 hover:border-gold/50 hover:bg-gold/5'
                  )}
                >
                  <span className="text-[9px] font-bold opacity-60 shrink-0">{i + 1}</span>
                  {playingId === s.id ? (
                    <div className="flex gap-0.5 items-end h-3 shrink-0">
                      <div className="w-0.5 bg-background animate-[music-bar_0.6s_ease-in-out_infinite] h-full" />
                      <div className="w-0.5 bg-background animate-[music-bar_0.8s_ease-in-out_infinite_0.1s] h-[60%]" />
                      <div className="w-0.5 bg-background animate-[music-bar_0.7s_ease-in-out_infinite_0.2s] h-[80%]" />
                    </div>
                  ) : (
                    <Play size={12} className="shrink-0" />
                  )}
                  <span className={cn('font-medium truncate flex-1', fullHeight ? 'text-xs' : 'text-[11px]')}>{s.nome}</span>
                  {s.loop && <Repeat size={10} className="shrink-0 opacity-80" />}
                  {(s.trimStartSeconds !== undefined || s.trimEndSeconds !== undefined) && (
                    <Scissors size={10} className="shrink-0 text-gold" />
                  )}
                </button>
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', s.id);
                      setDraggingId(s.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={(e) => e.preventDefault()}
                    className="h-4 w-4 rounded-full flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground shadow-sm cursor-grab active:cursor-grabbing"
                    title="Arraste para reordenar"
                    aria-label={`Arrastar ${s.nome} para reordenar`}
                  >
                    <GripVertical size={8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openTrimEditor(s)}
                    disabled={quickSoundKind(s.url) !== 'file'}
                    className="h-4 w-4 rounded-full flex items-center justify-center bg-secondary text-muted-foreground hover:text-gold shadow-sm disabled:opacity-40"
                    title={quickSoundKind(s.url) === 'file' ? 'Escolher trecho do áudio' : 'Corte disponível apenas para arquivos de áudio'}
                    aria-label={`Cortar ${s.nome}`}
                  >
                    <Scissors size={8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLoop(s.id)}
                    className={cn(
                      'h-4 w-4 rounded-full flex items-center justify-center',
                      s.loop ? 'bg-gold text-background' : 'bg-secondary text-muted-foreground'
                    )}
                    title={s.loop ? 'Loop ativo (tocar infinito)' : 'Ativar loop infinito'}
                  >
                    <Repeat size={8} />
                  </button>
                  <button
                    onClick={() => toggleFadeStop(s.id)}
                    className={cn(
                      'h-4 w-4 rounded-full flex items-center justify-center',
                      s.fadeStop ? 'bg-blue-500 text-white' : 'bg-secondary text-muted-foreground'
                    )}
                    title={s.fadeStop ? 'Fade-out ativo (parar suave)' : 'Ativar fade-out ao parar'}
                  >
                    <Volume2 size={8} />
                  </button>
                  <button
                    onClick={() => { setEditingId(s.id); setEditingName(s.nome); }}
                    className="h-4 w-4 rounded-full bg-gold text-background flex items-center justify-center"
                    title="Editar nome do botão"
                  >
                    <Pencil size={8} />
                  </button>
                  <button
                    onClick={() => removeSound(s.id)}
                    className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    title="Remover atalho"
                  >
                    <X size={9} />
                  </button>
                </div>

              </>
            )}
          </div>
        ))}
      </div>

      {sounds.length < MAX_SLOTS && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="h-8 border-gold/30 text-gold hover:bg-gold/10 text-[10px]"
        >
          <Plus size={12} className="mr-1" /> Atalho
        </Button>
      )}

      <div className="w-full h-px bg-gold/20" />

      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-gold/70 shrink-0" />
        <Slider
          value={[Math.round(volume * 100)]}
          max={100}
          step={1}
          onValueChange={([v]) => setVolume(v / 100)}
          className="flex-1"
        />
        <span className="text-[9px] text-gold/70 w-7 text-right">{Math.round(volume * 100)}%</span>
      </div>
      <VolumePresets volume={volume} onVolumeChange={setVolume} compact />


      {playingId && (
        <Button variant="outline" size="sm" onClick={() => stop()} className="h-7 text-[10px] border-gold/30">
          <Square size={10} className="mr-1" /> Parar som
        </Button>
      )}

      {trimEditor}
      {picker}
    </div>
  );
}
