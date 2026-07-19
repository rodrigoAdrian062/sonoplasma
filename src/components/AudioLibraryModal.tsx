import { useState, useRef, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { Music, Trash2, Play, Pause, Upload, Plus, Library, ExternalLink, Youtube, Loader2, Download, CheckSquare, Square, X, Folder, ChevronLeft, FileAudio, Headphones, Check } from 'lucide-react';
import { toEmbedUrl, detectStream } from '@/lib/embedUrl';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';

interface AudioLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudio?: (audio: { nome: string; audio_url: string }) => void;
  selectionMode?: boolean;
  audioFilter?: (audio: { nome: string; audio_url: string; tipo?: string | null }) => boolean;
  emptySelectionMessage?: string;
}

function getAudioFolderId(audio: { pasta_id?: string | null }) {
  return audio.pasta_id ?? null;
}

function getAudioSource(a: { audio_url: string; tipo?: string | null }): 'youtube' | 'spotify' | 'file' {
  const url = (a.audio_url || '').toLowerCase();
  const t = (a.tipo || '').toLowerCase();
  if (t === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (t === 'spotify' || url.includes('open.spotify.com') || url.startsWith('spotify:')) return 'spotify';
  return 'file';
}

export function AudioLibraryModal({ isOpen, onClose, onSelectAudio, selectionMode = false, audioFilter, emptySelectionMessage }: AudioLibraryModalProps) {
  const { audios, isLoading, deleteAudio, uploadAndAddAudio, addAudio } = useAudioLibrary();
  const { folders } = useAudioFolders();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'file' | 'youtube' | 'spotify'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewEmbedId, setPreviewEmbedId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  // Ao desmontar, pausa a prévia para não continuar tocando fora do modal
  useEffect(() => () => { audioElement?.pause(); }, [audioElement]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [newAudioName, setNewAudioName] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  const filteredAudios = useMemo(() => {
    if (selectionMode) {
      // Em modo seleção mostramos TUDO com filtro por pasta + busca (sem navegação em pastas)
      const term = searchTerm.trim().toLowerCase();
      return audios.filter((a) => {
        if (folderFilter === 'all') {
          // ok
        } else if (folderFilter === 'none') {
          if (getAudioFolderId(a)) return false;
        } else if (getAudioFolderId(a) !== folderFilter) {
          return false;
        }
        if (audioFilter && !audioFilter(a)) return false;
        if (sourceFilter !== 'all' && getAudioSource(a) !== sourceFilter) return false;
        if (!term) return true;
        return a.nome.toLowerCase().includes(term);
      });
    }
    return audios.filter(a => getAudioFolderId(a) === currentFolderId && (!audioFilter || audioFilter(a)));
  }, [audios, currentFolderId, selectionMode, searchTerm, folderFilter, sourceFilter, audioFilter]);


  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };


  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePlay = (audio: { id: string; audio_url: string }) => {
    // YouTube/Spotify: prévia inline via iframe embed
    if (detectStream(audio.audio_url)) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
      setPreviewEmbedId((prev) => (prev === audio.id ? null : audio.id));
      return;
    }

    setPreviewEmbedId(null);

    if (playingId === audio.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const newAudio = new Audio();
      newAudio.preload = 'auto';
      newAudio.crossOrigin = 'anonymous';
      newAudio.volume = 1;
      newAudio.src = audio.audio_url;
      newAudio.onerror = () => {
        // Retry sem crossOrigin (alguns storages não devolvem CORS)
        const retry = new Audio(audio.audio_url);
        retry.volume = 1;
        retry.onended = () => { setPlayingId(null); setAudioElement(null); };
        retry.play().then(() => {
          setAudioElement(retry);
          setPlayingId(audio.id);
        }).catch(() => {
          toast({ title: 'Não foi possível reproduzir este áudio', variant: 'destructive' });
          setPlayingId(null); setAudioElement(null);
        });
      };
      newAudio.play().catch(() => {
        // deixa o onerror tratar
      });
      newAudio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      setAudioElement(newAudio);
      setPlayingId(audio.id);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of Array.from(files)) {
        const name = files.length === 1 && newAudioName
          ? newAudioName
          : file.name.replace(/\.[^/.]+$/, '');
        try {
          await uploadAndAddAudio(file, name);
          successCount++;
        } catch {
          // individual error handled by hook
        }
      }
      if (successCount > 1) {
        toast({ title: `${successCount} áudios adicionados à biblioteca` });
      }
      setNewAudioName('');
      setShowAddForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newAudioUrl.trim() || !newAudioName.trim()) return;

    try {
      await addAudio.mutateAsync({
        nome: newAudioName.trim(),
        audio_url: newAudioUrl.trim(),
        tipo: isYouTubeUrl(newAudioUrl) ? 'youtube' : 'external',
      });
      setNewAudioName('');
      setNewAudioUrl('');
      setShowAddForm(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSelect = (audio: { nome: string; audio_url: string }) => {
    audioElement?.pause();
    setPlayingId(null);
    setAudioElement(null);
    setPreviewEmbedId(null);
    onSelectAudio?.(audio);
    onClose();
  };

  const handleDownloadAll = async () => {
    const downloadableAudios = audios.filter(
      (a) => a.tipo !== 'youtube' && !isYouTubeUrl(a.audio_url)
    );

    if (downloadableAudios.length === 0) {
      toast({ title: 'Nenhum áudio disponível para download', description: 'Apenas áudios MP3 podem ser baixados (links do YouTube são ignorados).', variant: 'destructive' });
      return;
    }

    setIsDownloadingAll(true);
    try {
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
        } catch {
          // skip failed downloads
        }
      }

      if (count === 0) {
        toast({ title: 'Não foi possível baixar os áudios', variant: 'destructive' });
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'biblioteca-audios.zip');
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === audios.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(audios.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    let count = 0;
    for (const id of selectedIds) {
      try {
        await deleteAudio.mutateAsync(id);
        count++;
      } catch {
        // individual error handled by hook
      }
    }
    toast({ title: `${count} áudio(s) removido(s)` });
    setSelectedIds(new Set());
    setBulkDeleteMode(false);
    setIsDeletingBulk(false);
  };

  const handleClose = () => {
    audioElement?.pause();
    setPlayingId(null);
    setAudioElement(null);
    setPreviewEmbedId(null);
    setBulkDeleteMode(false);
    setSelectedIds(new Set());
    setCurrentFolderId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="text-gold" size={20} />
            {selectionMode ? 'Selecionar da Biblioteca' : bulkDeleteMode ? `${selectedIds.size} selecionado(s)` : 'Biblioteca de Áudios'}
            {!selectionMode && audios.length > 0 && (
              <div className="ml-auto flex items-center gap-1">
                {bulkDeleteMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                      {selectedIds.size === audios.length ? <CheckSquare size={14} className="mr-1" /> : <Square size={14} className="mr-1" />}
                      {selectedIds.size === audios.length ? 'Desmarcar' : 'Todos'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0 || isDeletingBulk}
                    >
                      {isDeletingBulk ? <Loader2 className="animate-spin mr-1" size={14} /> : <Trash2 size={14} className="mr-1" />}
                      Excluir ({selectedIds.size})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setBulkDeleteMode(false); setSelectedIds(new Set()); }}>
                      <X size={14} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkDeleteMode(true)}
                    >
                      <CheckSquare size={14} className="mr-1" />
                      Selecionar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAll}
                      disabled={isDownloadingAll}
                    >
                      {isDownloadingAll ? <Loader2 className="animate-spin mr-1" size={14} /> : <Download size={14} className="mr-1" />}
                      {isDownloadingAll ? 'Baixando...' : 'Baixar'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Add Audio Section */}
          {!selectionMode && (
            <div className="border border-border rounded-lg p-3">
              {!showAddForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="w-full border-dashed border-gold/50 text-gold hover:bg-gold/10"
                >
                  <Plus size={16} className="mr-2" />
                  Adicionar áudio à biblioteca
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={addMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAddMode('upload')}
                      className={addMode === 'upload' ? 'bg-gold hover:bg-gold-glow text-background' : ''}
                    >
                      <Upload size={14} className="mr-1" />
                      Upload
                    </Button>
                    <Button
                      variant={addMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAddMode('url')}
                      className={addMode === 'url' ? 'bg-gold hover:bg-gold-glow text-background' : ''}
                    >
                      <ExternalLink size={14} className="mr-1" />
                      URL / YouTube
                    </Button>
                  </div>

                   <Input
                     placeholder="Nome do áudio (opcional para múltiplos)"
                     value={newAudioName}
                     onChange={(e) => setNewAudioName(e.target.value)}
                   />

                  {addMode === 'upload' ? (
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="mr-2" />
                            Selecionar arquivo(s)
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL do áudio ou YouTube"
                        value={newAudioUrl}
                        onChange={(e) => setNewAudioUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddUrl}
                        disabled={!newAudioUrl.trim() || !newAudioName.trim() || addAudio.isPending}
                        className="bg-gold hover:bg-gold-glow text-background"
                      >
                        {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAudioName('');
                      setNewAudioUrl('');
                    }}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Search + folder chips (selection mode) */}
          {selectionMode && (
            <div className="space-y-2 shrink-0">
              <Input
                placeholder="Buscar áudio pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Chips por origem (arquivo / YouTube / Spotify) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                {([
                  { id: 'all', label: 'Todos', icon: null, count: audios.length },
                  { id: 'file', label: 'Arquivos', icon: <FileAudio size={11} />, count: audios.filter(a => getAudioSource(a) === 'file').length },
                  { id: 'youtube', label: 'YouTube', icon: <Youtube size={11} className="text-[#FF0000]" />, count: audios.filter(a => getAudioSource(a) === 'youtube').length },
                  { id: 'spotify', label: 'Spotify', icon: <SpotifyIcon size={11} />, count: audios.filter(a => getAudioSource(a) === 'spotify').length },
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSourceFilter(s.id as typeof sourceFilter)}
                    className={cn(
                      'shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 whitespace-nowrap',
                      sourceFilter === s.id
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {s.icon}
                    {s.label} ({s.count})
                  </button>
                ))}
              </div>
              {folders.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setFolderFilter('all')}
                    className={cn(
                      'shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
                      folderFilter === 'all'
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Todas ({audios.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderFilter('none')}
                    className={cn(
                      'shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
                      folderFilter === 'none'
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sem pasta ({audios.filter(a => !getAudioFolderId(a)).length})
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFolderFilter(f.id)}
                      className={cn(
                        'shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 whitespace-nowrap',
                        folderFilter === f.id
                          ? 'bg-gold/20 border-gold/50 text-gold'
                          : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Folder size={11} />
                      {f.nome} ({audios.filter(a => getAudioFolderId(a) === f.id).length})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Audio List */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : filteredAudios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music size={40} className="mx-auto mb-2 opacity-50" />
                <p>{selectionMode ? (emptySelectionMessage || 'Nenhum áudio encontrado') : (currentFolderId ? 'Nenhum áudio nesta pasta' : 'Nenhum áudio na biblioteca')}</p>
                <p className="text-xs mt-1">Adicione áudios para reutilizá-los em várias etapas</p>
              </div>

            ) : (
              <div className="space-y-2">
                {filteredAudios.map((audio) => {
                  const isStream = !!detectStream(audio.audio_url);
                  const showEmbed = previewEmbedId === audio.id && isStream;
                  const embedUrl = showEmbed ? toEmbedUrl(audio.audio_url, { autoplay: true }) : null;
                  return (
                  <div key={audio.id} className="space-y-2">
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors',
                      bulkDeleteMode && 'cursor-pointer',
                      bulkDeleteMode && selectedIds.has(audio.id) && 'border-destructive/50 bg-destructive/5'
                    )}
                    onClick={
                      bulkDeleteMode
                        ? () => toggleSelectId(audio.id)
                        : undefined
                    }
                  >
                    {bulkDeleteMode && (
                      <Checkbox
                        checked={selectedIds.has(audio.id)}
                        onCheckedChange={() => toggleSelectId(audio.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getAudioSource(audio) === 'youtube' ? (
                        <Youtube size={18} className="text-[#FF0000]" />
                      ) : getAudioSource(audio) === 'spotify' ? (
                        <SpotifyIcon size={18} />
                      ) : (
                        <Music size={18} className="text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{audio.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getAudioSource(audio) === 'youtube' ? 'YouTube' : getAudioSource(audio) === 'spotify' ? 'Spotify' : formatFileSize(audio.tamanho_bytes) || 'Link externo'}
                      </p>
                    </div>

                    {!bulkDeleteMode && (
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {/* Botão de prévia — sempre visível, com borda dourada para destacar */}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title={isStream ? (showEmbed ? 'Fechar prévia' : 'Ouvir prévia') : (playingId === audio.id ? 'Pausar' : 'Ouvir')}
                          aria-label={isStream ? 'Ouvir prévia' : 'Ouvir'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handlePlay(audio);
                          }}
                          className="h-9 w-9 shrink-0 border-gold/50 bg-gold/10 hover:bg-gold/20 text-gold"
                        >
                          {(playingId === audio.id || showEmbed) ? (
                            <Pause size={16} fill="currentColor" />
                          ) : isStream ? (
                            <Headphones size={16} />
                          ) : (
                            <Play size={16} fill="currentColor" />
                          )}
                        </Button>

                        {selectionMode ? (
                          <Button
                            type="button"
                            size="sm"
                            className="shrink-0 bg-gold hover:bg-gold-glow text-background"
                            onClick={(e) => { e.stopPropagation(); handleSelect(audio); }}
                          >
                            Selecionar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAudio.mutate(audio.id);
                            }}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {showEmbed && embedUrl && (
                    <div className="rounded-lg overflow-hidden border border-gold/30 bg-black/40" onClick={(e) => e.stopPropagation()}>
                      <iframe
                        src={embedUrl}
                        title={`Prévia — ${audio.nome}`}
                        className="w-full"
                        style={{ height: getAudioSource(audio) === 'spotify' ? 152 : 180 }}
                        allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
