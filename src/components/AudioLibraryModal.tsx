import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { Music, Trash2, Play, Pause, Upload, Plus, Library, ExternalLink, Youtube, Loader2, Download, CheckSquare, Square, X, Folder, ChevronLeft } from 'lucide-react';
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
}

export function AudioLibraryModal({ isOpen, onClose, onSelectAudio, selectionMode = false }: AudioLibraryModalProps) {
  const { audios, isLoading, deleteAudio, uploadAndAddAudio, addAudio } = useAudioLibrary();
  const { folders } = useAudioFolders();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
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
  const filteredAudios = useMemo(() => 
    audios.filter(a => (a as any).pasta_id === currentFolderId),
    [audios, currentFolderId]
  );

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
    if (isYouTubeUrl(audio.audio_url)) {
      window.open(audio.audio_url, '_blank');
      return;
    }

    if (playingId === audio.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const newAudio = new Audio(audio.audio_url);
      newAudio.play();
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
    setBulkDeleteMode(false);
    setSelectedIds(new Set());
    setCurrentFolderId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
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

          {/* Folder Navigation (selection mode) */}
          {selectionMode && !currentFolderId && folders.length > 0 && (
            <div className="space-y-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors cursor-pointer hover:border-primary/50"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Folder size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{folder.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {audios.filter(a => (a as any).pasta_id === folder.id).length} áudio(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Back button for folder navigation */}
          {selectionMode && currentFolderId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolderId(null)}
              className="mb-1"
            >
              <ChevronLeft size={14} className="mr-1" />
              {currentFolder?.nome || 'Voltar'}
            </Button>
          )}

          {/* Audio List */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : filteredAudios.length === 0 && (selectionMode ? currentFolderId !== null : true) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music size={40} className="mx-auto mb-2 opacity-50" />
                <p>{currentFolderId ? 'Nenhum áudio nesta pasta' : 'Nenhum áudio na biblioteca'}</p>
                <p className="text-xs mt-1">Adicione áudios para reutilizá-los em várias etapas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAudios.map((audio) => (
                  <div
                    key={audio.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors',
                      selectionMode && 'cursor-pointer hover:border-primary/50',
                      bulkDeleteMode && 'cursor-pointer',
                      bulkDeleteMode && selectedIds.has(audio.id) && 'border-destructive/50 bg-destructive/5'
                    )}
                    onClick={
                      selectionMode
                        ? () => handleSelect(audio)
                        : bulkDeleteMode
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
                      {audio.tipo === 'youtube' || isYouTubeUrl(audio.audio_url) ? (
                        <Youtube size={18} className="text-destructive" />
                      ) : (
                        <Music size={18} className="text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{audio.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {audio.tipo === 'youtube' ? 'YouTube' : formatFileSize(audio.tamanho_bytes) || 'Link externo'}
                      </p>
                    </div>

                    {!bulkDeleteMode && (
                      <div className="flex items-center gap-1">
                        {selectionMode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                          >
                            Selecionar
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlay(audio);
                              }}
                              className="h-8 w-8"
                            >
                              {playingId === audio.id ? (
                                <Pause size={16} className="text-primary" />
                              ) : (
                                <Play size={16} className="text-primary" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAudio.mutate(audio.id);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
