import { useState, useEffect, useRef } from 'react';
import { Save, Link, Music, Play, Square } from 'lucide-react';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate, ICON_OPTIONS } from '@/types/ceremony';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface StageEditModalProps {
  stage: CeremonyStage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CeremonyStageInsert | CeremonyStageUpdate) => void;
  isNew?: boolean;
}

export function StageEditModal({ stage, isOpen, onClose, onSave, isNew = false }: StageEditModalProps) {
  const [formData, setFormData] = useState({
    nome_simbolico: '',
    descricao: '',
    audio_url: '',
    tempo_padrao: 0,
    icone: 'flame',
  });
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (stage) {
      setFormData({
        nome_simbolico: stage.nome_simbolico,
        descricao: stage.descricao || '',
        audio_url: stage.audio_url || '',
        tempo_padrao: stage.tempo_padrao || 0,
        icone: stage.icone || 'flame',
      });
    } else if (isNew) {
      setFormData({
        nome_simbolico: '',
        descricao: '',
        audio_url: '',
        tempo_padrao: 180,
        icone: 'flame',
      });
    }
  }, [stage, isNew]);

  // Cleanup audio on close
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
  }, [isOpen]);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  const handlePreviewAudio = () => {
    if (!formData.audio_url.trim()) {
      toast({
        title: "URL não informada",
        description: "Insira uma URL de áudio para testar.",
        variant: "destructive",
      });
      return;
    }

    if (isPreviewPlaying) {
      stopPreview();
      return;
    }

    const audio = new Audio(formData.audio_url);
    previewAudioRef.current = audio;

    audio.oncanplaythrough = () => {
      audio.play();
      setIsPreviewPlaying(true);
    };

    audio.onerror = () => {
      toast({
        title: "Erro ao carregar áudio",
        description: "Verifique se a URL é válida e acessível.",
        variant: "destructive",
      });
      stopPreview();
    };

    audio.onended = () => {
      setIsPreviewPlaying(false);
    };

    audio.load();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome_simbolico: formData.nome_simbolico,
      descricao: formData.descricao || null,
      audio_url: formData.audio_url || null,
      tempo_padrao: formData.tempo_padrao,
      icone: formData.icone,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            {isNew ? 'Nova Etapa' : 'Editar Etapa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Nome Simbólico */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nome Simbólico</label>
            <Input
              value={formData.nome_simbolico}
              onChange={(e) => setFormData({ ...formData, nome_simbolico: e.target.value })}
              placeholder="Ex: Acendimento das Luzes"
              required
              className="bg-secondary border-border text-foreground"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Descrição</label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Breve descrição da etapa..."
              rows={2}
              className="bg-secondary border-border text-foreground resize-none"
            />
          </div>

          {/* URL do Áudio */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Music size={14} />
              URL do Áudio (MP3)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={formData.audio_url}
                  onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                  placeholder="https://exemplo.com/audio.mp3"
                  className="bg-secondary border-border text-foreground pl-10"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePreviewAudio}
                className={`shrink-0 ${isPreviewPlaying ? 'border-gold text-gold' : 'border-border text-muted-foreground hover:border-gold/50 hover:text-gold'}`}
                title={isPreviewPlaying ? 'Parar' : 'Testar áudio'}
              >
                {isPreviewPlaying ? <Square size={16} /> : <Play size={16} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole a URL direta do MP3 (Google Drive, S3, CDN, etc.)
            </p>
          </div>

          {/* Tempo Padrão */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Tempo Padrão (minutos)</label>
            <Input
              type="number"
              min="0"
              max="120"
              value={Math.floor(formData.tempo_padrao / 60)}
              onChange={(e) => setFormData({ ...formData, tempo_padrao: parseInt(e.target.value || '0') * 60 })}
              className="bg-secondary border-border text-foreground w-24"
            />
            <p className="text-xs text-muted-foreground">
              0 = tempo livre (sem cronômetro)
            </p>
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icone: icon.value })}
                  className={`
                    p-3 rounded-lg border transition-all duration-200
                    ${formData.icone === icon.value
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-secondary border-border text-muted-foreground hover:border-gold/50'
                    }
                  `}
                  title={icon.label}
                >
                  <CeremonyIcon name={icon.value} size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gold hover:bg-gold-glow text-primary-foreground gap-2"
            >
              <Save size={18} />
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
