import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { formatDuration } from '@/types/audioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Music, Trash2, Play, Pause, Upload, Plus, Library, ExternalLink,
  Loader2, Download, CheckSquare, Square, X, ArrowLeft, FolderOpen,
  Folder, FolderPlus, Edit2, ChevronRight, MoveRight, ListPlus,
  SkipBack, SkipForward, Filter, Palette, Waves,
  Headphones, Radio, Mic, Star, Heart, Flame, Bookmark, Bell,
  Church, Crown, Sparkles, Sun, Moon, Award, Flag, Compass
} from 'lucide-react';
import { HEALING_FREQUENCIES, getTrackHz, setTrackHz, subscribeTrackHz, getEffectiveHz, subscribeHealingHz } from '@/lib/pitch432';
import { AudioSourceIcon } from '@/components/AudioSourceIcon';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';


import { cn } from '@/lib/utils';
// JSZip e file-saver são pesados (~90 KB) e só rodam no "baixar tudo".
// Carregados dinamicamente dentro de handleDownloadAll.
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AudioDndZone, DraggableAudioRow, DragHandle } from '@/components/library/AudioDndZone';



const FOLDER_COLORS = [
  '#D4AF37', '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#6366F1', '#A855F7', '#EC4899',
  '#8B5CF6', '#0EA5E9', '#84CC16', '#F59E0B', '#64748B',
];

const FOLDER_ICONS: Record<string, React.ComponentType<any>> = {
  Folder, Music, Headphones, Radio, Mic, Star, Heart, Flame,
  Bookmark, Bell, Church, Crown, Sparkles, Sun, Moon, Award, Flag, Compass,
};

function FolderIcon({ name, size = 20, className = '' }: { name?: string | null; size?: number; className?: string }) {
  const Cmp = (name && FOLDER_ICONS[name]) || Folder;
  return <Cmp size={size} className={className} />;
}

