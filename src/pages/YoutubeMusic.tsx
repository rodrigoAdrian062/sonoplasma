import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Link2, Loader2, Music2, Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { getYouTubeVideoId } from '@/lib/embedUrl';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { fetchLinkTitle } from '@/lib/fetchLinkTitle';
import { getYouTubePlaylistVideoIds } from '@/lib/youtubePlaylist';
import { toast } from 'sonner';

interface PlaylistTrack {
  id: string;
  name: string;
  url: string;
}

function getPlaylistId(link: string): string | null {
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['music.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return null;
    const playlistId = url.searchParams.get('list');
    return playlistId && /^[\w-]+$/.test(playlistId) ? playlistId : null;
  } catch {
    return null;
  }
}

function getEmbedUrl(link: string): string | null {
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['music.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return null;

    const videoId = getYouTubeVideoId(url.toString());
    const playlistId = url.searchParams.get('list');
    if (playlistId && !/^[\w-]+$/.test(playlistId)) return null;
    if (videoId) {
      const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
      if (playlistId) embed.searchParams.set('list', playlistId);
      return embed.toString();
    }
    if (playlistId) {
      const embed = new URL('https://www.youtube.com/embed/videoseries');
      embed.searchParams.set('list', playlistId);
      return embed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export default function YoutubeMusicPage() {
  const navigate = useNavigate();
  const { audios, isLoading, addAudios } = useAudioLibrary();
  const [linkInput, setLinkInput] = useState('');
  const [currentLink, setCurrentLink] = useState('');
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [loadedTrackCount, setLoadedTrackCount] = useState(0);
  const playlistRequestId = useRef(0);
  const autoLoadTimer = useRef<number | null>(null);
  const embedUrl = useMemo(() => getEmbedUrl(currentLink), [currentLink]);
  const inputEmbedUrl = useMemo(() => getEmbedUrl(linkInput), [linkInput]);

  const playLink = (link: string) => {
    if (!getEmbedUrl(link)) {
      toast.error('Link inválido', {
        description: 'Cole um link válido de música ou playlist do YouTube Music.',
      });
      return;
    }
    setCurrentLink(link);
    setLinkInput(link);
  };

  const loadPlaylist = useCallback(async (link: string) => {
    if (autoLoadTimer.current !== null) {
      window.clearTimeout(autoLoadTimer.current);
      autoLoadTimer.current = null;
    }
    const playlistId = getPlaylistId(link);
    if (!playlistId) {
      toast.error('Link inválido', {
        description: 'Cole um link de playlist do YouTube Music que contenha o parâmetro list.',
      });
      return;
    }
    const requestId = ++playlistRequestId.current;
    setIsLoadingPlaylist(true);
    setLoadedTrackCount(0);
    setPlaylistTracks([]);
    setCurrentLink(link.trim());
    try {
      const videoIds = [...new Set(await getYouTubePlaylistVideoIds(playlistId))];
      if (videoIds.length === 0) {
        throw new Error('A playlist não contém músicas disponíveis.');
      }

      const tracks: PlaylistTrack[] = [];
      for (let start = 0; start < videoIds.length; start += 5) {
        if (requestId !== playlistRequestId.current) return;
        const batch = videoIds.slice(start, start + 5);
        const batchTracks = await Promise.all(batch.map(async (id, index) => {
          const url = `https://www.youtube.com/watch?v=${id}`;
          const title = await fetchLinkTitle(url);
          return {
            id,
            name: title || `Faixa ${start + index + 1}`,
            url,
          };
        }));
        tracks.push(...batchTracks);
        if (requestId === playlistRequestId.current) setLoadedTrackCount(tracks.length);
      }

      if (requestId !== playlistRequestId.current) return;
      setPlaylistTracks(tracks);
      toast.success(`${tracks.length} músicas carregadas da playlist.`);
    } catch (error) {
      if (requestId !== playlistRequestId.current) return;
      toast.error('Não foi possível carregar a playlist', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      if (requestId === playlistRequestId.current) setIsLoadingPlaylist(false);
    }
  }, []);

  useEffect(() => {
    const requestId = ++playlistRequestId.current;
    if (autoLoadTimer.current !== null) {
      window.clearTimeout(autoLoadTimer.current);
      autoLoadTimer.current = null;
    }
    setIsLoadingPlaylist(false);
    if (!getPlaylistId(linkInput)) {
      setPlaylistTracks([]);
      return;
    }
    autoLoadTimer.current = window.setTimeout(() => {
      autoLoadTimer.current = null;
      if (requestId !== playlistRequestId.current) return;
      void loadPlaylist(linkInput.trim());
    }, 700);
    return () => {
      if (autoLoadTimer.current !== null) {
        window.clearTimeout(autoLoadTimer.current);
        autoLoadTimer.current = null;
      }
    };
  }, [linkInput, loadPlaylist]);

  const savePlaylist = async () => {
    if (playlistTracks.length === 0) return;
    try {
      await addAudios.mutateAsync(playlistTracks.map((track) => ({
        nome: track.name,
        audio_url: track.url,
        tipo: 'youtube',
      })));
    } catch {
      // The library mutation reports the error through its existing toast handler.
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link de compartilhamento copiado.');
    } catch (error) {
      toast.error('Não foi possível copiar o link', {
        description: error instanceof Error ? error.message : 'Verifique a permissão de área de transferência do navegador.',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </Button>
          <YoutubeIcon size={24} />
          <h1 className="flex-1 truncate font-display text-lg font-semibold text-foreground sm:text-xl">
            YouTube Music
          </h1>
        </div>
      </header>

      <main className="container flex w-full max-w-5xl flex-1 flex-col gap-6 py-6">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-red-500" />
            <h2 className="font-semibold text-foreground">Abrir música ou playlist</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cole aqui o link de compartilhamento do YouTube Music. A reprodução será aberta nesta tela.
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (inputEmbedUrl) playLink(linkInput);
              else {
                toast.error('Link inválido', {
                  description: 'Cole um link válido de música ou playlist do YouTube Music.',
                });
              }
            }}
          >
            <Input
              type="url"
              placeholder="https://music.youtube.com/playlist?list=..."
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              aria-label="Link de música ou playlist do YouTube Music"
            />
            <Button type="submit" disabled={!inputEmbedUrl} className="bg-red-600 text-white hover:bg-red-700">
              <Play size={16} className="mr-2" />
              Tocar playlist
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadPlaylist(linkInput.trim())}
              disabled={!getPlaylistId(linkInput) || isLoadingPlaylist || isLoading}
            >
              {isLoadingPlaylist ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Music2 size={16} className="mr-2" />}
              {isLoadingPlaylist ? 'Carregando músicas…' : 'Mostrar músicas'}
            </Button>
            <Button type="button" variant="outline" onClick={() => copyLink(linkInput.trim())} disabled={!inputEmbedUrl}>
              <Copy size={16} className="mr-2" />
              Copiar
            </Button>
          </form>
        </section>

        {isLoadingPlaylist && (
          <p className="text-sm text-muted-foreground" role="status">
            Carregando playlist e identificando músicas… {loadedTrackCount} carregadas.
          </p>
        )}

        {playlistTracks.length > 0 && (
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground">Músicas da playlist ({playlistTracks.length})</h2>
                <p className="truncate text-sm text-muted-foreground">{linkInput}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={savePlaylist}
                  disabled={addAudios.isPending || isLoading}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {addAudios.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Salvar todas
                </Button>
              </div>
            </div>
            <ol className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {playlistTracks.map((track, index) => {
                const alreadySaved = audios.some((audio) => getYouTubeVideoId(audio.audio_url) === track.id);
                return (
                  <li key={track.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{track.name}</span>
                    {alreadySaved && <span className="text-xs text-muted-foreground">Já está na biblioteca</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {embedUrl && (
          <section className="overflow-hidden rounded-xl border border-border bg-black">
            <iframe
              key={embedUrl}
              src={embedUrl}
              title="Player de música do YouTube"
              className="aspect-video w-full border-0"
              allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; web-share"
              allowFullScreen
            />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3">
              <span className="max-w-full truncate text-sm text-muted-foreground">{currentLink}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(currentLink)}>
                <Copy size={14} className="mr-2" />
                Copiar link de compartilhamento
              </Button>
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          O site completo do YouTube Music não permite incorporação. Esta tela reproduz playlists compatíveis pelo
          player oficial do YouTube. Ao salvar, cada faixa aparece como música na biblioteca do sistema.
        </p>
      </main>
    </div>
  );
}
