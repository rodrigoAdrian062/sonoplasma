import { useState, useRef, useMemo } from 'react';
import {
  Search, Music, Play, Square, Check, Plus, Upload,
  Loader2, Link as LinkIcon, X, Folder, ChevronLeft, Library,
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';

import { FolderMusicIcon } from '@/components/icons/FolderMusicIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';

interface AudioItem {
  nome: string;
  audio_url: string;
}

interface AudioPickerProps {
  audios: AudioItem[];
  onChange: (audios: AudioItem[]) => void;
  maxAudios?: number;
}

type AddMode = 'upload' | 'youtube' | 'spotify' | 'link';

const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');

function SourceIcon({ url, size = 14 }: { url: string; size?: number }) {
  if (isYouTubeUrl(url)) return <YoutubeIcon size={size} />;
  return <FolderMusicIcon size={size} />;
}

export function AudioPicker({ audios, onChange, maxAudios = Infinity }: AudioPickerProps) {
  const { audios: library, isLoading, uploadAndAddAudio, addAudio } = useAudioLibrary();
  const { folders } = useAudioFolders();

  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingUrl(null);
  };

  const togglePreview = (url: string) => {
    if (isYouTubeUrl(url)) {
      window.open(url, '_blank');
      return;
    }
    if (playingUrl === url) {
      stopPreview();
      return;
    }
    stopPreview();
    const el = new Audio(url);
    audioRef.current = el;
    el.play().then(() => setPlayingUrl(url)).catch(() => toast.error('Erro ao tocar áudio'));
    el.onended = () => setPlayingUrl(null);
  };

  const toggleSelect = (item: AudioItem) => {
    if (selectedUrls.has(item.audio_url)) {
      onChange(audios.filter((a) => a.audio_url !== item.audio_url));
    } else {
      if (atMax) {
        toast.error(`Máximo de ${maxAudios} áudios`);
        return;
      }
      onChange([...audios, { nome: item.nome, audio_url: item.audio_url }]);
    }
  };

  const removeSelected = (url: string) => {
    onChange(audios.filter((a) => a.audio_url !== url));
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
          if (!atMax && res?.audio_url) {
            onChange([...audios, { nome: res.nome, audio_url: res.audio_url }]);
          }
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
    const tipo = isYouTubeUrl(newUrl) ? 'youtube' : 'external';
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
    <div className="space-y-3">
      {/* Selected chips */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Check size={13} className="text-gold" />
            Selecionados ({audios.length}{Number.isFinite(maxAudios) ? `/${maxAudios}` : ''})
          </span>
        </div>
        {audios.length === 0 ? (
          <p className="text-xs text-muted-foreground">Toque em uma faixa abaixo para adicionar.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {audios.map((a) => (
              <div
                key={a.audio_url}
                className="flex items-center gap-1.5 rounded-full bg-secondary pl-2 pr-1 py-1 text-xs"
              >
                <SourceIcon url={a.audio_url} size={11} />
                <span className="max-w-[120px] truncate text-foreground">{a.nome || 'Áudio'}</span>
                <button
                  type="button"
                  onClick={() => removeSelected(a.audio_url)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar na biblioteca..."
          className="bg-secondary border-border pl-9 h-9 text-sm"
        />
      </div>

      {/* Folder nav */}
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
      {!search && !currentFolderId && folders.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
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

      {/* Library grid */}
      <ScrollArea className="max-h-64">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gold" size={22} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
            <Library size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {search ? 'Nenhum áudio encontrado' : currentFolderId ? 'Pasta vazia' : 'Biblioteca vazia'}
            </p>
            <p className="text-[10px] mt-0.5">Adicione um novo áudio abaixo.</p>
          </div>
        ) : (
          <div className="space-y-1.5 pr-2">
            {filtered.map((item) => {
              const selected = selectedUrls.has(item.audio_url);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition-all',
                    selected
                      ? 'border-gold bg-gold/10'
                      : 'border-border/50 bg-card/50 hover:border-gold/40 hover:bg-card'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                      selected ? 'border-gold bg-gold text-background' : 'border-border'
                    )}
                  >
                    {selected && <Check size={13} />}
                  </div>
                  <div className="rounded-md bg-secondary p-1.5 shrink-0">
                    <SourceIcon url={item.audio_url} />
                  </div>
                  <span className="flex-1 truncate text-sm text-foreground">{item.nome}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(item.audio_url);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-gold hover:bg-gold/10"
                    title="Ouvir"
                  >
                    {playingUrl === item.audio_url ? <Square size={14} /> : <Play size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Add new */}
      <div className="rounded-xl border border-border bg-secondary/30 p-3">
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
                { id: 'youtube', label: 'YouTube', icon: YoutubeIcon },
                
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                    addMode === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : addMode === 'spotify'
                      ? 'https://open.spotify.com/track/...'
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
              onClick={() => {
                setShowAdd(false);
                setNewName('');
                setNewUrl('');
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
