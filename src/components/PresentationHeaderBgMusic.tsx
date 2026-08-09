import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';

/**
 * Wrapper simples que renderiza o player de música de fundo
 * dentro do header do modo apresentação.
 */
export function PresentationHeaderBgMusic() {
  return (
    <div className="flex items-center gap-2">
      <BackgroundMusicPlayer variant="presentation" compact />
    </div>
  );
}
