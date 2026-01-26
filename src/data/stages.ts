import { CeremonyStage } from '@/types/ceremony';

export const ceremonyStages: CeremonyStage[] = [
  {
    id: 'abertura',
    symbolicName: 'Acendimento das Luzes',
    description: 'Momento inicial de iluminação e preparação do ambiente sagrado',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    defaultTime: 180, // 3 min
    order: 1,
    icon: 'flame',
  },
  {
    id: 'entrada',
    symbolicName: 'Marcha ao Oriente',
    description: 'Procissão cerimonial em direção ao altar',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    defaultTime: 120, // 2 min
    order: 2,
    icon: 'compass',
  },
  {
    id: 'reflexao',
    symbolicName: 'Silêncio Interior',
    description: 'Momento de meditação e introspecção silenciosa',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    defaultTime: 300, // 5 min
    order: 3,
    icon: 'eye',
  },
  {
    id: 'trabalhos',
    symbolicName: 'Coluna em Harmonia',
    description: 'Acompanhamento musical durante os trabalhos rituais',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    defaultTime: 0, // tempo livre
    order: 4,
    icon: 'columns',
  },
  {
    id: 'encerramento',
    symbolicName: 'Fechamento dos Trabalhos',
    description: 'Conclusão solene das atividades cerimoniais',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    defaultTime: 180, // 3 min
    order: 5,
    icon: 'book-open',
  },
  {
    id: 'ambiente',
    symbolicName: 'Véu do Silêncio',
    description: 'Música ambiente contínua para momentos de transição',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    defaultTime: 0, // contínuo
    order: 6,
    icon: 'wind',
  },
];
