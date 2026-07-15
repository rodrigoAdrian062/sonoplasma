import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Music2, X } from 'lucide-react';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { useIsPresentationActive } from '@/lib/presentationState';
import { useBackgroundMusic } from '@/contexts/BackgroundMusicContext';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'bg-music-collapsed-v1';

export function FloatingBackgroundMusic() {
  const location = useLocation();
  const isPresentation = useIsPresentationActive();
  const { isPlaying } = useBackgroundMusic();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const toggle = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem(STORAGE_KEY, String(v));
  };

  if (location.pathname === '/auth') return null;

  return (
    <div
      className="fixed top-3 right-3 z-[100] pointer-events-auto animate-fade-in"
      aria-label="Player de música de fundo flutuante"
    >
      {collapsed ? (
        <button
          onClick={() => toggle(false)}
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
            onClick={() => toggle(true)}
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
