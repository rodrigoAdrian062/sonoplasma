import { icons, HelpCircle, type LucideProps } from 'lucide-react';

// Ícones temáticos disponíveis para escolher nas faixas comemorativas
export const FAIXA_ICON_CHOICES = [
  'Sparkles', 'PartyPopper', 'Flower2', 'Flower', 'Sun', 'Moon', 'Star',
  'Flag', 'Hammer', 'Heart', 'HeartHandshake', 'Compass', 'Baby',
  'GraduationCap', 'TreePine', 'Gift', 'Bell', 'Crown', 'Church',
  'Cake', 'Music', 'Award', 'Feather', 'Gem', 'Candy', 'Snowflake',
];

export function resolveLucide(name?: string | null) {
  if (!name) return HelpCircle;
  const Comp = (icons as Record<string, React.ComponentType<LucideProps>>)[name];
  return Comp || HelpCircle;
}