function TrackHzSelector({ url }: { url: string }) {
  const [override, setOverride] = useState<number | null>(() => getTrackHz(url));
  const [, force] = useState(0);
  useEffect(() => subscribeTrackHz(() => {
    setOverride(getTrackHz(url));
    force((n) => n + 1);
  }), [url]);
  // Escuta mudanças da Hz global também
  useEffect(() => subscribeHealingHz(() => force((n) => n + 1)), []);
  const effectiveHz = getEffectiveHz(url);
  const info = HEALING_FREQUENCIES.find((f) => f.hz === effectiveHz);
  const active = effectiveHz !== 440;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'h-8 px-2 gap-1 text-[10px] font-mono tabular-nums',
            active ? 'text-gold hover:text-gold' : 'text-muted-foreground hover:text-gold',
            override != null && 'ring-1 ring-gold/40 rounded-md',
          )}
          title={info ? `${info.label} — ${info.desc}${override != null ? ' (faixa)' : ' (global)'}` : `${effectiveHz}Hz`}
        >
          <Waves size={12} />
          <span>{effectiveHz}Hz</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
          Frequência desta faixa
        </div>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); setTrackHz(url, null); }}
          className={cn(override == null && 'bg-gold/10 text-gold')}
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium">Padrão global</span>
            <span className="text-[10px] text-muted-foreground">Usa a Hz das Configurações</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {HEALING_FREQUENCIES.map((f) => (
          <DropdownMenuItem
            key={f.hz}
            onClick={(e) => { e.stopPropagation(); setTrackHz(url, f.hz); }}
            className={cn(override === f.hz && 'bg-gold/10 text-gold')}
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium">{f.label}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-2">{f.desc}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



export default function AudioLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, uploadAndAddAudio, addAudio, setDuration } = useAudioLibrary();
  const { folders, addFolder, renameFolder, updateFolder, deleteFolder, moveAudioToFolder } = useAudioFolders();

  const { stages } = useStages();
  const { sections } = useSections();
  const { saveAudios } = useStageAudios();
  const { allAudios: allStageAudios } = useAllStageAudios();

  // Build a map: audio_url -> list of { stageName, sectionName }
  const audioUsageMap = useMemo(() => {
    const map = new Map<string, Array<{ stageName: string; sectionName: string }>>();
    for (const sa of allStageAudios) {
      const stage = stages.find(s => s.id === sa.etapa_id);
      if (!stage) continue;
      const section = sections.find(s => s.id === stage.secao_id);
      const entry = { stageName: stage.nome_simbolico, sectionName: section?.nome || 'Sem seção' };
      const existing = map.get(sa.audio_url) || [];
      // Avoid duplicates
      if (!existing.some(e => e.stageName === entry.stageName && e.sectionName === entry.sectionName)) {
        existing.push(entry);
        map.set(sa.audio_url, existing);
      }
    }
    return map;
  }, [allStageAudios, stages, sections]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  // Ao sair da página, pausa a prévia para não seguir tocando em segundo plano
  useEffect(() => () => { audioElement?.pause(); }, [audioElement]);
  const ytPlayerRef = useRef<any>(null);
  const ytInitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [newAudioName, setNewAudioName] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const currentFolder = folders.find(f => f.id === currentFolderId) || null;

  const isYouTubeUrl = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be');

  // Descobre a duração de faixas que ainda não têm (apenas arquivos/URLs diretas).
  useEffect(() => {
    const pending = audios.filter(
      (a) => a.duracao_segundos == null && !isYouTubeUrl(a.audio_url),
    );
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const a of pending.slice(0, 8)) {
        if (cancelled) return;
        try {
          const { probeAudioDuration } = await import('@/lib/audioDuration');
          const secs = await probeAudioDuration(a.audio_url);
          if (!cancelled) setDuration.mutate({ id: a.id, seconds: secs });
        } catch {
          /* ignora faixas que não conseguimos medir */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audios]);


  // Filter audios by current folder and usage filter (YouTube tem aba própria)
  const filteredAudios = audios.filter(a => {
    const isYt = a.tipo === 'youtube' || isYouTubeUrl(a.audio_url);
    const audioPastaId = (a as any).pasta_id;
    // Fora de pastas (raiz): esconde YouTube — tem aba própria.
    if (!currentFolderId && isYt) return false;
    const folderMatch = currentFolderId ? audioPastaId === currentFolderId : !audioPastaId;
    if (!folderMatch) return false;
    if (showUnusedOnly && audioUsageMap.has(a.audio_url)) return false;
    return true;
  });



  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };


  const [isPaused, setIsPaused] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const timeUpdateRef = useRef<number | null>(null);

  // Poll time for YouTube player
  const startYtTimePolling = () => {
    stopYtTimePolling();
    timeUpdateRef.current = window.setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime && ytPlayerRef.current?.getDuration) {
        try {
          setAudioCurrentTime(ytPlayerRef.current.getCurrentTime());
          setAudioDuration(ytPlayerRef.current.getDuration());
        } catch {}
      }
    }, 500);
  };
  const stopYtTimePolling = () => {
    if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current);
      timeUpdateRef.current = null;
    }
  };

  const handleSeek = (seconds: number) => {
    if (playingId) {
      const currentAudio = audios.find(a => a.id === playingId);
      if (currentAudio && isYouTubeUrl(currentAudio.audio_url) && ytPlayerRef.current) {
        try {
          const current = ytPlayerRef.current.getCurrentTime() || 0;
          ytPlayerRef.current.seekTo(current + seconds, true);
        } catch {}
      } else if (audioElement) {
        audioElement.currentTime = Math.max(0, Math.min(audioElement.duration || 0, audioElement.currentTime + seconds));
      }
    }
  };

  const handleSeekTo = (time: number) => {
    if (playingId) {
      const currentAudio = audios.find(a => a.id === playingId);
      if (currentAudio && isYouTubeUrl(currentAudio.audio_url) && ytPlayerRef.current) {
        try { ytPlayerRef.current.seekTo(time, true); } catch {}
      } else if (audioElement) {
        audioElement.currentTime = Math.max(0, Math.min(audioElement.duration || 0, time));
      }
    }
  };

  const stopCurrentPlayback = (destroy = true) => {
    audioElement?.pause();
    setAudioElement(null);
    stopYtTimePolling();
    if (ytInitTimeoutRef.current) {
      clearTimeout(ytInitTimeoutRef.current);
      ytInitTimeoutRef.current = null;
    }
    if (ytPlayerRef.current) {
      try {
        if (destroy) {
          ytPlayerRef.current.stopVideo();
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
          const container = document.getElementById('yt-library-player-container');
          if (container) container.remove();
        }
      } catch {}
    }
    setPlayingId(null);
    setIsPaused(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

  const handlePauseResume = (audio: { id: string; audio_url: string }) => {
    if (playingId === audio.id && !isPaused) {
      // Pause
      if (isYouTubeUrl(audio.audio_url) && ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      } else if (audioElement) {
        audioElement.pause();
      }
      setIsPaused(true);
      return;
    }
    if (playingId === audio.id && isPaused) {
      // Resume
      if (isYouTubeUrl(audio.audio_url) && ytPlayerRef.current) {
        try { ytPlayerRef.current.playVideo(); } catch {}
      } else if (audioElement) {
        audioElement.play();
      }
      setIsPaused(false);
      return;
    }
    // Play new
    handlePlay(audio);
  };

  const handlePlay = (audio: { id: string; audio_url: string }) => {
    stopCurrentPlayback();







    if (isYouTubeUrl(audio.audio_url)) {
      const videoId = getYouTubeVideoId(audio.audio_url);
      if (!videoId) { toast({ title: 'URL do YouTube inválida', variant: 'destructive' }); return; }

      // Create hidden YouTube player
      let container = document.getElementById('yt-library-player-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-library-player-container';
        container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
        document.body.appendChild(container);
      }
      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-library-player';
      container.innerHTML = '';
      container.appendChild(playerDiv);

      const initPlayer = () => {
        if (!(window as any).YT || !(window as any).YT.Player) {
          ytInitTimeoutRef.current = setTimeout(initPlayer, 100);
          return;
        }
        ytPlayerRef.current = new (window as any).YT.Player('yt-library-player', {
          height: '1',
          width: '1',
          videoId,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(70);
              event.target.playVideo();
              setPlayingId(audio.id);
              startYtTimePolling();
            },
            onStateChange: (event: any) => {
              const YT = (window as any).YT;
              if (event.data === YT.PlayerState.ENDED) {
                setPlayingId(null);
              }
            },
            onError: () => {
              toast({ title: 'Erro ao reproduzir vídeo do YouTube', variant: 'destructive' });
              setPlayingId(null);
            },
          },
        });
      };

      // Load YT API if needed
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.getElementsByTagName('script')[0]?.parentNode?.insertBefore(tag, document.getElementsByTagName('script')[0]);
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      } else {
        initPlayer();
      }
    } else {
      const newAudio = new Audio(audio.audio_url);
      newAudio.ontimeupdate = () => { setAudioCurrentTime(newAudio.currentTime); };
      newAudio.onloadedmetadata = () => { setAudioDuration(newAudio.duration); };
      newAudio.onerror = () => {
        toast({ title: 'Não foi possível reproduzir este áudio', variant: 'destructive' });
        setPlayingId(null); setAudioElement(null); setAudioCurrentTime(0); setAudioDuration(0);
      };
      newAudio.play().catch(() => {
        toast({ title: 'Não foi possível reproduzir este áudio', variant: 'destructive' });
        setPlayingId(null); setAudioElement(null);
      });
      newAudio.onended = () => { setPlayingId(null); setAudioElement(null); setAudioCurrentTime(0); setAudioDuration(0); };
      setAudioElement(newAudio);
      setPlayingId(audio.id);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(f.name));
    if (audioFiles.length === 0) { toast({ title: 'Nenhum arquivo de áudio encontrado na seleção', variant: 'destructive' }); return; }
    setIsUploading(true);
    let successCount = 0;
    try {
      for (const file of audioFiles) {
        const name = audioFiles.length === 1 && newAudioName
          ? newAudioName
          : file.name.replace(/\.[^/.]+$/, '');
        try {
          const result = await uploadAndAddAudio(file, name);
          // Move to current folder if inside one
          if (currentFolderId && result?.id) {
            await moveAudioToFolder.mutateAsync({ audioId: result.id, folderId: currentFolderId });
          }
          successCount++;
        } catch { /* handled by hook */ }
      }
      if (successCount > 0) toast({ title: `${successCount} áudio(s) adicionado(s) à biblioteca` });
      setNewAudioName('');
      setShowAddForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newAudioUrl.trim() || !newAudioName.trim()) return;
    try {
      const result = await addAudio.mutateAsync({
        nome: newAudioName.trim(),
        audio_url: newAudioUrl.trim(),
        tipo: isYouTubeUrl(newAudioUrl) ? 'youtube' : 'external',
      });
      if (currentFolderId && result?.id) {
        await moveAudioToFolder.mutateAsync({ audioId: result.id, folderId: currentFolderId });
      }
      setNewAudioName('');
      setNewAudioUrl('');
      setShowAddForm(false);
    } catch { /* handled by hook */ }
  };

  const handleDownloadAll = async () => {
    const downloadableAudios = filteredAudios.filter(
      (a) => a.tipo !== 'youtube' && !isYouTubeUrl(a.audio_url)
    );
    if (downloadableAudios.length === 0) {
      toast({ title: 'Nenhum áudio disponível para download', variant: 'destructive' });
      return;
    }
    setIsDownloadingAll(true);
    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver'),
      ]);
      const zip = new JSZip();
      let count = 0;
      for (const audio of downloadableAudios) {
        try {
          const response = await fetch(audio.audio_url);
          if (!response.ok) continue;
          const blob = await response.blob();
          const ext = audio.audio_url.match(/\.(\w+)$/)?.[1] || 'mp3';
          const safeName = audio.nome.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').trim();
          zip.file(`${safeName}.${ext}`, blob);
          count++;
        } catch { /* skip */ }
      }
      if (count === 0) { toast({ title: 'Não foi possível baixar os áudios', variant: 'destructive' }); return; }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `biblioteca-audios${currentFolder ? `-${currentFolder.nome}` : ''}.zip`);
      toast({ title: `${count} áudio(s) baixado(s) com sucesso` });
    } catch {
      toast({ title: 'Erro ao gerar arquivo ZIP', variant: 'destructive' });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredAudios.length ? new Set() : new Set(filteredAudios.map((a) => a.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    let count = 0;
    for (const id of selectedIds) {
      try { await deleteAudio.mutateAsync(id); count++; } catch { /* */ }
    }
    toast({ title: `${count} áudio(s) removido(s)` });
    setSelectedIds(new Set());
    setBulkDeleteMode(false);
    setIsDeletingBulk(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await addFolder.mutateAsync(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleRenameFolder = async (id: string) => {
    if (!editingFolderName.trim()) return;
    await renameFolder.mutateAsync({ id, nome: editingFolderName.trim() });
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleAddToStage = async (audioNome: string, audioUrl: string, etapaId: string) => {
    try {
      // Fetch existing audios for this stage
      const { data: existingAudios } = await supabase
        .from('sonoplastia_etapa_audios')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('ordem', { ascending: true });

      const currentAudios = existingAudios || [];
      if (currentAudios.length >= 5) {
        toast({ title: 'Esta etapa já possui 5 áudios (máximo)', variant: 'destructive' });
        return;
      }

      await saveAudios.mutateAsync({
        etapa_id: etapaId,
        audios: [
          ...currentAudios.map(a => ({ nome: a.nome, audio_url: a.audio_url })),
          { nome: audioNome, audio_url: audioUrl },
        ],
      });

      const stage = stages.find(s => s.id === etapaId);
      toast({ title: `"${audioNome}" adicionado à etapa "${stage?.nome_simbolico || ''}"` });
    } catch {
      toast({ title: 'Erro ao adicionar áudio à etapa', variant: 'destructive' });
    }
  };

  const handleMoveToFolderDnd = async (audio: { id: string; nome: string }, folderId: string | null) => {
    try {
      await moveAudioToFolder.mutateAsync({ audioId: audio.id, folderId });
      const folderName = folders.find((f) => f.id === folderId)?.nome;
      toast({ title: folderId ? `"${audio.nome}" movido para "${folderName}"` : `"${audio.nome}" removido da pasta` });
    } catch {
      toast({ title: 'Erro ao mover para a pasta', variant: 'destructive' });
    }
  };


  // Group stages by section for the dropdown
  const stagesBySection = sections.map(sec => ({
    section: sec,
    stages: stages.filter(s => s.secao_id === sec.id),
  }));
  const unassignedStages = stages.filter(s => !s.secao_id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (currentFolderId) { setCurrentFolderId(null); setBulkDeleteMode(false); setSelectedIds(new Set()); }
            else navigate('/');
          }}>
            <ArrowLeft size={20} />
          </Button>
          <Library className="text-gold" size={22} />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <h1
              className={cn("font-display text-lg sm:text-xl font-semibold text-foreground truncate", currentFolderId && "cursor-pointer hover:text-gold transition-colors")}
              onClick={currentFolderId ? () => { setCurrentFolderId(null); setBulkDeleteMode(false); setSelectedIds(new Set()); } : undefined}
            >
              Biblioteca
            </h1>
            {currentFolder && (
              <>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                <span className="font-display text-lg sm:text-xl font-semibold text-gold truncate">{currentFolder.nome}</span>
              </>
            )}
          </div>

          {!currentFolderId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/youtube')}
                className="border-red-500/60 text-red-500 hover:bg-red-500/10 shrink-0"
              >
                <YoutubeIcon size={14} className="mr-1" />
                <span className="hidden sm:inline">YouTube</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/spotify')}
                className="border-[#1DB954]/60 text-[#1DB954] hover:bg-[#1DB954]/10 shrink-0"
              >
                <SpotifyIcon size={14} className="mr-1 text-[#1DB954]" />
                <span className="hidden sm:inline">Spotify</span>
              </Button>
            </>
          )}






          {filteredAudios.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2">
              {bulkDeleteMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === filteredAudios.length ? <CheckSquare size={14} className="mr-1" /> : <Square size={14} className="mr-1" />}
                    <span className="hidden sm:inline">{selectedIds.size === filteredAudios.length ? 'Desmarcar' : 'Todos'}</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.size === 0 || isDeletingBulk}>
                    {isDeletingBulk ? <Loader2 className="animate-spin mr-1" size={14} /> : <Trash2 size={14} className="mr-1" />}
                    Excluir ({selectedIds.size})
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setBulkDeleteMode(false); setSelectedIds(new Set()); }}>
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={showUnusedOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowUnusedOnly(!showUnusedOnly)}
                    className={showUnusedOnly ? 'bg-gold hover:bg-gold/90 text-background' : ''}
                    title={showUnusedOnly ? 'Mostrando apenas não utilizados' : 'Filtrar não utilizados'}
                  >
                    <Filter size={14} className="mr-1" />
                    <span className="hidden sm:inline">{showUnusedOnly ? 'Não usados' : 'Filtrar'}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBulkDeleteMode(true)}>
                    <CheckSquare size={14} className="mr-1" />
                    <span className="hidden sm:inline">Selecionar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
                    {isDownloadingAll ? <Loader2 className="animate-spin mr-1" size={14} /> : <Download size={14} className="mr-1" />}
                    <span className="hidden sm:inline">{isDownloadingAll ? 'Baixando...' : 'Baixar'}</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container py-4 sm:py-6 space-y-4 max-w-3xl mx-auto">
        {/* Folders Section (only at root level) */}
        {!currentFolderId && (
          <div className="space-y-2">
            {/* Folder list */}
            {folders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {folders.map((folder) => {
                  const color = folder.cor || 'hsl(var(--gold))';
                  return (
                  <div
                    key={folder.id}
                    className="relative flex items-center gap-2 p-3 rounded-lg border cursor-pointer group transition-all overflow-hidden"
                    style={{
                      borderColor: `${color}55`,
                      background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
                    }}
                    onClick={() => {
                      if (editingFolderId !== folder.id) {
                        setCurrentFolderId(folder.id);
                        setBulkDeleteMode(false);
                        setSelectedIds(new Set());
                      }
                    }}
                  >
                    <div
                      className="shrink-0 flex items-center justify-center rounded-md h-8 w-8"
                      style={{ background: `${color}33`, color }}
                    >
                      <FolderIcon name={folder.icone} size={18} />
                    </div>
                    {editingFolderId === folder.id ? (
                      <Input
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-sm flex-1"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-sm font-medium truncate flex-1" style={{ color }}>{folder.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {audios.filter(a => (a as any).pasta_id === folder.id).length}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.nome); }}>
                              <Edit2 size={14} className="mr-2" /> Renomear
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                              <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Palette size={12}/> Cor</div>
                              <div className="grid grid-cols-5 gap-1.5 mb-2">
                                {FOLDER_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => updateFolder.mutate({ id: folder.id, cor: c })}
                                    className={cn("h-6 w-6 rounded-md border-2 transition-transform hover:scale-110", folder.cor === c ? "border-foreground" : "border-transparent")}
                                    style={{ background: c }}
                                    aria-label={`Cor ${c}`}
                                  />
                                ))}
                              </div>
                              <div className="text-xs text-muted-foreground mb-1.5">Ícone</div>
                              <div className="grid grid-cols-6 gap-1">
                                {Object.keys(FOLDER_ICONS).map((iconName) => {
                                  const Cmp = FOLDER_ICONS[iconName];
                                  const active = (folder.icone || 'Folder') === iconName;
                                  return (
                                    <button
                                      key={iconName}
                                      onClick={() => updateFolder.mutate({ id: folder.id, icone: iconName })}
                                      className={cn("h-7 w-7 rounded-md flex items-center justify-center border transition-colors", active ? "border-foreground bg-accent" : "border-transparent hover:bg-accent")}
                                      aria-label={iconName}
                                    >
                                      <Cmp size={14} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteFolder.mutate(folder.id); }}>
                              <Trash2 size={14} className="mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                  );
                })}

              </div>
            )}

            {/* New folder button/input */}
            {showNewFolderInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da pasta"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolderInput(false); }}
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || addFolder.isPending} className="bg-gold hover:bg-gold/90 text-background">
                  {addFolder.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Criar'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}>
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolderInput(true)}
                className="border-dashed border-gold/50 text-gold hover:bg-gold/10"
              >
                <FolderPlus size={14} className="mr-1" /> Nova pasta
              </Button>
            )}
          </div>
        )}

        {/* Add Audio Section */}
        <div className="border border-border rounded-lg p-3">
          {!showAddForm ? (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full border-dashed border-gold/50 text-gold hover:bg-gold/10"
            >
              <Plus size={16} className="mr-2" />
              Adicionar áudio{currentFolder ? ` em "${currentFolder.nome}"` : ' à biblioteca'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={addMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddMode('upload')}
                  className={addMode === 'upload' ? 'bg-gold hover:bg-gold/90 text-background' : ''}
                >
                  <Upload size={14} className="mr-1" /> Upload
                </Button>
                <Button
                  variant={addMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddMode('url')}
                  className={addMode === 'url' ? 'bg-gold hover:bg-gold/90 text-background' : ''}
                >
                  <ExternalLink size={14} className="mr-1" /> URL
                </Button>
              </div>
              <Input
                placeholder="Nome do áudio (opcional para múltiplos)"
                value={newAudioName}
                onChange={(e) => setNewAudioName(e.target.value)}
              />
              {addMode === 'upload' ? (
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileSelect} className="hidden" />
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    {...{ webkitdirectory: '', directory: '' } as any}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1">
                    {isUploading ? (<><Loader2 className="animate-spin mr-2" size={16} />Enviando...</>) : (<><Upload size={16} className="mr-2" />Arquivo(s)</>)}
                  </Button>
                  <Button variant="outline" onClick={() => folderInputRef.current?.click()} disabled={isUploading} className="flex-1">
                    <FolderOpen size={16} className="mr-2" />Pasta
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="URL do áudio (mp3, wav...)" value={newAudioUrl} onChange={(e) => setNewAudioUrl(e.target.value)} className="flex-1" />
                  <Button onClick={handleAddUrl} disabled={!newAudioUrl.trim() || !newAudioName.trim() || addAudio.isPending} className="bg-gold hover:bg-gold/90 text-background">
                    {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewAudioName(''); setNewAudioUrl(''); }} className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Audio List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gold" size={28} />
          </div>
        ) : filteredAudios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">{currentFolder ? 'Nenhum áudio nesta pasta' : 'Nenhum áudio na biblioteca'}</p>
            <p className="text-sm mt-1">Adicione áudios para reutilizá-los em várias etapas</p>
          </div>
        ) : (
          <AudioDndZone
            accent="green"
            onSendToStage={(a, sid) => handleAddToStage(a.nome, a.audio_url, sid)}
            onMoveToFolder={(a, fid) => handleMoveToFolderDnd(a, fid)}
          >
            <VirtualAudioList
              audios={filteredAudios}
              bulkDeleteMode={bulkDeleteMode}
              selectedIds={selectedIds}
              toggleSelectId={toggleSelectId}
              playingId={playingId}
              isPaused={isPaused}
              audioCurrentTime={audioCurrentTime}
              audioDuration={audioDuration}
              handlePauseResume={handlePauseResume}
              handleSeek={handleSeek}
              handleSeekTo={handleSeekTo}
              stopCurrentPlayback={stopCurrentPlayback}
              deleteAudio={deleteAudio}
              stages={stages}
              folders={folders}
              currentFolderId={currentFolderId}
              moveAudioToFolder={moveAudioToFolder}
              handleAddToStage={handleAddToStage}
              stagesBySection={stagesBySection}
              unassignedStages={unassignedStages}
              isYouTubeUrl={isYouTubeUrl}
              formatFileSize={formatFileSize}
              audioUsageMap={audioUsageMap}
            />
          </AudioDndZone>
        )}
      </main>

    </div>
  );
}

