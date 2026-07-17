import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Music2, X } from 'lucide-react';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { useIsPresentationActive } from '@/lib/presentationState';
import { useBackgroundMusic } from '@/contexts/BackgroundMusicContext';
import { cn } from '@/lib/utils';

export function FloatingBackgroundMusic() {
  const location = useLocation();
  const isPresentation = useIsPresentationActive();
  const { isPlaying } = useBackgroundMusic();
  // Sempre inicia fechado ao abrir o app
  const [collapsed, setCollapsed] = useState<boolean>(true);

  if (location.pathname === '/auth') return null;
  // No modo apresentação, o player é renderizado dentro do header.
  if (isPresentation) return null;

  const positionClass = 'fixed bottom-3 right-3 sm:bottom-4 sm:right-4';

  return (
    <div
      className={cn(positionClass, 'z-[100] pointer-events-auto animate-fade-in')}
      aria-label="Player de música de fundo"
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Abrir player de música de fundo"
          title="Música de fundo"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border-2 backdrop-blur-xl shadow-lg shadow-black/40 ring-1 ring-gold/20 transition-all hover:scale-110',
            isPresentation
              ? 'bg-black/70 border-gold/60 text-white'
              : 'bg-background/85 border-gold/50 text-foreground',
            isPlaying && 'text-gold border-gold shadow-gold/30'
          )}
        >
          <Music2 size={16} className={cn(isPlaying && 'animate-pulse')} />
        </button>
      ) : (
        <div className="flex items-center gap-1 animate-scale-in">
          <BackgroundMusicPlayer variant={isPresentation ? 'presentation' : 'header'} compact />
          <button
            onClick={() => setCollapsed(true)}
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
  );
}
