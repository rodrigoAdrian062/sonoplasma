import { Music, Youtube } from 'lucide-react';
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

export function AudioSourceIcon({ url, tipo, size = 14, className, active }: AudioSourceIconProps) {
  const source = getAudioSource(url, tipo);
  if (source === 'youtube') {
    return <Youtube size={size} className={cn('shrink-0 text-red-500', className)} />;
  }
  return (
    <Music
      size={size}
      className={cn('shrink-0', active ? 'text-gold' : 'text-muted-foreground/50', className)}
    />
  );
}
