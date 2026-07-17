// Utilities for the roteiro content format.
// Content is plain text with inline cue markers: [[CUE:etapaId]]

export type RoteiroBlock =
  | { type: 'text'; text: string }
  | { type: 'cue'; etapaId: string };

export const CUE_REGEX = /\[\[CUE:([0-9a-f-]{36})\]\]/gi;

export function parseRoteiro(conteudo: string): RoteiroBlock[] {
  if (!conteudo) return [];
  const blocks: RoteiroBlock[] = [];
  let lastIndex = 0;
  const re = new RegExp(CUE_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo)) !== null) {
    if (m.index > lastIndex) {
      blocks.push({ type: 'text', text: conteudo.slice(lastIndex, m.index) });
    }
    blocks.push({ type: 'cue', etapaId: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < conteudo.length) {
    blocks.push({ type: 'text', text: conteudo.slice(lastIndex) });
  }
  return blocks;
}

export function insertCueAtCursor(
  conteudo: string,
  cursor: number,
  etapaId: string,
): { text: string; nextCursor: number } {
  const marker = `\n[[CUE:${etapaId}]]\n`;
  const next = conteudo.slice(0, cursor) + marker + conteudo.slice(cursor);
  return { text: next, nextCursor: cursor + marker.length };
}

export function listCueIds(conteudo: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(CUE_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo)) !== null) ids.push(m[1]);
  return ids;
}
