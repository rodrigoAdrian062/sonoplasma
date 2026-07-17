// Utilities for the roteiro content format.
// Markers inline no texto:
//   [[CUE:<etapaId>]]           → toca o primeiro áudio da etapa
//   [[TRACK:<audioId>]]         → toca uma faixa específica da biblioteca
//   [[PAGE]]                    → quebra manual de página (modo livro)

export type RoteiroBlock =
  | { type: 'text'; text: string }
  | { type: 'cue'; etapaId: string }
  | { type: 'track'; audioId: string }
  | { type: 'page' };

export const MARKER_REGEX = /\[\[(CUE|TRACK):([0-9a-f-]{36})\]\]|\[\[PAGE\]\]/gi;
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
    const full = m[0].toUpperCase();
    if (full === '[[PAGE]]') {
      blocks.push({ type: 'page' });
    } else {
      const kind = (m[1] || '').toUpperCase();
      if (kind === 'CUE') blocks.push({ type: 'cue', etapaId: m[2] });
      else if (kind === 'TRACK') blocks.push({ type: 'track', audioId: m[2] });
    }
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

export function insertPageBreakAtCursor(conteudo: string, cursor: number) {
  return insertMarkerAt(conteudo, cursor, `[[PAGE]]`);
}

export function listCueIds(conteudo: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(MARKER_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo)) !== null) if ((m[1] || '').toUpperCase() === 'CUE') ids.push(m[2]);
  return ids;
}

/**
 * Divide os blocos em páginas.
 * - Se houver blocos `page` (marcador [[PAGE]]), respeita a quebra manual.
 * - Caso contrário, divide automaticamente aproximando `autoCharsPerPage` por página,
 *   sem cortar cues/tracks; tenta quebrar em parágrafo ou espaço.
 */
export function paginateBlocks(
  blocks: RoteiroBlock[],
  autoCharsPerPage = 1400,
): RoteiroBlock[][] {
  if (blocks.length === 0) return [[]];
  const hasManual = blocks.some((b) => b.type === 'page');
  const pages: RoteiroBlock[][] = [[]];

  if (hasManual) {
    for (const b of blocks) {
      if (b.type === 'page') {
        if (pages[pages.length - 1].length > 0) pages.push([]);
        continue;
      }
      pages[pages.length - 1].push(b);
    }
    return pages.filter((p) => p.length > 0);
  }

  let count = 0;
  const push = (b: RoteiroBlock, weight: number) => {
    pages[pages.length - 1].push(b);
    count += weight;
  };
  for (const b of blocks) {
    if (b.type === 'text') {
      let remaining = b.text;
      while (remaining.length > 0 && count + remaining.length > autoCharsPerPage) {
        const room = Math.max(200, autoCharsPerPage - count);
        let cut = remaining.lastIndexOf('\n\n', room);
        if (cut < room * 0.4) cut = remaining.lastIndexOf('\n', room);
        if (cut < room * 0.4) cut = remaining.lastIndexOf(' ', room);
        if (cut <= 0) cut = Math.min(room, remaining.length);
        push({ type: 'text', text: remaining.slice(0, cut) }, cut);
        pages.push([]);
        count = 0;
        remaining = remaining.slice(cut).replace(/^\s+/, '');
      }
      if (remaining.length > 0) push({ type: 'text', text: remaining }, remaining.length);
    } else {
      push(b, 60);
    }
  }
  return pages.filter((p) => p.length > 0);
}

