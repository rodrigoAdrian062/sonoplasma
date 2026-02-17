import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatStopwatch(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SessionStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleToggle = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 border border-gold/20 rounded-xl shadow-[0_0_12px_rgba(212,175,55,0.08)]">
      <Timer size={14} className="text-gold/70 shrink-0" />
      <span
        className={cn(
          'text-sm font-mono font-semibold tracking-wider tabular-nums',
          isRunning ? 'text-gold' : 'text-gold/60'
        )}
      >
        {formatStopwatch(elapsed)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          'h-6 w-6',
          isRunning
            ? 'text-gold hover:text-gold/80'
            : 'text-muted-foreground hover:text-gold'
        )}
        title={isRunning ? 'Pausar sessão' : 'Iniciar sessão'}
      >
        {isRunning ? <Pause size={12} /> : <Play size={12} />}
      </Button>
      {elapsed > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          title="Zerar cronômetro"
        >
          <RotateCcw size={12} />
        </Button>
      )}
    </div>
  );
}
