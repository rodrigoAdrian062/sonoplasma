import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Music, Trash2, Play, Pause, Upload, Plus, Library, ExternalLink,
  Youtube, Loader2, Download, CheckSquare, Square, X, ArrowLeft, FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';

export default function AudioLibraryPage() {
  const navigate = useNavigate();
  const { audios, isLoading, deleteAudio, uploadAndAddAudio, addAudio } = useAudioLibrary();
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
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isYouTubeUrl = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be');

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
      newAudio.onended = () => { setPlayingId(null); setAudioElement(null); };
      setAudioElement(newAudio);
      setPlayingId(audio.id);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(f.name));
    if (audioFiles.length === 0) { toast({ title: 'Nenhum arquivo de áudio encontrado na seleção', variant: 'destructive' }); return; }
    setIsUploading(true);
    let successCount = 0;
    try {
      for (const file of audioFiles) {
        const name = audioFiles.length === 1 && newAudioName
          ? newAudioName
          : file.name.replace(/\.[^/.]+$/, '');
        try {
          await uploadAndAddAudio(file, name);
          successCount++;
        } catch { /* handled by hook */ }
      }
      if (successCount > 0) toast({ title: `${successCount} áudio(s) adicionado(s) à biblioteca` });
      setNewAudioName('');
      setShowAddForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
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
    } catch { /* handled by hook */ }
  };

  const handleDownloadAll = async () => {
    const downloadableAudios = audios.filter(
      (a) => a.tipo !== 'youtube' && !isYouTubeUrl(a.audio_url)
    );
    if (downloadableAudios.length === 0) {
      toast({ title: 'Nenhum áudio disponível para download', variant: 'destructive' });
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
        } catch { /* skip */ }
      }
      if (count === 0) { toast({ title: 'Não foi possível baixar os áudios', variant: 'destructive' }); return; }
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === audios.length ? new Set() : new Set(audios.map((a) => a.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    let count = 0;
    for (const id of selectedIds) {
      try { await deleteAudio.mutateAsync(id); count++; } catch { /* */ }
    }
    toast({ title: `${count} áudio(s) removido(s)` });
    setSelectedIds(new Set());
    setBulkDeleteMode(false);
    setIsDeletingBulk(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </Button>
          <Library className="text-gold" size={22} />
          <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground flex-1">
            Biblioteca de Áudios
          </h1>

          {audios.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2">
              {bulkDeleteMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === audios.length ? <CheckSquare size={14} className="mr-1" /> : <Square size={14} className="mr-1" />}
                    <span className="hidden sm:inline">{selectedIds.size === audios.length ? 'Desmarcar' : 'Todos'}</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.size === 0 || isDeletingBulk}>
                    {isDeletingBulk ? <Loader2 className="animate-spin mr-1" size={14} /> : <Trash2 size={14} className="mr-1" />}
                    Excluir ({selectedIds.size})
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setBulkDeleteMode(false); setSelectedIds(new Set()); }}>
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setBulkDeleteMode(true)}>
                    <CheckSquare size={14} className="mr-1" />
                    <span className="hidden sm:inline">Selecionar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
                    {isDownloadingAll ? <Loader2 className="animate-spin mr-1" size={14} /> : <Download size={14} className="mr-1" />}
                    <span className="hidden sm:inline">{isDownloadingAll ? 'Baixando...' : 'Baixar'}</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container py-4 sm:py-6 space-y-4 max-w-3xl mx-auto">
        {/* Add Audio Section */}
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
                  <Upload size={14} className="mr-1" /> Upload
                </Button>
                <Button
                  variant={addMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddMode('url')}
                  className={addMode === 'url' ? 'bg-gold hover:bg-gold-glow text-background' : ''}
                >
                  <ExternalLink size={14} className="mr-1" /> URL / YouTube
                </Button>
              </div>
              <Input
                placeholder="Nome do áudio (opcional para múltiplos)"
                value={newAudioName}
                onChange={(e) => setNewAudioName(e.target.value)}
              />
              {addMode === 'upload' ? (
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileSelect} className="hidden" />
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    {...{ webkitdirectory: '', directory: '' } as any}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1">
                    {isUploading ? (<><Loader2 className="animate-spin mr-2" size={16} />Enviando...</>) : (<><Upload size={16} className="mr-2" />Arquivo(s)</>)}
                  </Button>
                  <Button variant="outline" onClick={() => folderInputRef.current?.click()} disabled={isUploading} className="flex-1">
                    <FolderOpen size={16} className="mr-2" />Pasta
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="URL do áudio ou YouTube" value={newAudioUrl} onChange={(e) => setNewAudioUrl(e.target.value)} className="flex-1" />
                  <Button onClick={handleAddUrl} disabled={!newAudioUrl.trim() || !newAudioName.trim() || addAudio.isPending} className="bg-gold hover:bg-gold-glow text-background">
                    {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewAudioName(''); setNewAudioUrl(''); }} className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Audio List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gold" size={28} />
          </div>
        ) : audios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">Nenhum áudio na biblioteca</p>
            <p className="text-sm mt-1">Adicione áudios para reutilizá-los em várias etapas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {audios.map((audio) => (
              <div
                key={audio.id}
                className={cn(
                  'flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors',
                  bulkDeleteMode && 'cursor-pointer',
                  bulkDeleteMode && selectedIds.has(audio.id) && 'border-destructive/50 bg-destructive/5'
                )}
                onClick={bulkDeleteMode ? () => toggleSelectId(audio.id) : undefined}
              >
                {bulkDeleteMode && (
                  <Checkbox
                    checked={selectedIds.has(audio.id)}
                    onCheckedChange={() => toggleSelectId(audio.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="p-2 bg-gold/10 rounded-lg shrink-0">
                  {audio.tipo === 'youtube' || isYouTubeUrl(audio.audio_url) ? (
                    <Youtube size={18} className="text-red-500" />
                  ) : (
                    <Music size={18} className="text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{audio.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {audio.tipo === 'youtube' ? 'YouTube' : formatFileSize(audio.tamanho_bytes) || 'Link externo'}
                  </p>
                </div>
                {!bulkDeleteMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handlePlay(audio); }} className="h-8 w-8 sm:h-9 sm:w-9">
                      {playingId === audio.id ? <Pause size={16} className="text-gold" /> : <Play size={16} className="text-gold" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteAudio.mutate(audio.id); }} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
