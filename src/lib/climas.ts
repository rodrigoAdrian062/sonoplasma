import {
  Crown, BookOpen, Heart, Users, ArrowLeftRight, type LucideIcon,
} from 'lucide-react';

export type ClimaId = 'solene' | 'reflexiva' | 'emocional' | 'fraternal' | 'transicao';

export interface Clima {
  id: ClimaId;
  ordem: number;
  label: string;
  cor: string;
  icone: LucideIcon;
  /** Momentos rituais atendidos por este clima. */
  momentos: string[];
}

export const CLIMAS: Clima[] = [
  {
    id: 'solene',
    ordem: 1,
    label: 'Solene',
    cor: '#D4AF37',
    icone: Crown,
    momentos: ['Abertura', 'Entrada de autoridades', 'Momentos importantes'],
  },
  {
    id: 'reflexiva',
    ordem: 2,
    label: 'Reflexiva',
    cor: '#3B82F6',
    icone: BookOpen,
    momentos: ['Instruções', 'Peças de Arquitetura', 'Meditação'],
  },
  {
    id: 'emocional',
    ordem: 3,
    label: 'Emocional',
    cor: '#EC4899',
    icone: Heart,
    momentos: ['Homenagens', 'Reconhecimentos', 'Momentos de união'],
  },
  {
    id: 'fraternal',
    ordem: 4,
    label: 'Fraternal',
    cor: '#22C55E',
    icone: Users,
    momentos: ['Cadeia de União', 'Encerramento', 'Confraternização'],
  },
  {
    id: 'transicao',
    ordem: 5,
    label: 'Transição',
    cor: '#94A3B8',
    icone: ArrowLeftRight,
    momentos: [
      'Entrada e saída',
      'Momentos em que o Templo precisa permanecer em silêncio musical',
    ],
  },
];

export function getClima(id?: string | null): Clima | null {
  if (!id) return null;
  return CLIMAS.find((c) => c.id === id) || null;
}
