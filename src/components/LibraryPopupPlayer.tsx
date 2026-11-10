import { useState, type ReactNode } from 'react';
import { PictureInPicture2, X } from 'lucide-react';
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

  return (
    <LibraryPopupPlayerContext.Provider value={{ openPopup: setTrack }}>
      {children}
      {track && (
        <LibraryPopup track={track} onClose={() => setTrack(null)} />
      )}
    </LibraryPopupPlayerContext.Provider>
  );
}

export function LibraryPopupButton({
  track,
  onBeforeOpen,
  className,
}: {
  track: LibraryPopupTrack;
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
        openPopup(track);
      }}
    >
      <PictureInPicture2 size={16} aria-hidden="true" />
    </Button>
  );
}

function LibraryPopup({
  track,
  onClose,
}: {
  track: LibraryPopupTrack;
  onClose: () => void;
}) {
  const stream = detectStream(track.audio_url);
  const embedUrl = stream ? toEmbedUrl(track.audio_url, { autoplay: true }) : null;
  const invalidStream = stream !== null && embedUrl === null;

  return (
    <section
      role="region"
      aria-label={`Mini-player: ${track.nome}`}
      className="fixed bottom-4 left-4 z-[2147483647] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gold/30 bg-card/95 shadow-2xl backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
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
          src={embedUrl}
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
          className="block w-full p-3"
          onError={() => {
            toast({ title: 'Não foi possível reproduzir este áudio', variant: 'destructive' });
          }}
        />
      )}
    </section>
  );
}
