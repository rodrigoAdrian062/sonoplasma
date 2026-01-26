import { 
  Flame, 
  Compass, 
  Eye, 
  Columns2, 
  BookOpen, 
  Wind,
  Star,
  Sun,
  Moon,
  Heart,
  LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CeremonyIconProps {
  name: string | null;
  imageUrl?: string | null;
  className?: string;
  size?: number;
}

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  compass: Compass,
  eye: Eye,
  columns: Columns2,
  'book-open': BookOpen,
  wind: Wind,
  star: Star,
  sun: Sun,
  moon: Moon,
  heart: Heart,
};

export function CeremonyIcon({ name, imageUrl, className, size = 24 }: CeremonyIconProps) {
  // If there's an image URL, show the image
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt="Ícone da etapa"
        className={cn('object-cover rounded', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Otherwise, show the icon
  const Icon = iconMap[name || 'flame'] || Flame;
  return <Icon className={className} size={size} />;
}
