import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Play, Square, GripVertical, Music, Upload, Loader2, Link, Youtube, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';


interface AudioItem {
  nome: string;
  audio_url: string;
}

interface AudioListEditorProps {
  audios: AudioItem[];
  onChange: (audios: AudioItem[]) => void;
  maxAudios?: number;
}

type InputMode = 'upload' | 'youtube' | 'library';

export function AudioListEditor({ audios, onChange, maxAudios = Infinity }: AudioListEditorProps) {
  const navigate = useNavigate();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [inputModes, setInputModes] = useState<Map<number, InputMode>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const getInputMode = (index: number): InputMode => {
    return inputModes.get(index) || 'upload';
  };

  const setInputMode = (index: number, mode: InputMode) => {
    setInputModes(new Map(inputModes.set(index, mode)));
  };

  const addAudio = () => {
    if (audios.length >= maxAudios) {
      toast.error(`Máximo de ${maxAudios} áudios permitidos`);
      return;
    }
    onChange([...audios, { nome: '', audio_url: '' }]);
  };

  const removeAudio = (index: number) => {
    stopPreview();
    const newAudios = audios.filter((_, i) => i !== index);
    onChange(newAudios);
  };

  const updateAudio = (index: number, field: keyof AudioItem, value: string) => {
    const newAudios = audios.map((audio, i) => 
      i === index ? { ...audio, [field]: value } : audio
    );
    onChange(newAudios);
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingIndex(null);
  };

  const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isSpotifyUrl = (url: string): boolean => {
    return url.includes('open.spotify.com') || url.startsWith('spotify:');
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const togglePreview = (index: number, url: string) => {
    if (!url.trim()) {
      toast.error('Nenhum áudio/vídeo carregado');
      return;
    }

    // For YouTube, we can't use audio preview - just show a message
    if (isYouTubeUrl(url)) {
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
      } else {
        toast.error('URL do YouTube inválida');
      }
      return;
    }

    // For Spotify, open the link in Spotify
    if (isSpotifyUrl(url)) {
      window.open(url, '_blank');
      return;
    }


    if (playingIndex === index) {
      stopPreview();
      return;
    }

    stopPreview();

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.oncanplaythrough = () => {
      audio.play();
      setPlayingIndex(index);
    };

    audio.onerror = () => {
      toast.error('Erro ao carregar áudio');
      stopPreview();
    };

    audio.onended = () => {
      setPlayingIndex(null);
    };

    audio.load();
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Selecione um arquivo de áudio válido');
      return;
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB');
      return;
    }

    setUploadingIndex(index);

    try {
      const timestamp = Date.now();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${timestamp}-${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('stage-audios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('stage-audios')
        .getPublicUrl(filePath);

      // Auto-fill name if empty
      const audioName = audios[index].nome || file.name.replace(/\.[^/.]+$/, '');
      
      const newAudios = audios.map((audio, i) => 
        i === index ? { nome: audioName, audio_url: urlData.publicUrl } : audio
      );
      onChange(newAudios);

      toast.success('Áudio carregado com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const triggerFileInput = (index: number) => {
    const input = fileInputRefs.current.get(index);
    if (input) {
      input.click();
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Music size={14} className="text-gold" />
          Áudios ({audios.length}{Number.isFinite(maxAudios) ? `/${maxAudios}` : ''})
        </Label>
        {audios.length < maxAudios && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAudio}
            className="gap-1 h-7 text-xs border-gold/30 text-gold hover:bg-gold/10"
          >
            <Plus size={12} />
            Adicionar
          </Button>
        )}
      </div>

      {audios.length === 0 ? (
        <div 
          onClick={addAudio}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-gold/30 transition-colors"
        >
          <Music className="mx-auto mb-2 text-muted-foreground" size={24} />
          <p className="text-sm text-muted-foreground">
            Clique para adicionar um áudio
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {audios.map((audio, index) => {
            const mode = getInputMode(index);
            const hasYouTubeUrl = isYouTubeUrl(audio.audio_url);
            const hasSpotifyUrl = isSpotifyUrl(audio.audio_url);
            
            return (
              <div
                key={index}
                className="bg-secondary/50 rounded-lg p-3 space-y-2 border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Áudio {index + 1}
                  </span>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAudio(index)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>

                <Input
                  value={audio.nome}
                  onChange={(e) => updateAudio(index, 'nome', e.target.value)}
                  placeholder="Nome do áudio (ex: Música de entrada)"
                  className="bg-secondary border-border text-foreground text-sm h-9"
                />

                {/* Mode toggle */}
                <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInputMode(index, 'upload')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-all',
                      mode === 'upload'
                        ? 'bg-gold/20 text-gold font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Upload size={12} />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode(index, 'youtube')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-all',
                      mode === 'youtube'
                        ? 'bg-red-500/20 text-red-500 font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Youtube size={12} />
                    YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode(index, 'spotify')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-all',
                      mode === 'spotify'
                        ? 'bg-green-500/20 text-green-500 font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Disc3 size={12} />
                    Spotify
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/biblioteca')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-all',
                      mode === 'library'
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Library size={12} />
                    Biblioteca
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  accept="audio/*"
                  ref={(el) => {
                    if (el) fileInputRefs.current.set(index, el);
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(index, file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {mode === 'upload' ? (
                  <div className="flex gap-2">
                    {/* Upload button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => triggerFileInput(index)}
                      disabled={uploadingIndex === index}
                      className={cn(
                        'flex-1 gap-2 h-9 transition-all',
                        audio.audio_url && !hasYouTubeUrl
                          ? 'border-gold/50 text-gold bg-gold/5'
                          : 'border-border text-muted-foreground hover:border-gold/30 hover:text-gold'
                      )}
                    >
                      {uploadingIndex === index ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Enviando...
                        </>
                      ) : audio.audio_url && !hasYouTubeUrl ? (
                        <>
                          <Music size={14} />
                          <span className="truncate max-w-[120px]">
                            {audio.nome || 'Áudio carregado'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Selecionar MP3
                        </>
                      )}
                    </Button>

                    {/* Play/Stop button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => togglePreview(index, audio.audio_url)}
                      disabled={!audio.audio_url || hasYouTubeUrl || uploadingIndex === index}
                      className={cn(
                        'shrink-0 h-9 w-9 transition-all',
                        playingIndex === index
                          ? 'border-gold text-gold bg-gold/10'
                          : 'border-border text-muted-foreground hover:border-gold/50 hover:text-gold',
                        (!audio.audio_url || hasYouTubeUrl) && 'opacity-50'
                      )}
                      title={playingIndex === index ? 'Parar' : 'Testar áudio'}
                    >
                      {playingIndex === index ? <Square size={14} /> : <Play size={14} />}
                    </Button>
                  </div>
                ) : mode === 'youtube' ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Youtube className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500" size={14} />
                      <Input
                        value={hasYouTubeUrl ? audio.audio_url : ''}
                        onChange={(e) => updateAudio(index, 'audio_url', e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="bg-secondary border-border text-foreground text-sm h-9 pl-9"
                      />
                    </div>
                    {/* Open YouTube button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => togglePreview(index, audio.audio_url)}
                      disabled={!audio.audio_url || !hasYouTubeUrl}
                      className={cn(
                        'shrink-0 h-9 w-9 transition-all',
                        hasYouTubeUrl
                          ? 'border-red-500/50 text-red-500 hover:bg-red-500/10'
                          : 'border-border text-muted-foreground opacity-50'
                      )}
                      title="Abrir no YouTube"
                    >
                      <Play size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Disc3 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-500" size={14} />
                      <Input
                        value={hasSpotifyUrl ? audio.audio_url : ''}
                        onChange={(e) => updateAudio(index, 'audio_url', e.target.value)}
                        placeholder="https://open.spotify.com/track/..."
                        className="bg-secondary border-border text-foreground text-sm h-9 pl-9"
                      />
                    </div>
                    {/* Open Spotify button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => togglePreview(index, audio.audio_url)}
                      disabled={!audio.audio_url || !hasSpotifyUrl}
                      className={cn(
                        'shrink-0 h-9 w-9 transition-all',
                        hasSpotifyUrl
                          ? 'border-green-500/50 text-green-500 hover:bg-green-500/10'
                          : 'border-border text-muted-foreground opacity-50'
                      )}
                      title="Abrir no Spotify"
                    >
                      <Play size={14} />
                    </Button>
                  </div>
                )}

                {audio.audio_url && (
                  <div className="flex items-center gap-1.5">
                    {hasYouTubeUrl ? (
                      <Youtube size={10} className="text-red-500 shrink-0" />
                    ) : hasSpotifyUrl ? (
                      <Disc3 size={10} className="text-green-500 shrink-0" />
                    ) : (
                      <Music size={10} className="text-gold shrink-0" />
                    )}
                    <p className="text-[10px] text-muted-foreground truncate">
                      {audio.audio_url}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {audios.length > 0 && audios.length < maxAudios && (
        <Button
          type="button"
          variant="outline"
          onClick={addAudio}
          className="w-full gap-2 border-dashed border-border text-muted-foreground hover:border-gold/30 hover:text-gold"
        >
          <Plus size={16} />
          Adicionar mais áudio
        </Button>
      )}

      <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Dicas:</strong>
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 pl-5">
          <li>• <strong>Upload:</strong> Formatos MP3, WAV, OGG (máx 20MB)</li>
          <li>• <strong>YouTube:</strong> Cole o link do vídeo diretamente</li>
          
          <li>• <strong>Biblioteca:</strong> Reutilize áudios salvos anteriormente</li>
        </ul>
      </div>

    </div>
  );
}
