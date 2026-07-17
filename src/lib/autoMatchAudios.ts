import { AudioLibraryItem } from '@/types/audioLibrary';
import { CeremonyStage } from '@/types/ceremony';

const STOPWORDS = new Set([
  'de','da','do','das','dos','a','o','e','em','no','na','um','uma','para','por',
  'the','of','to','and','with','com','sem','ao','aos','as','os','é','ou','que',
  'sob','sobre','entre','se','ja','já','pra','mais','menos','feat','ft','part','pt',
  'song','music','musica','música','audio','áudio','official','oficial','video','vídeo',
  'hd','hq','lyrics','letra','cover','remix','version','versão','versao','live',
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
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
  const stageTokens = new Set([
    ...tokenize(stage.nome_simbolico || ''),
    ...tokenize(stage.descricao || ''),
  ]);
  if (stageTokens.size === 0) return [];

  const scored: MatchResult[] = [];
  for (const audio of library) {
    if (excludeUrls.has(audio.audio_url)) continue;
    const audioTokens = tokenize(audio.nome || '');
    let score = 0;
    for (const t of audioTokens) {
      if (stageTokens.has(t)) score += 1;
      else {
        // partial: token starts with any stage token (min 4 chars)
        for (const st of stageTokens) {
          if (st.length >= 4 && (t.startsWith(st) || st.startsWith(t))) {
            score += 0.5;
            break;
          }
        }
      }
    }
    if (score > 0) scored.push({ audio, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
