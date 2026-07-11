import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Loader2, X, Play, Pause, Search, ListMusic, ChevronDown } from 'lucide-react';
import { formatDuration } from '@/types/audioLibrary';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { AudioDndZone, DraggableAudioRow, DragHandle } from '@/components/library/AudioDndZone';
import { MoveTargetMenu } from '@/components/library/MoveTargetMenu';
import { useAudioFolders } from '@/hooks/useAudioFolders';

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = (url || '').match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null && ((url || '').includes('youtube.com') || (url || '').includes('youtu.be'));
}

// Load the YouTube IFrame API once.
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve((window as any).YT);
      return;
    }
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') { try { prev(); } catch { /* noop */ } }
      resolve((window as any).YT);
    };
    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }
  });
  return ytApiPromise;
}

export default function YoutubeLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, addAudio } = useAudioLibrary();
  const { folders, moveAudioToFolder } = useAudioFolders();
  const { stages } = useStages();
  const { sections } = useSections();
  const { saveAudios } = useStageAudios();
  const { allAudios: allStageAudios } = useAllStageAudios();

  const usageMap = useMemo(() => {
    const map = new Map<string, Array<{ stageName: string; sectionName: string }>>();
    for (const sa of allStageAudios) {
      const stage = stages.find((s) => s.id === sa.etapa_id);
      if (!stage) continue;
      const section = sections.find((s) => s.id === stage.secao_id);
      const entry = { stageName: stage.nome_simbolico, sectionName: section?.nome || 'Sem seção' };
      const existing = map.get(sa.audio_url) || [];
      if (!existing.some((e) => e.stageName === entry.stageName && e.sectionName === entry.sectionName)) {
        existing.push(entry);
        map.set(sa.audio_url, existing);
      }
    }
    return map;
  }, [allStageAudios, stages, sections]);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'unused' | 'used'>('all');

  const playerRef = useRef<any>(null);
  const embedElRef = useRef<HTMLDivElement | null>(null);

  const allYtAudios = useMemo(
    () => audios.filter((a) => a.tipo === 'youtube' || isYouTubeUrl(a.audio_url)),
    [audios]
  );

  const ytAudios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allYtAudios.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q) && !a.audio_url.toLowerCase().includes(q)) return false;
      const used = usageMap.has(a.audio_url);
      if (usageFilter === 'unused' && used) return false;
      if (usageFilter === 'used' && !used) return false;
      return true;
    });
  }, [allYtAudios, search, usageFilter, usageMap]);


  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* noop */ }
      playerRef.current = null;
    }
  }, []);

  useEffect(() => () => destroyPlayer(), [destroyPlayer]);

  useEffect(() => {
    if (!playingId) {
      destroyPlayer();
      return;
    }
    const audio = ytAudios.find((a) => a.id === playingId);
    const videoId = audio ? getYouTubeVideoId(audio.audio_url) : null;
    if (!videoId) return;

    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !embedElRef.current) return;
      destroyPlayer();
      const el = document.createElement('div');
      embedElRef.current.innerHTML = '';
      embedElRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        width: '100%',
        height: '220',
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: any) => { try { e.target.playVideo(); } catch { /* noop */ } },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) setIsPaused(false);
            else if (e.data === YT.PlayerState.PAUSED) setIsPaused(true);
          },
        },
      });
    });

    return () => { cancelled = true; };
  }, [playingId, ytAudios, destroyPlayer]);

  const handlePlayPause = (id: string) => {
    if (playingId !== id) {
      setIsPaused(false);
      setPlayingId(id);
      return;
    }
    if (playerRef.current) {
      try {
        if (isPaused) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch { /* noop */ }
    }
  };

  const handleStop = () => {
    destroyPlayer();
    setPlayingId(null);
    setIsPaused(false);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    if (!isYouTubeUrl(newUrl)) {
      toast({ title: 'Link do YouTube inválido', description: 'Cole um link de vídeo do YouTube.', variant: 'destructive' });
      return;
    }
    try {
      await addAudio.mutateAsync({ nome: newName.trim(), audio_url: newUrl.trim(), tipo: 'youtube' });
      setNewName('');
      setNewUrl('');
      setShowAddForm(false);
    } catch { /* handled by hook */ }
  };

  const handleAddToStage = async (audioNome: string, audioUrl: string, etapaId: string) => {
    try {
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
          ...currentAudios.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
          { nome: audioNome, audio_url: audioUrl },
        ],
      });

      const stage = stages.find((s) => s.id === etapaId);
      toast({ title: `"${audioNome}" enviado para "${stage?.nome_simbolico || ''}"` });
    } catch {
      toast({ title: 'Erro ao enviar áudio para a etapa', variant: 'destructive' });
    }
  };

  const handleMoveToFolder = async (audio: { id: string; nome: string }, folderId: string | null) => {
    try {
      await moveAudioToFolder.mutateAsync({ audioId: audio.id, folderId });
      const folderName = folders.find((f) => f.id === folderId)?.nome;
      toast({ title: folderId ? `"${audio.nome}" movido para "${folderName}"` : `"${audio.nome}" removido da pasta` });
    } catch {
      toast({ title: 'Erro ao mover para a pasta', variant: 'destructive' });
    }
  };



  const stagesBySection = sections.map((sec) => ({
    section: sec,
    stages: stages.filter((s) => s.secao_id === sec.id),
  }));
  const unassignedStages = stages.filter((s) => !s.secao_id);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/biblioteca')}>
            <ArrowLeft size={20} />
          </Button>
          <YoutubeIcon size={24} />
          <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground flex-1 truncate">
            YouTube
          </h1>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-4 max-w-7xl mx-auto">
        {/* Add form */}
        <div className="border border-border rounded-lg p-3">
          {!showAddForm ? (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full border-dashed border-red-500/60 text-red-500 hover:bg-red-500/10"
            >
              <Plus size={16} className="mr-2" />
              Adicionar link do YouTube
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nome (ex: Música de entrada)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o link do YouTube"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newUrl.trim() || !newName.trim() || addAudio.isPending}
                  className="bg-red-500 hover:bg-red-500/90 text-white"
                >
                  {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewName(''); setNewUrl(''); }} className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Toggle list button */}
        <Button
          variant="outline"
          onClick={() => setShowList((v) => !v)}
          className="w-full justify-between border-red-500/40 text-foreground hover:bg-red-500/10"
        >
          <span className="flex items-center gap-2">
            <ListMusic size={16} className="text-red-500" />
            {showList ? 'Ocultar músicas' : 'Ver músicas'}
            <span className="text-muted-foreground text-xs">({allYtAudios.length})</span>
          </span>
          <ChevronDown size={16} className={cn('transition-transform', showList && 'rotate-180')} />
        </Button>

        {showList && (
          <>
            {/* Search + filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {([
                  { key: 'all', label: 'Todas' },
                  { key: 'unused', label: 'Não usadas' },
                  { key: 'used', label: 'Em uso' },
                ] as const).map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={usageFilter === f.key ? 'default' : 'outline'}
                    onClick={() => setUsageFilter(f.key)}
                    className={cn(
                      'flex-1',
                      usageFilter === f.key && 'bg-red-500 hover:bg-red-500/90 text-white'
                    )}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-red-500" size={28} />
              </div>
            ) : ytAudios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <YoutubeIcon size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">Nenhuma música encontrada</p>
                <p className="text-sm mt-1">Ajuste a busca ou o filtro</p>
              </div>
            ) : (
          <AudioDndZone
            accent="red"
            onSendToStage={(a, sid) => handleAddToStage(a.nome, a.audio_url, sid)}
            onMoveToFolder={(a, fid) => handleMoveToFolder(a, fid)}
          >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 pb-24">
            {ytAudios.map((audio, idx) => {
              const isCurrent = playingId === audio.id;
              const isPlaying = isCurrent && !isPaused;
              const usage = usageMap.get(audio.audio_url) || [];
              const isUsed = usage.length > 0;
              const subtitle = isUsed
                ? usage.map((u) => u.stageName).join(', ')
                : 'Não usada';
              const isNew = Date.now() - new Date(audio.created_at).getTime() < 3 * 24 * 60 * 60 * 1000;
              return (
                <DraggableAudioRow key={audio.id} audio={audio}>
                  {({ handleProps }) => (
                <div
                  className={cn(
                    'group rounded-md transition-colors',
                    isCurrent ? 'bg-red-500/10' : 'hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-center gap-3 px-2 py-1.5">
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground group-hover:hidden max-md:hidden">
                      {isCurrent ? <span className="text-red-500">♪</span> : idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayPause(audio.id)}
                      className="hidden w-5 shrink-0 items-center justify-center text-foreground group-hover:flex max-md:flex"
                      title={isPlaying ? 'Pausar' : 'Tocar'}
                    >
                      {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                    </button>
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-red-500/10 flex items-center justify-center">
                      <YoutubeIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn('font-medium text-sm truncate', isCurrent && 'text-red-500')}>{audio.nome}</p>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
                            Nova
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100 transition-opacity">
                      <DragHandle handleProps={handleProps} />
                      {isCurrent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleStop}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Parar"
                        >
                          <X size={16} />
                        </Button>
                      )}
                      <MoveTargetMenu
                        accentClass="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                        onSendToStage={(sid) => handleAddToStage(audio.nome, audio.audio_url, sid)}
                        onMoveToFolder={(fid) => handleMoveToFolder(audio, fid)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { if (isCurrent) handleStop(); deleteAudio.mutate(audio.id); }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="px-2 pb-2">
                      <div ref={embedElRef} className="rounded-xl overflow-hidden" />
                    </div>
                  )}
                </div>
                  )}
                </DraggableAudioRow>
              );
            })}
          </div>


          </AudioDndZone>
            )}
          </>
        )}
      </main>
    </div>
  );
}
