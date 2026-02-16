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
  Church,
  DoorOpen,
  User,
  Users,
  GraduationCap,
  Hammer,
  Gavel,
  Shield,
  Crown,
  Scroll,
  Key,
  Lock,
  Triangle,
  Square,
  Circle,
  Swords,
  Lamp,
  Music,
  Hand,
  Footprints,
  Flag,
  Gem,
  Scale,
  Cross,
  Speech,
  Hourglass,
  LogOut,
  LogIn,
  Award,
  Folder,
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
  church: Church,
  'door-open': DoorOpen,
  user: User,
  users: Users,
  'graduation-cap': GraduationCap,
  hammer: Hammer,
  gavel: Gavel,
  shield: Shield,
  crown: Crown,
  scroll: Scroll,
  key: Key,
  lock: Lock,
  triangle: Triangle,
  square: Square,
  circle: Circle,
  sword: Swords,
  candle: Flame,
  lamp: Lamp,
  music: Music,
  hand: Hand,
  footprints: Footprints,
  flag: Flag,
  gem: Gem,
  scale: Scale,
  cross: Cross,
  speech: Speech,
  hourglass: Hourglass,
  'log-out': LogOut,
  'log-in': LogIn,
  award: Award,
  folder: Folder,
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
