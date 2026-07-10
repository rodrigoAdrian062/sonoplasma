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
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

function parseSpotify(url: string): { type: string; id: string } | null {
  const u = (url || '').trim();
  const uriMatch = u.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/);
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };
  const urlMatch = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) return { type: urlMatch[1], id: urlMatch[2] };
  return null;
}

function getSpotifyUri(url: string): string | null {
  const p = parseSpotify(url);
  return p ? `spotify:${p.type}:${p.id}` : null;
}

function isSpotifyUrl(url: string): boolean {
  return parseSpotify(url) !== null;
}

// Load the Spotify IFrame API once and resolve with the API object.
let spotifyApiPromise: Promise<any> | null = null;
function loadSpotifyApi(): Promise<any> {
  if (spotifyApiPromise) return spotifyApiPromise;
  spotifyApiPromise = new Promise((resolve) => {
    if ((window as any).SpotifyIframeApi) {
      resolve((window as any).SpotifyIframeApi);
      return;
    }
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      (window as any).SpotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
    };
    if (!document.getElementById('spotify-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'spotify-iframe-api';
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.body.appendChild(script);
    }
  });
  return spotifyApiPromise;
}

export default function SpotifyLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, addAudio } = useAudioLibrary();
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'unused' | 'used'>('all');

  const controllerRef = useRef<any>(null);
  const embedElRef = useRef<HTMLDivElement | null>(null);

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

  const destroyController = useCallback(() => {
    if (controllerRef.current) {
      try { controllerRef.current.destroy(); } catch { /* noop */ }
      controllerRef.current = null;
    }
  }, []);

  useEffect(() => () => destroyController(), [destroyController]);

  // Create/switch the controller whenever the playing track changes.
  useEffect(() => {
    if (!playingId) {
      destroyController();
      return;
    }
    const audio = spotifyAudios.find((a) => a.id === playingId);
    const uri = audio ? getSpotifyUri(audio.audio_url) : null;
    if (!uri) return;

    let cancelled = false;
    loadSpotifyApi().then((IFrameAPI) => {
      if (cancelled || !embedElRef.current) return;
      if (controllerRef.current) {
        try {
          controllerRef.current.loadUri(uri);
          controllerRef.current.play();
        } catch { /* noop */ }
        return;
      }
      IFrameAPI.createController(
        embedElRef.current,
        { uri, width: '100%', height: 152 },
        (controller: any) => {
          if (cancelled) { try { controller.destroy(); } catch { /* noop */ } return; }
          controllerRef.current = controller;
          controller.addListener('ready', () => {
            try { controller.play(); } catch { /* noop */ }
          });
          controller.addListener('playback_update', (e: any) => {
            if (typeof e?.data?.isPaused === 'boolean') setIsPaused(e.data.isPaused);
          });
        }
      );
    });

    return () => { cancelled = true; };
  }, [playingId, spotifyAudios, destroyController]);

  const handlePlayPause = (id: string) => {
    if (playingId !== id) {
      setIsPaused(false);
      setPlayingId(id);
      return;
    }
    // Same track: toggle
    if (controllerRef.current) {
      try { controllerRef.current.togglePlay(); } catch { /* noop */ }
    }
  };

  const handleStop = () => {
    destroyController();
    setPlayingId(null);
    setIsPaused(false);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    if (!isSpotifyUrl(newUrl)) {
      toast({ title: 'Link do Spotify inválido', description: 'Cole um link de música, álbum ou playlist do Spotify.', variant: 'destructive' });
      return;
    }
    try {
      await addAudio.mutateAsync({ nome: newName.trim(), audio_url: newUrl.trim(), tipo: 'spotify' });
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

      <main className="container py-4 sm:py-6 space-y-4 max-w-3xl mx-auto">
        {/* Add form */}
        <div className="border border-border rounded-lg p-3">
          {!showAddForm ? (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full border-dashed border-[#1DB954]/60 text-[#1DB954] hover:bg-[#1DB954]/10"
            >
              <Plus size={16} className="mr-2" />
              Adicionar link do Spotify
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nome (ex: Hino de abertura)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o link do Spotify"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newUrl.trim() || !newName.trim() || addAudio.isPending}
                  className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-black"
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
          <div className="space-y-3">
            {spotifyAudios.map((audio) => {
              const isCurrent = playingId === audio.id;
              const isPlaying = isCurrent && !isPaused;
              const usage = usageMap.get(audio.audio_url) || [];
              const isUsed = usage.length > 0;
              return (
                <div
                  key={audio.id}
                  className={cn(
                    'rounded-lg border overflow-hidden transition-colors',
                    isCurrent
                      ? 'border-[#1DB954]/50 bg-card/50'
                      : isUsed
                        ? 'border-l-4 border-l-[#1DB954] border-y-border/50 border-r-border/50 bg-[#1DB954]/5'
                        : 'border-border/50 bg-card/50'
                  )}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="p-2 bg-[#1DB954]/10 rounded-lg shrink-0">
                      <SpotifyIcon size={18} className="text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{audio.nome}</p>
                      <a
                        href={audio.audio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#1DB954] hover:underline truncate block max-w-[260px] sm:max-w-[400px]"
                        title={audio.audio_url}
                      >
                        {audio.audio_url}
                      </a>
                      {isUsed ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {usage.map((u, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] text-[10px] font-medium"
                              title={`${u.sectionName} › ${u.stageName}`}
                            >
                              <span className="opacity-70">{u.sectionName}</span>
                              <span>›</span>
                              <span>{u.stageName}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                          Não adicionada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlayPause(audio.id)}
                        className="h-9 w-9"
                        title={isPlaying ? 'Pausar' : 'Tocar'}
                      >
                        {isPlaying ? <Pause size={18} className="text-[#1DB954]" /> : <Play size={18} className="text-[#1DB954]" />}
                      </Button>
                      {isCurrent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleStop}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          title="Parar"
                        >
                          <X size={18} />
                        </Button>
                      )}
                      {stages.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#1DB954]" title="Enviar para etapa">
                              <Plus size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                            {stagesBySection.map(({ section, stages: sectionStages }) => (
                              sectionStages.length > 0 && (
                                <div key={section.id}>
                                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{section.nome}</p>
                                  {sectionStages.map((stage) => (
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
                                {unassignedStages.map((stage) => (
                                  <DropdownMenuItem key={stage.id} onClick={() => handleAddToStage(audio.nome, audio.audio_url, stage.id)}>
                                    <Plus size={14} className="mr-2" /> {stage.nome_simbolico}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { if (isCurrent) handleStop(); deleteAudio.mutate(audio.id); }}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="px-3 pb-3">
                      {/* The IFrame API replaces this element with the embedded player */}
                      <div ref={embedElRef} className="rounded-xl overflow-hidden" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
