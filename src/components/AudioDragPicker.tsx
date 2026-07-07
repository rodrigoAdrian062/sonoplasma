import { useState, useRef, useMemo } from 'react';
import {
  Search, Music, Youtube, Music2, Play, Pause, Square, Plus, Upload, Loader2,
  Link as LinkIcon, X, Folder, ChevronLeft, Library, GripVertical, MousePointerClick, Check,

} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';

interface AudioItem {
  nome: string;
  audio_url: string;
}

interface AudioDragPickerProps {
  isOpen: boolean;
  onClose: () => void;
  audios: AudioItem[];
  onChange: (audios: AudioItem[]) => void;
  maxAudios?: number;
}

type AddMode = 'upload' | 'youtube' | 'spotify' | 'link';

const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
const isSpotifyUrl = (url: string) => url.includes('open.spotify.com') || url.startsWith('spotify:');

const getYouTubeVideoId = (url: string): string | null => {
  const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
};


function SourceIcon({ url, size = 14 }: { url: string; size?: number }) {
  if (isYouTubeUrl(url)) return <Youtube size={size} className="text-red-500" />;
  if (isSpotifyUrl(url)) return <Music2 size={size} className="text-[#1DB954]" />;
  return <Music size={size} className="text-gold" />;
}

export function AudioDragPicker({ isOpen, onClose, audios, onChange, maxAudios = Infinity }: AudioDragPickerProps) {
  const { audios: library, isLoading, uploadAndAddAudio, addAudio } = useAudioLibrary();
  const { folders } = useAudioFolders();

  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPollRef = useRef<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('upload');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedUrls = useMemo(() => new Set(audios.map((a) => a.audio_url)), [audios]);
  const atMax = audios.length >= maxAudios;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((a) => {
      const inFolder = search ? true : (a as any).pasta_id === currentFolderId;
      const matches = !q || a.nome.toLowerCase().includes(q);
      return inFolder && matches;
    });
  }, [library, search, currentFolderId]);

  const formatTime = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null; }
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo?.(); ytPlayerRef.current.destroy?.(); } catch { /* noop */ }
      ytPlayerRef.current = null;
    }
    setPlayingUrl(null);
    setIsPaused(false);
    setCurTime(0);
    setDuration(0);
  };

  const playYouTube = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) { toast.error('URL do YouTube inválida'); return; }
    stopPreview();

    let container = document.getElementById('yt-picker-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-picker-player-container';
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(container);
    }
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-picker-player';
    container.innerHTML = '';
    container.appendChild(playerDiv);

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }
      ytPlayerRef.current = new (window as any).YT.Player('yt-picker-player', {
        height: '1',
        width: '1',
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(70);
            e.target.playVideo();
            setPlayingUrl(url);
            setIsPaused(false);
            ytPollRef.current = setInterval(() => {
              try {
                setCurTime(ytPlayerRef.current?.getCurrentTime?.() || 0);
                setDuration(ytPlayerRef.current?.getDuration?.() || 0);
              } catch { /* noop */ }
            }, 500);
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT;
            if (e.data === YT.PlayerState.ENDED) stopPreview();
          },
          onError: () => { toast.error('Erro ao reproduzir vídeo'); stopPreview(); },
        },
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.getElementsByTagName('script')[0]?.parentNode?.insertBefore(tag, document.getElementsByTagName('script')[0]);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  };

  const togglePreview = (url: string) => {
    // Spotify can't be played inline; open its player
    if (isSpotifyUrl(url)) {
      window.open(url, '_blank');
      return;
    }

    // YouTube: toggle pause/resume via IFrame API (inline, no new tab)
    if (isYouTubeUrl(url)) {
      if (playingUrl === url && ytPlayerRef.current) {
        try {
          if (isPaused) { ytPlayerRef.current.playVideo(); setIsPaused(false); }
          else { ytPlayerRef.current.pauseVideo(); setIsPaused(true); }
        } catch { /* noop */ }
        return;
      }
      playYouTube(url);
      return;
    }

    // Same audio: toggle pause/resume
    if (playingUrl === url && audioRef.current) {
      if (isPaused) {
        audioRef.current.play();
        setIsPaused(false);
      } else {
        audioRef.current.pause();
        setIsPaused(true);
      }
      return;
    }
    stopPreview();
    const el = new Audio(url);
    audioRef.current = el;
    el.onloadedmetadata = () => setDuration(el.duration);
    el.ontimeupdate = () => setCurTime(el.currentTime);
    el.onended = () => stopPreview();
    el.play().then(() => { setPlayingUrl(url); setIsPaused(false); }).catch(() => toast.error('Erro ao tocar áudio'));
  };

  const seekTo = (url: string, ratio: number) => {
    if (playingUrl !== url || duration <= 0) return;
    if (isYouTubeUrl(url) && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(ratio * duration, true); } catch { /* noop */ }
    } else if (audioRef.current) {
      audioRef.current.currentTime = ratio * duration;
    }
  };



  const addItem = (item: AudioItem) => {
    if (selectedUrls.has(item.audio_url)) return;
    if (atMax) {
      toast.error(`Máximo de ${maxAudios} áudios`);
      return;
    }
    onChange([...audios, { nome: item.nome, audio_url: item.audio_url }]);
  };

  const removeItem = (url: string) => onChange(audios.filter((a) => a.audio_url !== url));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) addItem(JSON.parse(data));
    } catch {
      /* ignore */
    }
    setDraggingUrl(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const name = files.length === 1 && newName ? newName : file.name.replace(/\.[^/.]+$/, '');
        try {
          const res: any = await uploadAndAddAudio(file, name);
          if (!atMax && res?.audio_url) onChange([...audios, { nome: res.nome, audio_url: res.audio_url }]);
        } catch {
          /* handled in hook */
        }
      }
      setNewName('');
      setShowAdd(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim() || !newName.trim()) {
      toast.error('Preencha nome e link');
      return;
    }
    const tipo = isYouTubeUrl(newUrl) ? 'youtube' : isSpotifyUrl(newUrl) ? 'spotify' : 'external';
    try {
      await addAudio.mutateAsync({ nome: newName.trim(), audio_url: newUrl.trim(), tipo });
      if (!atMax) onChange([...audios, { nome: newName.trim(), audio_url: newUrl.trim() }]);
      setNewName('');
      setNewUrl('');
      setShowAdd(false);
    } catch {
      /* handled in hook */
    }
  };

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Library className="text-gold" size={18} />
            Escolher áudios
            <span className="ml-1 text-xs font-normal text-muted-foreground hidden sm:flex items-center gap-1">
              <GripVertical size={12} /> arraste da biblioteca para a lista
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden">
          {/* Library side */}
          <div className="flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-border">
            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar na biblioteca..."
                  className="bg-secondary border-border pl-9 h-9 text-sm"
                />
              </div>

              {!search && currentFolderId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolderId(null)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  {currentFolder?.nome || 'Voltar'}
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 px-3 pb-3">
              {!search && !currentFolderId && folders.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-card"
                    >
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <Folder size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{folder.nome}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {library.filter((a) => (a as any).pasta_id === folder.id).length} áudio(s)
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-gold" size={22} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                  <Library size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{search ? 'Nenhum áudio encontrado' : currentFolderId ? 'Pasta vazia' : 'Biblioteca vazia'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((item) => {
                    const selected = selectedUrls.has(item.audio_url);
                    return (
                      <div
                        key={item.id}
                        draggable={!selected}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({ nome: item.nome, audio_url: item.audio_url }));
                          e.dataTransfer.effectAllowed = 'copy';
                          setDraggingUrl(item.audio_url);
                        }}
                        onDragEnd={() => setDraggingUrl(null)}
                        className={cn(
                          'rounded-lg border p-2 transition-all',
                          selected
                            ? 'border-gold/40 bg-gold/5 opacity-60'
                            : 'border-border/50 bg-card/50 hover:border-gold/40 hover:bg-card cursor-grab active:cursor-grabbing',
                          draggingUrl === item.audio_url && 'opacity-40'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {!selected && <GripVertical size={14} className="text-muted-foreground shrink-0" />}
                          <div className="rounded-md bg-secondary p-1.5 shrink-0">
                            <SourceIcon url={item.audio_url} />
                          </div>
                          <span className="flex-1 truncate text-sm text-foreground">{item.nome}</span>
                          <button
                            type="button"
                            onClick={() => togglePreview(item.audio_url)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-gold hover:bg-gold/10"
                            title="Ouvir"
                          >
                            {playingUrl === item.audio_url && !isPaused ? <Pause size={14} className="text-gold" /> : <Play size={14} />}
                          </button>
                          {playingUrl === item.audio_url && (
                            <button
                              type="button"
                              onClick={() => stopPreview()}
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Parar"
                            >
                              <Square size={14} />
                            </button>
                          )}
                          {selected ? (
                            <span className="shrink-0 rounded-md p-1.5 text-gold" title="Já adicionado">
                              <Check size={14} />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-gold hover:bg-gold/10"
                              title="Adicionar"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>

                        {/* Progress bar (same model as library) */}
                        {playingUrl === item.audio_url && duration > 0 && (
                          <div className="mt-2 flex items-center gap-2 px-1">
                            <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
                              {formatTime(curTime)}
                            </span>
                            <div
                              className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-secondary"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                seekTo(item.audio_url, (e.clientX - rect.left) / rect.width);
                              }}
                            >
                              <div
                                className="relative h-full rounded-full bg-gold transition-all"
                                style={{ width: `${(curTime / duration) * 100}%` }}
                              >
                                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow-lg transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>
                            <span className="w-9 font-mono text-[10px] text-muted-foreground">
                              {formatTime(duration)}
                            </span>
                          </div>
                        )}
                      </div>

                    );
                  })}
                </div>
              )}

              {/* Add new */}
              <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-3">
                {!showAdd ? (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gold/40 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                  >
                    <Plus size={16} />
                    Adicionar novo áudio
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1 rounded-lg bg-secondary p-1">
                      {([
                        { id: 'upload', label: 'Upload', icon: Upload },
                        { id: 'youtube', label: 'YouTube', icon: Youtube },
                        { id: 'spotify', label: 'Spotify', icon: Music2 },
                        { id: 'link', label: 'Link', icon: LinkIcon },
                      ] as const).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAddMode(t.id)}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs transition-all',
                            addMode === t.id ? 'bg-gold/20 font-medium text-gold' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <t.icon size={12} />
                          <span className="hidden sm:inline">{t.label}</span>
                        </button>
                      ))}
                    </div>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do áudio"
                      className="bg-secondary border-border h-9 text-sm"
                    />
                    {addMode === 'upload' ? (
                      <>
                        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileSelect} className="hidden" />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full gap-2 border-gold/30 text-gold hover:bg-gold/10"
                        >
                          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                          {isUploading ? 'Enviando...' : 'Selecionar arquivo(s)'}
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder={
                            addMode === 'youtube' ? 'https://youtube.com/watch?v=...'
                            : addMode === 'spotify' ? 'https://open.spotify.com/track/...'
                            : 'https://...'
                          }
                          className="bg-secondary border-border h-9 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddUrl}
                          disabled={addAudio.isPending}
                          className="bg-gold hover:bg-gold-glow text-background"
                        >
                          {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Ok'}
                        </Button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowAdd(false); setNewName(''); setNewUrl(''); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Drop zone side */}
          <div className="flex flex-col overflow-hidden bg-secondary/20">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-foreground">
                Áudios da etapa ({audios.length}{Number.isFinite(maxAudios) ? `/${maxAudios}` : ''})
              </span>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex-1 overflow-y-auto p-3 transition-colors',
                isDragOver && 'bg-gold/10 ring-2 ring-inset ring-gold/50'
              )}
            >
              {audios.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center text-muted-foreground">
                  <MousePointerClick size={30} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">Arraste as músicas para cá</p>
                  <p className="text-xs mt-0.5">ou toque no + na biblioteca</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {audios.map((a) => (
                    <div
                      key={a.audio_url}
                      className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2"
                    >
                      <div className="rounded-md bg-secondary p-1.5 shrink-0">
                        <SourceIcon url={a.audio_url} />
                      </div>
                      <span className="flex-1 truncate text-sm text-foreground">{a.nome || 'Áudio'}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(a.audio_url)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border p-3">
              <Button type="button" onClick={onClose} className="w-full bg-gold hover:bg-gold-glow text-background">
                Concluir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
