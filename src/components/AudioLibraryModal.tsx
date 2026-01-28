import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { Music, Trash2, Play, Pause, Upload, Plus, Library, ExternalLink, Youtube, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudio?: (audio: { nome: string; audio_url: string }) => void;
  selectionMode?: boolean;
}

export function AudioLibraryModal({ isOpen, onClose, onSelectAudio, selectionMode = false }: AudioLibraryModalProps) {
  const { audios, isLoading, deleteAudio, uploadAndAddAudio, addAudio } = useAudioLibrary();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newAudioName, setNewAudioName] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const file = e.target.files?.[0];
    if (!file) return;

    const name = newAudioName || file.name.replace(/\.[^/.]+$/, '');
    setIsUploading(true);

    try {
      await uploadAndAddAudio(file, name);
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

  const handleClose = () => {
    audioElement?.pause();
    setPlayingId(null);
    setAudioElement(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="text-gold" size={20} />
            {selectionMode ? 'Selecionar da Biblioteca' : 'Biblioteca de Áudios'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
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
                    placeholder="Nome do áudio"
                    value={newAudioName}
                    onChange={(e) => setNewAudioName(e.target.value)}
                  />

                  {addMode === 'upload' ? (
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
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
                            Selecionar arquivo
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

          {/* Audio List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gold" size={24} />
              </div>
            ) : audios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music size={40} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum áudio na biblioteca</p>
                <p className="text-xs mt-1">Adicione áudios para reutilizá-los em várias etapas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audios.map((audio) => (
                  <div
                    key={audio.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors',
                      selectionMode && 'cursor-pointer hover:border-gold/50'
                    )}
                    onClick={selectionMode ? () => handleSelect(audio) : undefined}
                  >
                    <div className="p-2 bg-gold/10 rounded-lg">
                      {audio.tipo === 'youtube' || isYouTubeUrl(audio.audio_url) ? (
                        <Youtube size={18} className="text-red-500" />
                      ) : (
                        <Music size={18} className="text-gold" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{audio.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {audio.tipo === 'youtube' ? 'YouTube' : formatFileSize(audio.tamanho_bytes) || 'Link externo'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectionMode ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gold hover:text-gold-glow"
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
                              <Pause size={16} className="text-gold" />
                            ) : (
                              <Play size={16} className="text-gold" />
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
