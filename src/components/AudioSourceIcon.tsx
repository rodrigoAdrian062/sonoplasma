import { YoutubeIcon } from './icons/YoutubeIcon';
import { FolderMusicIcon } from './icons/FolderMusicIcon';
import { cn } from '@/lib/utils';

export type AudioSource = 'youtube' | 'file';

export function getAudioSource(url: string | null | undefined, tipo?: string | null): AudioSource {
  const u = url || '';
  if (tipo === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'file';
}

interface AudioSourceIconProps {
  url: string | null | undefined;
  tipo?: string | null;
  size?: number;
  className?: string;
  active?: boolean;
}

export function AudioSourceIcon({ url, tipo, size = 14, className }: AudioSourceIconProps) {
  const source = getAudioSource(url, tipo);
  if (source === 'youtube') {
    return <YoutubeIcon size={size} className={cn('shrink-0', className)} />;
  }
  return <FolderMusicIcon size={size} className={cn('shrink-0', className)} />;
}
