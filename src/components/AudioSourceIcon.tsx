import { YoutubeIcon } from './icons/YoutubeIcon';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { FolderMusicIcon } from './icons/FolderMusicIcon';
import { cn } from '@/lib/utils';

export type AudioSource = 'youtube' | 'spotify' | 'file';

export function getAudioSource(url: string | null | undefined, tipo?: string | null): AudioSource {
  const u = (url || '').toLowerCase();
  const t = (tipo || '').toLowerCase();
  if (t === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (t === 'spotify' || u.includes('open.spotify.com') || u.startsWith('spotify:')) return 'spotify';
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
  if (source === 'spotify') {
    return <SpotifyIcon size={size} className={cn('shrink-0 text-[#1DB954]', className)} />;
  }
  return <FolderMusicIcon size={size} className={cn('shrink-0', className)} />;
}