interface VirtualAudioListProps {
  audios: any[];
  bulkDeleteMode: boolean;
  selectedIds: Set<string>;
  toggleSelectId: (id: string) => void;
  playingId: string | null;
  isPaused: boolean;
  audioCurrentTime: number;
  audioDuration: number;
  handlePauseResume: (audio: { id: string; audio_url: string }) => void;
  handleSeek: (seconds: number) => void;
  handleSeekTo: (time: number) => void;
  stopCurrentPlayback: (destroy?: boolean) => void;
  deleteAudio: any;
  stages: any[];
  folders: any[];
  currentFolderId: string | null;
  moveAudioToFolder: any;
  handleAddToStage: (audioNome: string, audioUrl: string, etapaId: string) => void;
  stagesBySection: Array<{ section: any; stages: any[] }>;
  unassignedStages: any[];
  isYouTubeUrl: (url: string) => boolean;
  formatFileSize: (bytes: number | null) => string;
  audioUsageMap: Map<string, Array<{ stageName: string; sectionName: string }>>;
}

function VirtualAudioList(props: VirtualAudioListProps) {
  const {
    audios, bulkDeleteMode, selectedIds, toggleSelectId,
    playingId, isPaused, audioCurrentTime, audioDuration,
    handlePauseResume, handleSeek, handleSeekTo, stopCurrentPlayback,
    deleteAudio, stages, folders, currentFolderId, moveAudioToFolder,
    handleAddToStage, stagesBySection, unassignedStages,
    isYouTubeUrl, formatFileSize, audioUsageMap,
  } = props;

  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.getBoundingClientRect().top + window.scrollY);
    }
  }, [audios.length]);

  const virtualizer = useWindowVirtualizer({
    count: audios.length,
    estimateSize: () => 84,
    overscan: 6,
    scrollMargin,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="relative">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((virtualRow) => {
          const audio = audios[virtualRow.index];
          return (
            <div
              key={audio.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                paddingBottom: 8,
              }}
            >
              <DraggableAudioRow audio={{ id: audio.id, nome: audio.nome, audio_url: audio.audio_url }}>
                {({ handleProps }) => (
              <div
                className={cn(
                  'flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors',
                  bulkDeleteMode && 'cursor-pointer',
                  bulkDeleteMode && selectedIds.has(audio.id) && 'border-destructive/50 bg-destructive/5'
                )}
                onClick={bulkDeleteMode ? () => toggleSelectId(audio.id) : undefined}
              >
                {!bulkDeleteMode && <DragHandle handleProps={handleProps} className="-ml-1" />}
                {bulkDeleteMode && (
                  <Checkbox
                    checked={selectedIds.has(audio.id)}
                    onCheckedChange={() => toggleSelectId(audio.id)}
                    onClick={(e) => e.stopPropagation()}

                  />
                )}
                <div className="p-2 bg-gold/10 rounded-lg shrink-0">
                  <AudioSourceIcon url={audio.audio_url} tipo={audio.tipo} size={18} active />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{audio.nome}</p>
                    {formatDuration(audio.duracao_segundos) && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatDuration(audio.duracao_segundos)}
                      </span>
                    )}
                  </div>
                  {isYouTubeUrl(audio.audio_url) ? (
                    <a
                      href={audio.audio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-red-400 hover:text-red-300 truncate block max-w-[260px] sm:max-w-[400px] underline underline-offset-2"
                      title={audio.audio_url}
                    >
                      {audio.audio_url}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFileSize(audio.tamanho_bytes) || 'Link externo'}
                    </p>
                  )}
                  {(() => {
                    const usages = audioUsageMap.get(audio.audio_url) || [];
                    if (usages.length === 0) return null;
                    const shown = usages.slice(0, 3);
                    const extra = usages.length - shown.length;
                    return (
                      <div className="mt-1 flex flex-wrap gap-1" title={usages.map(u => `${u.sectionName} › ${u.stageName}`).join('\n')}>
                        {shown.map((u, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                            <FolderOpen size={10} />
                            <span className="truncate max-w-[140px]">{u.sectionName} › {u.stageName}</span>
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                            +{extra}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {!bulkDeleteMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    {playingId === audio.id && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSeek(-10); }} className="h-8 w-8 text-muted-foreground hover:text-gold" title="Retroceder 10s">
                        <SkipBack size={14} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handlePauseResume(audio); }} className="h-8 w-8 sm:h-9 sm:w-9">
                      {playingId === audio.id && !isPaused ? <Pause size={16} className="text-gold" /> : <Play size={16} className="text-gold" />}
                    </Button>
                    {playingId === audio.id && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSeek(10); }} className="h-8 w-8 text-muted-foreground hover:text-gold" title="Avançar 10s">
                        <SkipForward size={14} />
                      </Button>
                    )}
                    {playingId === audio.id && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); stopCurrentPlayback(); }} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive">
                        <X size={16} />
                      </Button>
                    )}
                    <TrackHzSelector url={audio.audio_url} />
                    {stages.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-gold" title="Adicionar à etapa">
                            <Plus size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                          {stagesBySection.map(({ section, stages: sectionStages }) => (
                            sectionStages.length > 0 && (
                              <div key={section.id}>
                                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{section.nome}</p>
                                {sectionStages.map(stage => (
                                  <DropdownMenuItem key={stage.id} onClick={() => handleAddToStage(audio.nome, audio.audio_url, stage.id)}>
                                    <Plus size={14} className="mr-2" /> {stage.nome_simbolico}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </div>
                            )
                          ))}
                          {unassignedStages.length > 0 && (
                            <>
                              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sem seção</p>
                              {unassignedStages.map(stage => (
                                <DropdownMenuItem key={stage.id} onClick={() => handleAddToStage(audio.nome, audio.audio_url, stage.id)}>
                                  <Plus size={14} className="mr-2" /> {stage.nome_simbolico}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {folders.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-gold">
                            <MoveRight size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {currentFolderId && (
                            <DropdownMenuItem onClick={() => moveAudioToFolder.mutateAsync({ audioId: audio.id, folderId: null })}>
                              <ArrowLeft size={14} className="mr-2" /> Raiz da biblioteca
                            </DropdownMenuItem>
                          )}
                          {folders.filter(f => f.id !== currentFolderId).map(f => (
                            <DropdownMenuItem key={f.id} onClick={() => moveAudioToFolder.mutateAsync({ audioId: audio.id, folderId: f.id })}>
                              <Folder size={14} className="mr-2" /> {f.nome}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteAudio.mutate(audio.id); }} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
                {playingId === audio.id && audioDuration > 0 && (
                  <div className="w-full flex items-center gap-2 mt-2 px-1">
                    <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
                      {formatLibTime(audioCurrentTime)}
                    </span>
                    <div
                      className="flex-1 h-1.5 bg-secondary rounded-full cursor-pointer relative group"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        handleSeekTo(ratio * audioDuration);
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
                      {formatLibTime(audioDuration)}
                    </span>
                  </div>
                )}
              </div>
                )}
              </DraggableAudioRow>
            </div>

          );
        })}
      </div>
    </div>
  );
}


function formatLibTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
