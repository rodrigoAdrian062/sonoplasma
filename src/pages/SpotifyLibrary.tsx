import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Loader2, Music2, X, Play } from 'lucide-react';

function getSpotifyEmbedUrl(url: string): string | null {
  const u = (url || '').trim();
  // spotify:track:ID  |  spotify:playlist:ID ...
  const uriMatch = u.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
  }
  // https://open.spotify.com/track/ID?...  (with optional /intl-xx/ prefix)
  const urlMatch = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return `https://open.spotify.com/embed/${urlMatch[1]}/${urlMatch[2]}`;
  }
  return null;
}

function isSpotifyUrl(url: string): boolean {
  return getSpotifyEmbedUrl(url) !== null;
}

export default function SpotifyLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, addAudio } = useAudioLibrary();

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const spotifyAudios = useMemo(
    () => audios.filter((a) => a.tipo === 'spotify' || isSpotifyUrl(a.audio_url)),
    [audios]
  );

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    if (!isSpotifyUrl(newUrl)) {
      toast({ title: 'Link do Spotify inválido', description: 'Cole um link de música, álbum ou playlist do Spotify.', variant: 'destructive' });
      return;
    }
    try {
      await addAudio.mutateAsync({
        nome: newName.trim(),
        audio_url: newUrl.trim(),
        tipo: 'spotify',
      });
      setNewName('');
      setNewUrl('');
      setShowAddForm(false);
    } catch { /* handled by hook */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/biblioteca')}>
            <ArrowLeft size={20} />
          </Button>
          <Music2 className="text-[#1DB954]" size={22} />
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

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#1DB954]" size={28} />
          </div>
        ) : spotifyAudios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music2 size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">Nenhum link do Spotify</p>
            <p className="text-sm mt-1">Adicione músicas, álbuns ou playlists do Spotify</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spotifyAudios.map((audio) => {
              const embedUrl = getSpotifyEmbedUrl(audio.audio_url);
              const isPlaying = playingId === audio.id;
              return (
                <div
                  key={audio.id}
                  className={cn(
                    'rounded-lg border border-border/50 bg-card/50 overflow-hidden transition-colors',
                    isPlaying && 'border-[#1DB954]/50'
                  )}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="p-2 bg-[#1DB954]/10 rounded-lg shrink-0">
                      <Music2 size={18} className="text-[#1DB954]" />
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
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPlayingId(isPlaying ? null : audio.id)}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        title={isPlaying ? 'Fechar player' : 'Tocar'}
                      >
                        {isPlaying ? <X size={16} className="text-muted-foreground" /> : <Play size={16} className="text-[#1DB954]" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAudio.mutate(audio.id)}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {isPlaying && embedUrl && (
                    <div className="px-3 pb-3">
                      <iframe
                        title={audio.nome}
                        src={`${embedUrl}?utm_source=generator`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-xl"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
