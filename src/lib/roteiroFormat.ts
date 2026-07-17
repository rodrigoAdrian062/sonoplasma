// Utilities for the roteiro content format.
// Markers inline no texto:
//   [[CUE:<etapaId>]]           → toca o primeiro áudio da etapa
//   [[TRACK:<audioId>]]         → toca uma faixa específica da biblioteca

export type RoteiroBlock =
  | { type: 'text'; text: string }
  | { type: 'cue'; etapaId: string }
  | { type: 'track'; audioId: string };

export const MARKER_REGEX = /\[\[(CUE|TRACK):([0-9a-f-]{36})\]\]/gi;
// Mantido por compatibilidade com imports antigos
export const CUE_REGEX = MARKER_REGEX;

export function parseRoteiro(conteudo: string): RoteiroBlock[] {
  if (!conteudo) return [];
  const blocks: RoteiroBlock[] = [];
  let lastIndex = 0;
  const re = new RegExp(MARKER_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo)) !== null) {
    if (m.index > lastIndex) {
      blocks.push({ type: 'text', text: conteudo.slice(lastIndex, m.index) });
    }
    const kind = m[1].toUpperCase();
    if (kind === 'CUE') blocks.push({ type: 'cue', etapaId: m[2] });
    else blocks.push({ type: 'track', audioId: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < conteudo.length) {
    blocks.push({ type: 'text', text: conteudo.slice(lastIndex) });
  }
  return blocks;
}

function insertMarkerAt(
  conteudo: string,
  cursor: number,
  marker: string,
): { text: string; nextCursor: number } {
  const before = conteudo.slice(0, cursor);
  const after = conteudo.slice(cursor);
  const needsLeadingNL = before.length > 0 && !before.endsWith('\n');
  const needsTrailingNL = after.length > 0 && !after.startsWith('\n');
  const full = `${needsLeadingNL ? '\n' : ''}${marker}${needsTrailingNL ? '\n' : ''}`;
  return { text: before + full + after, nextCursor: cursor + full.length };
}

export function insertCueAtCursor(conteudo: string, cursor: number, etapaId: string) {
  return insertMarkerAt(conteudo, cursor, `[[CUE:${etapaId}]]`);
}

export function insertTrackAtCursor(conteudo: string, cursor: number, audioId: string) {
  return insertMarkerAt(conteudo, cursor, `[[TRACK:${audioId}]]`);
}

export function listCueIds(conteudo: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(MARKER_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo)) !== null) if (m[1].toUpperCase() === 'CUE') ids.push(m[2]);
  return ids;
}
