import { useState } from 'react';
import { Music2, X } from 'lucide-react';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { useBackgroundMusic } from '@/contexts/BackgroundMusicContext';
import { cn } from '@/lib/utils';

/**
 * Botão de música de fundo embutido no header do modo apresentação.
 * Inicia fechado; ao abrir mostra o player compacto num popover.
 */
export function PresentationHeaderBgMusic() {
  const [open, setOpen] = useState(false);
  const { isPlaying } = useBackgroundMusic();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Música de fundo"
        title="Música de fundo"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all',
          'bg-black/50 border-gold/40 text-white/80 hover:text-gold hover:border-gold/70',
          isPlaying && 'text-gold border-gold shadow shadow-gold/30'
        )}
      >
        <Music2 size={15} className={cn(isPlaying && 'animate-pulse')} />
      </button>

      {open && (
        <div className="absolute top-full right-1/2 translate-x-1/2 mt-2 z-[120] animate-scale-in">
          <div className="flex items-center gap-1">
            <BackgroundMusicPlayer variant="presentation" compact />
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar player"
              title="Fechar"
              className="flex h-6 w-6 items-center justify-center rounded-full border bg-black/50 border-gold/30 text-white/70 hover:text-gold backdrop-blur-md"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
