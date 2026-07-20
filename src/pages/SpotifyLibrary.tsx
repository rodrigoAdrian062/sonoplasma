import { useState, useMemo, useRef, useEffect } from 'react';
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
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { AudioDndZone, DraggableAudioRow, DragHandle } from '@/components/library/AudioDndZone';
import { MoveTargetMenu } from '@/components/library/MoveTargetMenu';
import { BulkAddLinksDialog } from '@/components/library/BulkAddLinksDialog';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { getSpotifyUrl, isSpotifyUrl } from '@/lib/embedUrl';

export default function SpotifyLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, addAudio } = useAudioLibrary();
  const { folders, moveAudioToFolder } = useAudioFolders();
  const { stages } = useStages();
  const { sections } = useSections();
  const { saveAudios } = useStageAudios();
  const { allAudios: allStageAudios } = useAllStageAudios();

  // Map audio_url -> stages/sections where it is used
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
  const [nameEdited, setNameEdited] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'unused' | 'used'>('all');

  const [reloadTick, setReloadTick] = useState(0);

  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const allSpotifyAudios = useMemo(
    () => audios.filter((a) => a.tipo === 'spotify' || isSpotifyUrl(a.audio_url)),
    [audios]
  );

  const spotifyAudios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSpotifyAudios.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q) && !a.audio_url.toLowerCase().includes(q)) return false;
      const used = usageMap.has(a.audio_url);
      if (usageFilter === 'unused' && used) return false;
      if (usageFilter === 'used' && !used) return false;
      return true;
    });
  }, [allSpotifyAudios, search, usageFilter, usageMap]);

  const visibleAudios = useMemo(() => spotifyAudios.slice(0, visibleCount), [spotifyAudios, visibleCount]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, usageFilter]);

  // Infinite scroll: load more when the sentinel is near the viewport
  useEffect(() => {
    if (!showList) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, spotifyAudios.length));
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showList, spotifyAudios.length, visibleCount]);

  const handlePlayPause = (id: string) => {
    if (playingId !== id) {
      setIsPaused(false);
      setPlayingId(id);
      setReloadTick((t) => t + 1);
      return;
    }
    setPlayingId(null);
    setIsPaused(false);
  };

  const handleStop = () => {
    setPlayingId(null);
    setIsPaused(false);
  };

  // Auto-sugere o título ao colar um link válido (se o usuário não digitou nome manual).
  useEffect(() => {
    const url = newUrl.trim();
    if (!url || !isSpotifyUrl(url) || nameEdited) return;
    let cancelled = false;
    setFetchingTitle(true);
    const t = setTimeout(async () => {
      const { fetchLinkTitle } = await import('@/lib/fetchLinkTitle');
      const title = await fetchLinkTitle(url);
      if (!cancelled && title && !nameEdited) setNewName(title);
      if (!cancelled) setFetchingTitle(false);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); setFetchingTitle(false); };
  }, [newUrl, nameEdited]);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    if (!isSpotifyUrl(newUrl)) {
      toast({ title: 'Link do Spotify inválido', description: 'Cole um link de música, álbum ou playlist do Spotify.', variant: 'destructive' });
      return;
    }
    let finalName = newName.trim();
    if (!finalName) {
      const { fetchLinkTitle } = await import('@/lib/fetchLinkTitle');
      finalName = (await fetchLinkTitle(newUrl.trim())) || 'Faixa do Spotify';
    }
    try {
      await addAudio.mutateAsync({ nome: finalName, audio_url: newUrl.trim(), tipo: 'spotify' });
      setNewName(''); setNewUrl(''); setNameEdited(false);
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
          <SpotifyIcon className="text-[#1DB954]" size={22} />
          <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground flex-1 truncate">
            Spotify
          </h1>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-4 max-w-7xl mx-auto">
        {/* Add form */}
        <div className="border border-border rounded-lg p-3">
          {!showAddForm ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
                className="flex-1 border-dashed border-[#1DB954]/60 text-[#1DB954] hover:bg-[#1DB954]/10"
              >
                <Plus size={16} className="mr-2" />
                Adicionar 1 link
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkOpen(true)}
                className="flex-1 border-[#1DB954]/60 text-[#1DB954] hover:bg-[#1DB954]/10"
              >
                <Plus size={16} className="mr-2" />
                Colar vários links
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o link do Spotify"
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); if (!e.target.value.trim()) setNameEdited(false); }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newUrl.trim() || addAudio.isPending || fetchingTitle}
                  className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-black"
                >
                  {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder={fetchingTitle ? 'Buscando título…' : 'Nome (sugerido automaticamente ao colar o link)'}
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNameEdited(true); }}
                  className={fetchingTitle ? 'pr-9' : ''}
                />
                {fetchingTitle && <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewName(''); setNewUrl(''); setNameEdited(false); }} className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Toggle list button */}
        <Button
          variant="outline"
          onClick={() => setShowList((v) => !v)}
          className="w-full justify-between border-[#1DB954]/40 text-foreground hover:bg-[#1DB954]/10"
        >
          <span className="flex items-center gap-2">
            <ListMusic size={16} className="text-[#1DB954]" />
            {showList ? 'Ocultar músicas' : 'Ver músicas'}
            <span className="text-muted-foreground text-xs">({allSpotifyAudios.length})</span>
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
                      usageFilter === f.key && 'bg-[#1DB954] hover:bg-[#1DB954]/90 text-black'
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
                <Loader2 className="animate-spin text-[#1DB954]" size={28} />
              </div>
            ) : spotifyAudios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SpotifyIcon size={48} className="mx-auto mb-3 opacity-50 text-[#1DB954]" />
                <p className="text-lg">Nenhuma música encontrada</p>
                <p className="text-sm mt-1">Ajuste a busca ou o filtro</p>
              </div>
            ) : (
          <AudioDndZone
            accent="green"
            onSendToStage={(a, sid) => handleAddToStage(a.nome, a.audio_url, sid)}
            onMoveToFolder={(a, fid) => handleMoveToFolder(a, fid)}
          >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 pb-24">
            {visibleAudios.map((audio, idx) => {
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
                    isCurrent ? 'bg-[#1DB954]/10' : 'hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-center gap-3 px-2 py-1.5">
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground group-hover:hidden max-md:hidden">
                      {isCurrent ? <span className="text-[#1DB954]">♪</span> : idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayPause(audio.id)}
                      className="hidden w-5 shrink-0 items-center justify-center text-foreground group-hover:flex max-md:flex"
                      title={isPlaying ? 'Pausar' : 'Tocar'}
                    >
                      {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                    </button>
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-[#1DB954]/10 flex items-center justify-center">
                      <SpotifyIcon size={20} className="text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn('font-medium text-sm truncate', isCurrent && 'text-[#1DB954]')}>{audio.nome}</p>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-[#1DB954] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-black">
                            Nova
                          </span>
                        )}
                        {formatDuration(audio.duracao_segundos) && (
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatDuration(audio.duracao_segundos)}
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
                        accentClass="border-[#1DB954]/40 text-[#1DB954] hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
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
                      <div className="rounded-xl overflow-hidden border border-[#1DB954]/30 bg-black/50">
                        <iframe
                          key={`${audio.id}-${reloadTick}`}
                          src={getSpotifyUrl(audio.audio_url, { embed: true, autoplay: true }) || ''}
                          title={`Prévia — ${audio.nome}`}
                          className="w-full border-0"
                          style={{ height: 152 }}
                          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
                  )}
                </DraggableAudioRow>
              );
            })}
          </div>

          {visibleCount < spotifyAudios.length && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, spotifyAudios.length))}
                className="border-[#1DB954]/40 text-[#1DB954] hover:bg-[#1DB954]/10"
              >
                Carregar mais ({spotifyAudios.length - visibleCount} restantes)
              </Button>
            </div>
          )}



          </AudioDndZone>
            )}
          </>
        )}
      </main>
      <BulkAddLinksDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        platform="spotify"
        isValidUrl={isSpotifyUrl}
        existingUrls={audios.map((a) => a.audio_url)}
        addAudio={(input) => addAudio.mutateAsync(input)}
      />
    </div>
  );
}
