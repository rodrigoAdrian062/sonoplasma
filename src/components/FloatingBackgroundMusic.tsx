import { useLocation } from 'react-router-dom';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { useIsPresentationActive } from '@/lib/presentationState';

export function FloatingBackgroundMusic() {
  const location = useLocation();
  const isPresentation = useIsPresentationActive();

  if (location.pathname === '/auth') return null;

  return (
    <div
      className={
        isPresentation
          ? 'fixed top-3 right-3 z-[100] pointer-events-auto'
          : 'fixed top-3 right-3 z-[100] pointer-events-auto'
      }
      aria-label="Player de música de fundo flutuante"
    >
      <BackgroundMusicPlayer variant={isPresentation ? 'presentation' : 'header'} compact />
    </div>
  );
}
