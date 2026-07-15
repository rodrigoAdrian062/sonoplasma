import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Music2, X, GripVertical } from 'lucide-react';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { useIsPresentationActive } from '@/lib/presentationState';
import { useBackgroundMusic } from '@/contexts/BackgroundMusicContext';
import { cn } from '@/lib/utils';

const COLLAPSED_KEY = 'bg-music-collapsed-v1';
const POSITION_KEY = 'bg-music-position-v2';

interface Position {
  // stored as distance from right/top in px
  right: number;
  top: number;
}

const DEFAULT_POS: Position = { right: 12, top: 12 };

function loadPosition(): Position {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return DEFAULT_POS;
    const p = JSON.parse(raw);
    if (typeof p?.right === 'number' && typeof p?.top === 'number') return p;
  } catch {}
  return DEFAULT_POS;
}

export function FloatingBackgroundMusic() {
  const location = useLocation();
  const isPresentation = useIsPresentationActive();
  const { isPlaying } = useBackgroundMusic();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true'
  );
  const [pos, setPos] = useState<Position>(loadPosition);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startTop: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const toggleCollapsed = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem(COLLAPSED_KEY, String(v));
  };

  const clampAndSave = useCallback((next: Position) => {
    const el = containerRef.current;
    const w = el?.offsetWidth ?? 40;
    const h = el?.offsetHeight ?? 40;
    const maxRight = Math.max(0, window.innerWidth - w - 4);
    const maxTop = Math.max(0, window.innerHeight - h - 4);
    const clamped: Position = {
      right: Math.min(maxRight, Math.max(4, next.right)),
      top: Math.min(maxTop, Math.max(4, next.top)),
    };
    setPos(clamped);
    localStorage.setItem(POSITION_KEY, JSON.stringify(clamped));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only start drag from the handle button
    const el = containerRef.current;
    if (!el) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startTop: pos.top,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) < 3) return;
    st.moved = true;
    // right decreases when moving to the right
    const nextRight = st.startRight - dx;
    const nextTop = st.startTop + dy;
    clampAndSave({ right: nextRight, top: nextTop });
  };

  const endDrag = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    (e.target as Element).releasePointerCapture?.(st.pointerId);
    dragState.current = null;
    setDragging(false);
  };

  // Re-clamp on window resize so it stays visible
  useEffect(() => {
    const onResize = () => clampAndSave(pos);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos, clampAndSave]);

  if (location.pathname === '/auth') return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-[100] pointer-events-auto animate-fade-in',
        dragging ? 'transition-none' : 'transition-shadow'
      )}
      style={{ right: pos.right, top: pos.top }}
      aria-label="Player de música de fundo flutuante"
    >
      <div className="flex items-center gap-1">
        {/* Drag handle */}
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Arrastar player"
          title="Arrastar"
          className={cn(
            'flex h-6 w-4 items-center justify-center rounded-l-md border backdrop-blur-md touch-none cursor-grab active:cursor-grabbing select-none',
            isPresentation
              ? 'bg-black/50 border-gold/30 text-white/70'
              : 'bg-secondary/80 border-border/50 text-muted-foreground hover:text-foreground',
            dragging && 'ring-1 ring-gold/50'
          )}
        >
          <GripVertical size={11} />
        </button>

        {collapsed ? (
          <button
            onClick={() => toggleCollapsed(false)}
            aria-label="Expandir player de música de fundo"
            title="Música de fundo"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md shadow-lg transition-all hover:scale-110',
              isPresentation
                ? 'bg-black/50 border-gold/30 text-white'
                : 'bg-secondary/80 border-border/50 text-foreground',
              isPlaying && 'text-gold border-gold/50'
            )}
          >
            <Music2 size={15} className={cn(isPlaying && 'animate-pulse')} />
          </button>
        ) : (
          <div className="flex items-center gap-1 animate-scale-in">
            <BackgroundMusicPlayer variant={isPresentation ? 'presentation' : 'header'} compact />
            <button
              onClick={() => toggleCollapsed(true)}
              aria-label="Recolher player"
              title="Recolher"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
                isPresentation
                  ? 'bg-black/50 border-gold/30 text-white/70 hover:text-gold'
                  : 'bg-secondary/80 border-border/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
