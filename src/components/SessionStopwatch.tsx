import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_MINUTES = 5;
const STORAGE_KEY = 'sonoplastia:timerMinutes';

function formatStopwatch(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function readMinutes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= 180) return Math.round(n);
  } catch {
    /* ignore */
  }
  return DEFAULT_MINUTES;
}

export function SessionStopwatch() {
  const [minutes, setMinutes] = useState<number>(() => readMinutes());
  const [remaining, setRemaining] = useState<number>(() => readMinutes() * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const applyMinutes = useCallback((value: number) => {
    const clamped = Math.min(180, Math.max(1, Math.round(value)));
    setMinutes(clamped);
    setRemaining(clamped * 60);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggle = useCallback(() => {
    setIsRunning((prev) => {
      if (!prev && remaining <= 0) setRemaining(minutes * 60);
      return !prev;
    });
  }, [remaining, minutes]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setRemaining(minutes * 60);
  }, [minutes]);

  const commitDraft = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) applyMinutes(n);
    setEditing(false);
  };

  const isEnded = remaining === 0;

  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-card/80 border border-gold/20 rounded-xl shadow-[0_0_12px_rgba(212,175,55,0.08)]">
      <Timer size={14} className="text-gold/70 shrink-0" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyMinutes(minutes - 1)}
        className="h-6 w-6 text-muted-foreground hover:text-gold"
        title="Diminuir 1 minuto">
        <Minus size={12} />
      </Button>

      {editing ?
        <input
          autoFocus
          type="number"
          min={1}
          max={180}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-14 bg-transparent border-b border-gold/40 text-sm font-mono font-semibold text-gold text-center outline-none" /> :

        <button
          onClick={() => {
            setDraft(String(minutes));
            setEditing(true);
          }}
          title="Clique para definir os minutos"
          className={cn(
            'text-sm font-mono font-semibold tracking-wider tabular-nums px-1',
            isEnded ? 'text-destructive animate-pulse' : isRunning ? 'text-gold' : 'text-gold/60'
          )}>
          {formatStopwatch(remaining)}
        </button>
      }

      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyMinutes(minutes + 1)}
        className="h-6 w-6 text-muted-foreground hover:text-gold"
        title="Aumentar 1 minuto">
        <Plus size={12} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          'h-6 w-6',
          isRunning ? 'text-gold hover:text-gold/80' : 'text-muted-foreground hover:text-gold'
        )}
        title={isRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'}>
        {isRunning ? <Pause size={12} /> : <Play size={12} />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        title="Zerar cronômetro">
        <RotateCcw size={12} />
      </Button>
    </div>);

}
