import { 
  Flame, 
  Compass, 
  Eye, 
  Columns2, 
  BookOpen, 
  Wind,
  LucideIcon 
} from 'lucide-react';

interface CeremonyIconProps {
  name: string;
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
};

export function CeremonyIcon({ name, className, size = 24 }: CeremonyIconProps) {
  const Icon = iconMap[name] || Flame;
  return <Icon className={className} size={size} />;
}
