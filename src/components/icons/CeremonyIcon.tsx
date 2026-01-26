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

interface CeremonyIconProps {
  name: string | null;
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

export function CeremonyIcon({ name, className, size = 24 }: CeremonyIconProps) {
  const Icon = iconMap[name || 'flame'] || Flame;
  return <Icon className={className} size={size} />;
}
