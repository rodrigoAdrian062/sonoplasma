import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CeremonyStage = Tables<'sonoplastia_etapas'>;
export type CeremonyStageInsert = TablesInsert<'sonoplastia_etapas'>;
export type CeremonyStageUpdate = TablesUpdate<'sonoplastia_etapas'>;

export type StageExecution = Tables<'sonoplastia_execucoes'>;

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export const ICON_OPTIONS = [
  { value: 'flame', label: 'Chama' },
  { value: 'compass', label: 'Compasso' },
  { value: 'eye', label: 'Olho' },
  { value: 'columns', label: 'Colunas' },
  { value: 'book-open', label: 'Livro' },
  { value: 'wind', label: 'Vento' },
  { value: 'star', label: 'Estrela' },
  { value: 'sun', label: 'Sol' },
  { value: 'moon', label: 'Lua' },
  { value: 'heart', label: 'Coração' },
  { value: 'church', label: 'Templo' },
  { value: 'door-open', label: 'Porta' },
  { value: 'user', label: 'Pessoa' },
  { value: 'users', label: 'Pessoas' },
  { value: 'graduation-cap', label: 'Aprendiz' },
  { value: 'hammer', label: 'Martelo' },
  { value: 'gavel', label: 'Malhete' },
  { value: 'shield', label: 'Escudo' },
  { value: 'crown', label: 'Coroa' },
  { value: 'scroll', label: 'Pergaminho' },
  { value: 'key', label: 'Chave' },
  { value: 'lock', label: 'Cadeado' },
  { value: 'triangle', label: 'Triângulo' },
  { value: 'square', label: 'Quadrado' },
  { value: 'circle', label: 'Círculo' },
  { value: 'sword', label: 'Espada' },
  { value: 'candle', label: 'Vela' },
  { value: 'lamp', label: 'Lâmpada' },
  { value: 'music', label: 'Música' },
  { value: 'hand', label: 'Mão' },
  { value: 'footprints', label: 'Passos' },
  { value: 'flag', label: 'Bandeira' },
  { value: 'gem', label: 'Joia' },
  { value: 'scale', label: 'Balança' },
  { value: 'cross', label: 'Cruz' },
  { value: 'speech', label: 'Discurso' },
  { value: 'hourglass', label: 'Ampulheta' },
  { value: 'log-out', label: 'Saída' },
  { value: 'log-in', label: 'Entrada' },
  { value: 'award', label: 'Prêmio' },
];

// Auto-suggest icon based on Portuguese name
const ICON_KEYWORDS: Record<string, string[]> = {
  'church': ['templo', 'temple', 'loja', 'catedral', 'santuário', 'câmara'],
  'door-open': ['entrada', 'abertura', 'porta', 'ingresso', 'acesso'],
  'log-out': ['saída', 'saida', 'encerramento', 'fechamento', 'retirada'],
  'log-in': ['entrada', 'chegada', 'recepção', 'recepcao'],
  'graduation-cap': ['aprendiz', 'aprendizado', 'estudo', 'instrução', 'instrucao', 'formação', 'formacao'],
  'hammer': ['martelo', 'malhete', 'trabalho', 'obra', 'construção', 'construcao', 'companheiro'],
  'crown': ['mestre', 'venerável', 'veneravel', 'grão', 'grao', 'sublime', 'soberano', 'coroa'],
  'flame': ['fogo', 'chama', 'acendimento', 'luz', 'luzes', 'iluminação', 'iluminacao', 'vela'],
  'compass': ['compasso', 'geometria', 'esquadro'],
  'eye': ['olho', 'vigília', 'vigilia', 'vigilância', 'vigilancia', 'observação', 'observacao'],
  'columns': ['colunas', 'pilares', 'pilar', 'coluna', 'pórtico', 'portico'],
  'book-open': ['livro', 'leitura', 'bíblia', 'biblia', 'escritura', 'ata', 'lei', 'constituição', 'constituicao'],
  'star': ['estrela', 'flamejante', 'pentagonal', 'astro'],
  'sun': ['sol', 'oriente', 'nascer', 'aurora', 'meio-dia', 'meio dia'],
  'moon': ['lua', 'ocidente', 'noite', 'pôr', 'por do sol'],
  'heart': ['coração', 'coracao', 'amor', 'fraternidade', 'caridade', 'beneficência', 'beneficencia'],
  'wind': ['vento', 'ar', 'sopro', 'respiração', 'respiracao'],
  'scroll': ['pergaminho', 'decreto', 'prancha', 'traçado', 'tracado', 'documento'],
  'key': ['chave', 'segredo', 'mistério', 'misterio', 'tesoureiro'],
  'shield': ['escudo', 'proteção', 'protecao', 'guarda', 'cobertura', 'hospitaleiro'],
  'music': ['música', 'musica', 'canto', 'hino', 'harmonia', 'melodia', 'sonoplastia', 'áudio', 'audio'],
  'users': ['irmãos', 'irmaos', 'fraternidade', 'cadeia', 'união', 'uniao', 'assembleia', 'reunião', 'reuniao'],
  'user': ['orador', 'secretário', 'secretario', 'vigilante', 'chanceler', 'diácono', 'diacono', 'membro'],
  'hand': ['mão', 'mao', 'juramento', 'sinal', 'toque', 'aperto', 'promessa'],
  'sword': ['espada', 'guarda', 'cobertor', 'sentinela'],
  'scale': ['balança', 'balanca', 'justiça', 'justica', 'equilíbrio', 'equilibrio', 'julgamento'],
  'footprints': ['passos', 'marcha', 'caminhada', 'viagem', 'percurso', 'deambulação', 'deambulacao'],
  'flag': ['bandeira', 'estandarte', 'pavilhão', 'pavilhao'],
  'gem': ['joia', 'jóia', 'pedra', 'diamante', 'ornamento'],
  'cross': ['cruz', 'rosa', 'cavaleiro', 'templário', 'templario'],
  'speech': ['discurso', 'oração', 'oracao', 'prece', 'invocação', 'invocacao', 'palavra', 'palestra'],
  'hourglass': ['tempo', 'hora', 'cronômetro', 'cronometro', 'duração', 'duracao', 'momento'],
  'triangle': ['triângulo', 'triangulo', 'delta', 'trindade'],
  'award': ['prêmio', 'premio', 'honra', 'distinção', 'distincao', 'medalha', 'homenagem'],
  'lock': ['cadeado', 'silêncio', 'silencio', 'segredo', 'fechado', 'reservado'],
  'lamp': ['lâmpada', 'lampada', 'sabedoria', 'conhecimento', 'beleza', 'força', 'forca'],
  'folder': ['seção', 'secao', 'sessão', 'sessao', 'pasta', 'categoria', 'grau'],
};

export function suggestIconForName(name: string): string {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nameNormalized = name.toLowerCase();
  
  for (const [icon, keywords] of Object.entries(ICON_KEYWORDS)) {
    for (const keyword of keywords) {
      const keyNorm = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(keyNorm) || nameNormalized.includes(keyword)) {
        return icon;
      }
    }
  }
  return 'flame'; // default
}
