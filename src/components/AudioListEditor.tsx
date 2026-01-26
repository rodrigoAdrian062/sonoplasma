import { useState, useRef } from 'react';
import { Plus, Trash2, Play, Square, GripVertical, Music, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AudioItem {
  nome: string;
  audio_url: string;
}

interface AudioListEditorProps {
  audios: AudioItem[];
  onChange: (audios: AudioItem[]) => void;
  maxAudios?: number;
}

export function AudioListEditor({ audios, onChange, maxAudios = 5 }: AudioListEditorProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const togglePreview = (index: number, url: string) => {
    if (!url.trim()) {
      toast.error('Insira uma URL de áudio');
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
      toast.error('Erro ao carregar áudio. Verifique a URL.');
      stopPreview();
    };

    audio.onended = () => {
      setPlayingIndex(null);
    };

    audio.load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Music size={14} className="text-gold" />
          Áudios ({audios.length}/{maxAudios})
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
          {audios.map((audio, index) => (
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

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                  <Input
                    value={audio.audio_url}
                    onChange={(e) => updateAudio(index, 'audio_url', e.target.value)}
                    placeholder="https://exemplo.com/audio.mp3"
                    className="bg-secondary border-border text-foreground text-sm h-9 pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => togglePreview(index, audio.audio_url)}
                  className={cn(
                    'shrink-0 h-9 w-9 transition-all',
                    playingIndex === index
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-border text-muted-foreground hover:border-gold/50 hover:text-gold'
                  )}
                  title={playingIndex === index ? 'Parar' : 'Testar áudio'}
                >
                  {playingIndex === index ? <Square size={14} /> : <Play size={14} />}
                </Button>
              </div>
            </div>
          ))}
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
          💡 <strong>Dica:</strong> Use links diretos de MP3
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 pl-5">
          <li>• Google Drive: converta para link direto</li>
          <li>• Dropbox: altere dl=0 para dl=1</li>
        </ul>
      </div>
    </div>
  );
}
