import { useState, useRef, type PointerEvent, type ReactNode } from 'react';
import { PictureInPicture2, X, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LibraryPopupPlayerContext,
  useLibraryPopupPlayer,
  type LibraryPopupTrack,
} from '@/contexts/LibraryPopupPlayerContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { detectStream, toEmbedUrl } from '@/lib/embedUrl';

export function LibraryPopupPlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<LibraryPopupTrack | null>(null);
  const [queue, setQueue] = useState<LibraryPopupTrack[]>([]);

  const openPopup = (nextTrack: LibraryPopupTrack, playlist?: LibraryPopupTrack[]) => {
    setTrack(nextTrack);
    setQueue(playlist?.length ? playlist : [nextTrack]);
  };

  return (
    <LibraryPopupPlayerContext.Provider value={{ openPopup }}>
      {children}
      {track && (
        <LibraryPopup
          track={track}
          queue={queue}
          onTrackChange={setTrack}
          onClose={() => setTrack(null)}
        />
      )}
    </LibraryPopupPlayerContext.Provider>
  );
}

export function LibraryPopupButton({
  track,
  queue,
  onBeforeOpen,
  className,
}: {
  track: LibraryPopupTrack;
  queue?: LibraryPopupTrack[];
  onBeforeOpen?: () => void;
  className?: string;
}) {
  const { openPopup } = useLibraryPopupPlayer();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Abrir no mini-player"
      aria-label={`Abrir ${track.nome} no mini-player`}
      className={cn('shrink-0 text-muted-foreground hover:text-gold', className)}
      onClick={(event) => {
        event.stopPropagation();
        onBeforeOpen?.();
        openPopup(track, queue);
      }}
    >
      <PictureInPicture2 size={16} aria-hidden="true" />
    </Button>
  );
}

function LibraryPopup({
  track,
  queue,
  onTrackChange,
  onClose,
}: {
  track: LibraryPopupTrack;
  queue: LibraryPopupTrack[];
  onTrackChange: (track: LibraryPopupTrack) => void;
  onClose: () => void;
}) {
  const stream = detectStream(track.audio_url);
  const [repeat, setRepeat] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const dragStart = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);
  const currentIndex = queue.findIndex((item) => item.audio_url === track.audio_url);
  const canRepeat = stream !== 'spotify';
  const embedUrl = stream ? toEmbedUrl(track.audio_url, { autoplay: true }) : null;
  const playerUrl = embedUrl && repeat && stream === 'youtube'
    ? `${embedUrl}&loop=1&playlist=${new URL(embedUrl).pathname.split('/').pop()}`
    : embedUrl;
  const invalidStream = stream !== null && embedUrl === null;

  const moveTrack = (offset: number) => {
    const next = queue[currentIndex + offset];
    if (next) {
      setRepeat(false);
      onTrackChange(next);
    }
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const width = event.currentTarget.parentElement?.offsetWidth ?? 0;
    const height = event.currentTarget.parentElement?.offsetHeight ?? 0;
    setPosition({
      left: Math.max(0, Math.min(window.innerWidth - width, dragStart.current.left + event.clientX - dragStart.current.pointerX)),
      top: Math.max(0, Math.min(window.innerHeight - height, dragStart.current.top + event.clientY - dragStart.current.pointerY)),
    });
  };

  return (
    <section
      role="region"
      aria-label={`Mini-player: ${track.nome}`}
      style={position
        ? { left: position.left, top: position.top, bottom: 'auto' }
        : undefined}
      className="fixed bottom-4 left-4 z-[2147483647] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gold/30 bg-card/95 shadow-2xl backdrop-blur-md animate-fade-in"
    >
      <div
        className="flex touch-none cursor-grab items-center justify-between gap-2 border-b border-border/60 px-3 py-2 active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={() => { dragStart.current = null; }}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        <p className="min-w-0 truncate text-sm font-medium text-foreground">{track.nome}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Fechar mini-player"
          title="Fechar mini-player"
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      {invalidStream ? (
        <p role="alert" className="p-4 text-sm text-destructive">
          Não foi possível abrir o player para este link.
        </p>
      ) : embedUrl ? (
        <iframe
          key={track.audio_url}
          src={playerUrl ?? embedUrl}
          title={`Player — ${track.nome}`}
          className="block h-[180px] w-full border-0 bg-black"
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <audio
          key={track.audio_url}
          src={track.audio_url}
          controls
          autoPlay
          loop={repeat}
          className="block w-full p-3"
          onEnded={() => moveTrack(1)}
          onError={() => {
            toast({ title: 'Não foi possível reproduzir este áudio', variant: 'destructive' });
          }}
        />
      )}
      <div className="flex items-center justify-center gap-2 border-t border-border/60 p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Música anterior"
          aria-label="Música anterior"
          disabled={currentIndex <= 0}
          onClick={() => moveTrack(-1)}
        >
          <SkipBack size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', repeat && 'text-gold')}
          title={canRepeat ? (repeat ? 'Desativar repetição' : 'Repetir música') : 'A repetição do Spotify é controlada pelo player'}
          aria-label={canRepeat ? (repeat ? 'Desativar repetição' : 'Repetir música') : 'Repetição indisponível neste player'}
          aria-pressed={repeat}
          disabled={!canRepeat}
          onClick={() => setRepeat((value) => !value)}
        >
          <Repeat size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Próxima música"
          aria-label="Próxima música"
          disabled={currentIndex < 0 || currentIndex >= queue.length - 1}
          onClick={() => moveTrack(1)}
        >
          <SkipForward size={16} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
