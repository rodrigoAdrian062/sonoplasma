import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Play, Pause, Search, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { BulkAddLinksDialog } from '@/components/library/BulkAddLinksDialog';
import { isSpotifyUrl, parseSpotify } from '@/lib/embedUrl';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SPOTIFY_STAGE = '__spotify_preview__';

export default function SpotifyLibraryPage() {
  const navigate = useNavigate();
  const { audios, addAudio, deleteAudio } = useAudioLibrary();
  const { play, pause, resume, stop, currentUrl, status } = useUniversalAudioPlayer();

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState('');

  const spotifyTracks = useMemo(
    () => audios.filter((a) => isSpotifyUrl(a.audio_url) || a.tipo === 'spotify'),
    [audios],
  );

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
      await addAudio({ nome: name, audio_url: url, tipo: 'spotify' as any });
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
              <ListMusic size={18} className="text-[#1DB954]" />
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map((a) => {
              const active = currentUrl === a.audio_url;
              const playing = active && status === 'playing';
              const parsed = parseSpotify(a.audio_url);
              return (
                <li
                  key={a.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border bg-card/60 hover:bg-card transition-colors',
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
                    <p className="text-[11px] text-muted-foreground truncate">
                      {parsed ? `${parsed.type}` : 'spotify'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (active) stop();
                      if (confirm(`Excluir "${a.nome}"?`)) deleteAudio(a.id);
                    }}
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BulkAddLinksDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        platform="spotify"
        isValidUrl={isSpotifyUrl}
        existingUrls={existingUrls}
        addAudio={addAudio as any}
      />
    </div>
  );
}
