import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, Square, Music2, GripVertical, Volume2, VolumeX, Repeat, Repeat1, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useAllStageAudios } from '@/hooks/useStageAudios';

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MARGIN = 16;

export function MiniPlayer() {
  const { stages } = useStages();
  const { sections } = useSections();
  const { audiosByStageId } = useAllStageAudios();
  const location = useLocation();
  const isMainSection = location.pathname === '/' || location.pathname.startsWith('/secao');
  const {
    currentStageId,
    currentUrl,
    status,
    currentTime,
    duration,
    volume,
    setVolume,
    pause,
    resume,
    stop,
    loopEnabled,
    setLoopEnabled,
  } = useUniversalAudioPlayer();

  const cardRef = useRef<HTMLDivElement>(null);
  // null = not yet positioned (defaults to bottom-right via CSS)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = cardRef.current;
    const w = el?.offsetWidth ?? 320;
    const h = el?.offsetHeight ?? 96;
    const maxX = window.innerWidth - w - MARGIN;
    const maxY = window.innerHeight - h - MARGIN;
    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    };
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.current) return;
      const next = clamp(e.clientX - dragState.current.dx, e.clientY - dragState.current.dy);
      setPos(next);
    },
    [clamp]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Keep inside viewport on resize
  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos, clamp]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // Próxima música quando reprodução contínua está ativa na seção atual
  const nextTrackName = useMemo(() => {
    const currentStage = stages.find((s) => s.id === currentStageId);
    if (!currentStage) return null;
    const section = sections.find((s) => s.id === currentStage.secao_id);
    if (!section || !(section as any).reproducao_continua) return null;

    const sectionStages = stages
      .filter((s) => s.secao_id === section.id)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const queue: Array<{ stageId: string; url: string }> = [];
    sectionStages.forEach((stg) => {
      (audiosByStageId[stg.id] || []).forEach((audio) => {
        queue.push({ stageId: stg.id, url: audio.audio_url });
      });
    });
    const idx = queue.findIndex(
      (q) => q.stageId === currentStageId && q.url === currentUrl
    );
    if (idx === -1 || idx + 1 >= queue.length) return null;
    const next = queue[idx + 1];
    const nextStage = stages.find((s) => s.id === next.stageId);
    return nextStage?.nome_simbolico || 'Próxima música';
  }, [stages, sections, audiosByStageId, currentStageId, currentUrl]);

  const isActive = status === 'playing' || status === 'paused';
  if (!isActive) return null;

  const stage = stages.find((s) => s.id === currentStageId);
  const name = stage?.nome_simbolico || 'Reproduzindo';

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: MARGIN, bottom: MARGIN };

  return (
    <div
      ref={cardRef}
      role="region"
      aria-label="Reprodução de áudio em segundo plano"
      style={{ position: 'fixed', touchAction: 'none', ...positionStyle }}
      className="z-[2147483647] w-[min(20rem,calc(100vw-2rem))] animate-fade-in"
    >
      <div className="bg-card/95 backdrop-blur-md border border-gold/30 rounded-2xl shadow-xl shadow-gold/10 overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          <button
            onPointerDown={onPointerDown}
            aria-label="Arrastar player"
            title="Arraste para mover"
            className="shrink-0 -ml-1 p-1 text-muted-foreground/60 hover:text-gold cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>

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
              className={`h-10 w-10 ${loopEnabled ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}
              onClick={() => setLoopEnabled(!loopEnabled)}
              aria-label={loopEnabled ? 'Desativar repetição' : 'Repetir música'}
              aria-pressed={loopEnabled}
              title={loopEnabled ? 'Repetição ativada' : 'Repetir música'}
            >
              {loopEnabled ? <Repeat1 size={18} aria-hidden="true" /> : <Repeat size={18} aria-hidden="true" />}
            </Button>
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

        {nextTrackName && (
          <div className="flex items-center gap-1.5 px-3 pb-2 -mt-1">
            <Repeat size={12} className="shrink-0 text-gold" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
              A seguir
            </span>
            <ArrowRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-medium text-foreground truncate">
              {nextTrackName}
            </span>
          </div>
        )}



        {isMainSection && (
          <div className="flex items-center gap-2 px-3 pb-3">
            <button
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="shrink-0 text-muted-foreground hover:text-gold transition-colors"
              aria-label={volume === 0 ? 'Ativar som' : 'Silenciar'}
            >
              {volume === 0 ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
            <Slider
              value={[Math.round(volume * 100)]}
              onValueChange={(values) => setVolume(values[0] / 100)}
              max={100}
              step={1}
              className="flex-1"
              aria-label="Volume"
            />
            <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}



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
