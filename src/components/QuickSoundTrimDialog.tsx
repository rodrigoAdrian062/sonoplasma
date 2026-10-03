import { useEffect, useRef, useState } from 'react';
import { Check, Play, Scissors, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { QuickSoundData } from '@/lib/quickSounds';

interface QuickSoundTrimDialogProps {
  sound: QuickSoundData | null;
  volume: number;
  onOpenChange: (open: boolean) => void;
  onSave: (startSeconds: number | undefined, endSeconds: number | undefined) => void;
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = (safeSeconds % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${remainder}`;
}

function mediaErrorText(audio: HTMLAudioElement): string {
  switch (audio.error?.code) {
    case 1: return 'reprodução cancelada.';
    case 2: return 'falha de rede ao baixar o arquivo.';
    case 3: return 'arquivo de áudio corrompido.';
    case 4: return 'formato não suportado pelo navegador.';
    default: return 'erro desconhecido.';
  }
}

export function QuickSoundTrimDialog({
  sound,
  volume,
  onOpenChange,
  onSave,
}: QuickSoundTrimDialogProps) {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!sound) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    setLoading(true);
    setError(null);

    const handleLoadedMetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        setError('Não foi possível identificar a duração deste áudio.');
        setLoading(false);
        return;
      }

      const audioDuration = audio.duration;
      const start = Math.min(sound.trimStartSeconds ?? 0, audioDuration);
      const end = Math.min(sound.trimEndSeconds ?? audioDuration, audioDuration);
      const minimumGap = Math.min(0.1, audioDuration);
      const safeStart = Math.min(start, Math.max(0, audioDuration - minimumGap));
      const safeEnd = Math.max(safeStart + minimumGap, end);

      setDuration(audioDuration);
      setStartTime(safeStart);
      setEndTime(Math.min(audioDuration, safeEnd));
      setLoading(false);
    };

    const handleError = () => {
      setError(`Não foi possível carregar este áudio: ${mediaErrorText(audio)}`);
      setLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.src = sound.url;
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [sound]);

  useEffect(() => () => {
    previewAudioRef.current?.pause();
  }, []);

  const stopPreview = () => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    previewAudioRef.current = null;
    setPreviewing(false);
  };

  const close = () => {
    stopPreview();
    onOpenChange(false);
  };

  const togglePreview = () => {
    if (!sound || loading || error) return;
    if (previewing) {
      stopPreview();
      return;
    }

    stopPreview();
    const audio = new Audio(sound.url);
    audio.preload = 'auto';
    audio.volume = volume;

    const startPreview = () => {
      if (audio !== previewAudioRef.current) return;
      audio.currentTime = startTime;
      audio.play().catch((playError: unknown) => {
        if (audio !== previewAudioRef.current || (playError instanceof DOMException && playError.name === 'AbortError')) return;
        setPreviewing(false);
        toast.error('Não foi possível reproduzir a prévia do trecho.');
      });
    };

    audio.onloadedmetadata = startPreview;
    audio.ontimeupdate = () => {
      if (audio.currentTime < endTime) return;
      stopPreview();
    };
    audio.onended = stopPreview;
    audio.onerror = () => {
      if (audio !== previewAudioRef.current) return;
      stopPreview();
      toast.error(`Não foi possível ouvir a prévia: ${mediaErrorText(audio)}`);
    };
    previewAudioRef.current = audio;
    setPreviewing(true);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) startPreview();
  };

  const save = (clear = false) => {
    if (!duration || loading || error) return;
    if (!clear && endTime <= startTime) {
      toast.error('O fim do trecho precisa ser depois do início.');
      return;
    }
    const start = clear || startTime <= 0 ? undefined : startTime;
    const end = clear || endTime >= duration - 0.05 ? undefined : endTime;
    close();
    onSave(start, end);
  };

  return (
    <Dialog
      open={!!sound}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="bg-card border-gold/20 max-w-lg w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold">
            <Scissors size={18} />
            Cortar som rápido
          </DialogTitle>
          {sound && <p className="text-sm text-muted-foreground truncate">{sound.nome}</p>}
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando duração do áudio…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Selecione o início e o fim do trecho. O arquivo original não será alterado.
            </p>
            <div className="space-y-4 rounded-xl border border-gold/15 bg-black/20 p-4">
              <Slider
                value={[startTime, endTime]}
                min={0}
                max={duration}
                step={0.1}
                minStepsBetweenThumbs={1}
                disabled={!duration}
                onValueChange={([start, end]) => {
                  stopPreview();
                  setStartTime(start);
                  setEndTime(end);
                }}
                aria-label="Início e fim do trecho"
              />
              <div className="flex justify-between gap-4 text-xs">
                <Label className="flex flex-col gap-1 text-muted-foreground">
                  Início
                  <span className="font-mono text-sm text-foreground">{formatTime(startTime)}</span>
                </Label>
                <Label className="flex flex-col items-end gap-1 text-muted-foreground">
                  Fim
                  <span className="font-mono text-sm text-foreground">{formatTime(endTime)}</span>
                </Label>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0:00.0</span>
                <span>Duração: {formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePreview}
                disabled={!duration || !!error}
                className="border-gold/30 text-gold hover:bg-gold/10"
              >
                {previewing ? <Square size={14} className="mr-2" /> : <Play size={14} className="mr-2" />}
                {previewing ? 'Parar prévia' : 'Ouvir trecho'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => save(true)} disabled={!duration}>
                  Restaurar original
                </Button>
                <Button type="button" size="sm" onClick={() => save()} disabled={!duration || !!error}>
                  <Check size={14} className="mr-2" />
                  Salvar corte
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
