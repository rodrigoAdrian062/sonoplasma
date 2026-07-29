import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Play, Pause, Search, ListMusic } from 'lucide-react';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { BulkAddLinksDialog } from '@/components/library/BulkAddLinksDialog';
import { AudioDndZone, DraggableAudioRow, DragHandle } from '@/components/library/AudioDndZone';
import { MoveTargetMenu } from '@/components/library/MoveTargetMenu';
import { isSpotifyUrl, parseSpotify } from '@/lib/embedUrl';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioFolders } from '@/hooks/useAudioFolders';

const SPOTIFY_STAGE = '__spotify_preview__';

export default function SpotifyLibraryPage() {
  const navigate = useNavigate();
  const { audios, addAudio, deleteAudio } = useAudioLibrary();
  const { play, pause, resume, stop, currentUrl, status } = useUniversalAudioPlayer();
  const { stages } = useStages();
  const { sections } = useSections();
  const { saveAudios } = useStageAudios();
  const { allAudios: allStageAudios } = useAllStageAudios();
  const { folders, moveAudioToFolder } = useAudioFolders();

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState('');

  const spotifyTracks = useMemo(
    () => audios.filter((a) => isSpotifyUrl(a.audio_url) || a.tipo === 'spotify'),
    [audios],
  );

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spotifyTracks;
    return spotifyTracks.filter((a) => a.nome.toLowerCase().includes(q));
  }, [spotifyTracks, search]);

  const existingUrls = useMemo(() => spotifyTracks.map((a) => a.audio_url), [spotifyTracks]);

  const handleAdd = async () => {
    const url = newUrl.trim();
    const name = newName.trim();
    if (!url || !name) {
      toast({ title: 'Preencha nome e link', variant: 'destructive' });
      return;
    }
    if (!isSpotifyUrl(url)) {
      toast({ title: 'Link do Spotify inválido', variant: 'destructive' });
      return;
    }
    try {
      await addAudio.mutateAsync({ nome: name, audio_url: url, tipo: 'spotify' as any });
      setNewName('');
      setNewUrl('');
      setShowForm(false);
      toast({ title: 'Faixa adicionada' });
    } catch (e: any) {
      toast({ title: 'Erro ao adicionar', description: e?.message, variant: 'destructive' });
    }
  };

  const handleTogglePlay = (url: string) => {
    if (currentUrl === url) {
      if (status === 'playing') pause();
      else if (status === 'paused') resume();
      else play(SPOTIFY_STAGE, url);
    } else {
      play(SPOTIFY_STAGE, url);
    }
  };

  const handleAddToStage = async (audioNome: string, audioUrl: string, etapaId: string) => {
    try {
      const { data: existingAudios } = await supabase
        .from('sonoplastia_etapa_audios')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('ordem', { ascending: true });

      const currentAudios = existingAudios || [];
      if (currentAudios.length >= 10) {
        toast({ title: 'Esta etapa já possui 10 áudios (máximo)', variant: 'destructive' });
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
              <SpotifyIcon size={20} className="text-[#1DB954]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">Biblioteca Spotify</h1>
              <p className="text-xs text-muted-foreground">
                {spotifyTracks.length} {spotifyTracks.length === 1 ? 'faixa' : 'faixas'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setBulkOpen(true)}
            className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-black"
            size="sm"
          >
            Colar vários
          </Button>
          <Button onClick={() => setShowForm((v) => !v)} size="sm" variant="outline">
            <Plus size={16} className="mr-1" />
            Nova faixa
          </Button>
        </div>

        {showForm && (
          <div className="border-t border-border bg-card/60">
            <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Nome da faixa"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="sm:max-w-xs"
              />
              <Input
                placeholder="https://open.spotify.com/track/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAdd} className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-black">
                Adicionar
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ListMusic size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {spotifyTracks.length === 0
                ? 'Nenhuma faixa do Spotify ainda. Cole um link ou use "Colar vários".'
                : 'Nenhum resultado para a busca.'}
            </p>
          </div>
        ) : (
          <AudioDndZone
            accent="green"
            onSendToStage={(a, sid) => handleAddToStage(a.nome, a.audio_url, sid)}
            onMoveToFolder={(a, fid) => handleMoveToFolder(a, fid)}
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-24">
              {filtered.map((a) => {
                const active = currentUrl === a.audio_url;
                const playing = active && status === 'playing';
                const parsed = parseSpotify(a.audio_url);
                const usage = usageMap.get(a.audio_url) || [];
                const subtitle = usage.length > 0
                  ? usage.map((u) => u.stageName).join(', ')
                  : (parsed ? parsed.type : 'spotify');
                return (
                  <DraggableAudioRow key={a.id} audio={{ id: a.id, nome: a.nome, audio_url: a.audio_url }}>
                    {({ handleProps }) => (
                      <li
                        className={cn(
                          'group flex items-center gap-2 p-2 rounded-lg border bg-card/60 hover:bg-card transition-colors',
                          active ? 'border-[#1DB954]/60 shadow-sm shadow-[#1DB954]/20' : 'border-border',
                        )}
                      >
                        <button
                          onClick={() => handleTogglePlay(a.audio_url)}
                          className="h-9 w-9 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                          aria-label={playing ? 'Pausar' : 'Tocar'}
                          title={playing ? 'Pausar' : 'Tocar'}
                        >
                          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.nome}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100 transition-opacity">
                          <DragHandle handleProps={handleProps} />
                          <MoveTargetMenu
                            accentClass="border-[#1DB954]/40 text-[#1DB954] hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
                            onSendToStage={(sid) => handleAddToStage(a.nome, a.audio_url, sid)}
                            onMoveToFolder={(fid) => handleMoveToFolder(a, fid)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (active) stop();
                              if (confirm(`Excluir "${a.nome}"?`)) deleteAudio.mutate(a.id);
                            }}
                            aria-label="Excluir"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </li>
                    )}
                  </DraggableAudioRow>
                );
              })}
            </ul>
          </AudioDndZone>
        )}
      </main>

      <BulkAddLinksDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        platform="spotify"
        isValidUrl={isSpotifyUrl}
        existingUrls={existingUrls}
        addAudio={(input) => addAudio.mutateAsync(input)}
      />
    </div>
  );
}
