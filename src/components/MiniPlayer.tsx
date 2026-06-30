import { Play, Pause, Square, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useStages } from '@/hooks/useStages';

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const { stages } = useStages();
  const {
    currentStageId,
    status,
    currentTime,
    duration,
    pause,
    resume,
    stop,
  } = useUniversalAudioPlayer();

  const isActive = status === 'playing' || status === 'paused';

  if (!isActive) return null;

  const stage = stages.find((s) => s.id === currentStageId);
  const name = stage?.nome_simbolico || 'Reproduzindo';
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      role="region"
      aria-label="Reprodução de áudio em segundo plano"
      className="fixed bottom-4 right-4 z-[2147483647] w-[min(20rem,calc(100vw-2rem))] animate-fade-in"
    >
      <div className="bg-card/95 backdrop-blur-md border border-gold/30 rounded-2xl shadow-xl shadow-gold/10 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <div className="relative shrink-0 p-2.5 bg-gold/10 rounded-xl">
            <Music2 size={20} className="text-gold" aria-hidden="true" />
            {status === 'playing' && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gold rounded-full animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {status === 'playing' ? 'Tocando' : 'Pausado'}
            </p>
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-foreground hover:text-gold"
              onClick={() => (status === 'playing' ? pause() : resume())}
              aria-label={status === 'playing' ? 'Pausar' : 'Retomar'}
            >
              {status === 'playing' ? (
                <Pause size={20} aria-hidden="true" />
              ) : (
                <Play size={20} aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              onClick={() => stop()}
              aria-label="Parar e sair"
            >
              <Square size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
