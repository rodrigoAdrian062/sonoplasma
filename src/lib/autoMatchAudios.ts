import { AudioLibraryItem } from '@/types/audioLibrary';
import { CeremonyStage } from '@/types/ceremony';

const STOPWORDS = new Set([
  'de','da','do','das','dos','a','o','e','em','no','na','um','uma','para','por',
  'the','of','to','and','with','com','sem','ao','aos','as','os','é','ou','que',
  'sob','sobre','entre','se','ja','já','pra','mais','menos','feat','ft','part','pt',
  'song','music','musica','música','audio','áudio','official','oficial','video','vídeo',
  'hd','hq','lyrics','letra','cover','remix','version','versão','versao','live',
]);

/**
 * Mapa semântico: cada chave (token normalizado) expande para termos relacionados
 * que devem ser considerados como match na biblioteca. Cobre temas maçônicos,
 * religiosos e cerimoniais mais comuns.
 */
const THEME_MAP: Record<string, string[]> = {
  // Religioso / sagrado
  livro: ['biblia', 'sagrada', 'escritura', 'palavra', 'deus', 'senhor', 'santo', 'divino', 'oracao', 'salmo', 'hino', 'louvor', 'gloria', 'aleluia', 'adoracao'],
  lei: ['biblia', 'sagrada', 'mandamento', 'palavra', 'deus', 'senhor', 'santo'],
  biblia: ['sagrada', 'escritura', 'palavra', 'deus', 'senhor', 'santo', 'oracao', 'salmo', 'hino', 'louvor', 'gloria', 'aleluia', 'adoracao', 'jesus', 'cristo', 'espirito'],
  sagrado: ['santo', 'divino', 'deus', 'senhor', 'gloria', 'louvor'],
  sagrada: ['santo', 'divino', 'deus', 'senhor', 'gloria', 'louvor'],
  deus: ['senhor', 'santo', 'divino', 'gloria', 'louvor', 'oracao', 'hino', 'salmo', 'jesus', 'cristo', 'espirito', 'adoracao'],
  oracao: ['prece', 'deus', 'senhor', 'santo', 'ave', 'maria', 'pai', 'nosso'],
  prece: ['oracao', 'deus', 'senhor', 'santo'],

  // Cerimônia
  abertura: ['inicio', 'entrada', 'prelude', 'preludio', 'chamada', 'invocacao'],
  encerramento: ['final', 'fim', 'despedida', 'saida', 'benção', 'bencao'],
  fechamento: ['final', 'fim', 'despedida', 'saida', 'encerramento'],
  entrada: ['abertura', 'marcha', 'procissao', 'inicio'],
  saida: ['final', 'despedida', 'marcha', 'encerramento'],

  // Graus maçônicos
  aprendiz: ['iniciacao', 'primeiro', 'grau', 'novo', 'jornada'],
  companheiro: ['segundo', 'grau', 'jornada', 'trabalho'],
  mestre: ['terceiro', 'grau', 'hiram', 'acacia', 'luto', 'exaltacao'],
  iniciacao: ['aprendiz', 'novo', 'primeiro', 'jornada', 'transformacao'],
  exaltacao: ['mestre', 'hiram', 'terceiro'],

  // Momentos solenes
  silencio: ['meditacao', 'reflexao', 'paz', 'calma', 'contemplacao', 'ambient', 'instrumental'],
  meditacao: ['silencio', 'reflexao', 'paz', 'calma', 'contemplacao', 'ambient', 'instrumental'],
  reflexao: ['meditacao', 'silencio', 'contemplacao'],
  luto: ['funebre', 'requiem', 'adagio', 'lament', 'lamento', 'saudade', 'homenagem'],
  homenagem: ['tributo', 'memoria', 'saudade'],
  juramento: ['promessa', 'compromisso', 'solene'],
  cadeia: ['uniao', 'irmandade', 'fraternidade', 'irmaos'],
  uniao: ['irmandade', 'fraternidade', 'irmaos', 'cadeia'],
  irmandade: ['uniao', 'fraternidade', 'irmaos'],

  // Bíblia (variantes)
  votacao: ['decisao', 'escolha', 'solene'],
  banquete: ['festa', 'celebracao', 'confraternizacao', 'alegria'],
  agape: ['banquete', 'festa', 'confraternizacao', 'irmandade'],
};

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Expande tokens da etapa com sinônimos temáticos. Retorna Map<token, peso>. */
function expandStageTokens(baseTokens: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of baseTokens) {
    out.set(t, Math.max(out.get(t) || 0, 1)); // peso cheio para o token original
    const related = THEME_MAP[t];
    if (related) {
      for (const r of related) {
        out.set(r, Math.max(out.get(r) || 0, 0.7)); // sinônimos: peso 0.7
      }
    }
  }
  return out;
}

export interface MatchResult {
  audio: AudioLibraryItem;
  score: number;
}

export function matchAudiosForStage(
  stage: CeremonyStage,
  library: AudioLibraryItem[],
  limit = 5,
  excludeUrls: Set<string> = new Set()
): MatchResult[] {
  const baseTokens = [
    ...tokenize(stage.nome_simbolico || ''),
    ...tokenize(stage.descricao || ''),
  ];
  const stageTokens = expandStageTokens(baseTokens);
  if (stageTokens.size === 0) return [];

  const scored: MatchResult[] = [];
  for (const audio of library) {
    if (excludeUrls.has(audio.audio_url)) continue;
    const audioTokens = tokenize(audio.nome || '');
    let score = 0;
    for (const t of audioTokens) {
      const direct = stageTokens.get(t);
      if (direct) {
        score += direct;
        continue;
      }
      // partial: startsWith em qualquer token da etapa (min 4)
      for (const [st, weight] of stageTokens) {
        if (st.length >= 4 && (t.startsWith(st) || st.startsWith(t))) {
          score += 0.4 * weight;
          break;
        }
      }
    }
    if (score > 0) scored.push({ audio, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
