/**
 * Biblioteca de símbolos maçônicos em SVG (leves, sem requisições externas).
 * Gera 200 imagens pequenas combinando motivos, paletas e molduras.
 * Cada símbolo é exposto como um data URI usável diretamente em <img src>.
 */

// Cada motivo desenha em um viewBox 0 0 100 100. Use {C} para a cor do traço
// e {A} para uma cor de destaque/preenchimento suave.
type Motif = { id: string; label: string; svg: string };

const MOTIFS: Motif[] = [
  {
    id: 'esquadro-compasso',
    label: 'Esquadro e Compasso',
    svg: `<path d="M50 22 L30 72 M50 22 L70 72" fill="none" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <circle cx="50" cy="22" r="4" fill="{C}"/>
          <path d="M26 54 L50 76 L74 54" fill="none" stroke="{C}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="50" y="60" font-size="16" font-family="Georgia, serif" fill="{C}" text-anchor="middle">G</text>`,
  },
  {
    id: 'olho-providencia',
    label: 'Olho da Providência',
    svg: `<path d="M50 20 L82 76 L18 76 Z" fill="none" stroke="{C}" stroke-width="5" stroke-linejoin="round"/>
          <path d="M32 60 Q50 46 68 60 Q50 72 32 60 Z" fill="{A}" stroke="{C}" stroke-width="3"/>
          <circle cx="50" cy="60" r="6" fill="{C}"/>`,
  },
  {
    id: 'colunas',
    label: 'Colunas Boaz e Jachin',
    svg: `<rect x="24" y="30" width="14" height="50" fill="{A}" stroke="{C}" stroke-width="3"/>
          <rect x="62" y="30" width="14" height="50" fill="{A}" stroke="{C}" stroke-width="3"/>
          <rect x="20" y="24" width="22" height="8" fill="{C}"/>
          <rect x="58" y="24" width="22" height="8" fill="{C}"/>`,
  },
  {
    id: 'sol',
    label: 'Sol',
    svg: `<circle cx="50" cy="50" r="18" fill="{A}" stroke="{C}" stroke-width="4"/>
          ${Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x1 = 50 + Math.cos(a) * 24;
            const y1 = 50 + Math.sin(a) * 24;
            const x2 = 50 + Math.cos(a) * 34;
            const y2 = 50 + Math.sin(a) * 34;
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="{C}" stroke-width="4" stroke-linecap="round"/>`;
          }).join('')}`,
  },
  {
    id: 'lua',
    label: 'Lua Crescente',
    svg: `<path d="M62 22 A30 30 0 1 0 62 78 A24 24 0 1 1 62 22 Z" fill="{C}"/>`,
  },
  {
    id: 'estrela-flamejante',
    label: 'Estrela Flamejante',
    svg: `${(() => {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (-90 + i * 72) * (Math.PI / 180);
        return `${(50 + Math.cos(a) * 32).toFixed(1)},${(50 + Math.sin(a) * 32).toFixed(1)}`;
      });
      const order = [0, 2, 4, 1, 3];
      const path = order.map((o) => pts[o]).join(' L ');
      return `<path d="M ${path} Z" fill="{A}" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>`;
    })()}
    <text x="50" y="58" font-size="18" font-family="Georgia, serif" fill="{C}" text-anchor="middle">G</text>`,
  },
  {
    id: 'nivel',
    label: 'Nível',
    svg: `<path d="M20 46 L80 46 L50 78 Z" fill="none" stroke="{C}" stroke-width="5" stroke-linejoin="round"/>
          <line x1="50" y1="46" x2="50" y2="78" stroke="{C}" stroke-width="4"/>
          <circle cx="50" cy="22" r="6" fill="{A}" stroke="{C}" stroke-width="4"/>
          <line x1="50" y1="28" x2="50" y2="46" stroke="{C}" stroke-width="4"/>`,
  },
  {
    id: 'prumo',
    label: 'Prumo',
    svg: `<line x1="50" y1="20" x2="50" y2="70" stroke="{C}" stroke-width="4"/>
          <rect x="40" y="16" width="20" height="6" fill="{C}"/>
          <path d="M42 70 L58 70 L50 84 Z" fill="{A}" stroke="{C}" stroke-width="3"/>`,
  },
  {
    id: 'malhete',
    label: 'Malhete',
    svg: `<rect x="26" y="30" width="48" height="18" rx="4" fill="{A}" stroke="{C}" stroke-width="4"/>
          <rect x="46" y="46" width="8" height="38" rx="3" fill="{C}"/>`,
  },
  {
    id: 'colher-pedreiro',
    label: 'Colher de Pedreiro',
    svg: `<path d="M28 30 L62 30 L45 60 Z" fill="{A}" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>
          <line x1="45" y1="60" x2="70" y2="82" stroke="{C}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: 'colmeia',
    label: 'Colmeia',
    svg: `${Array.from({ length: 4 }, (_, i) => {
      const w = 44 - i * 10;
      const y = 34 + i * 12;
      return `<rect x="${50 - w / 2}" y="${y}" width="${w}" height="10" rx="5" fill="{A}" stroke="{C}" stroke-width="3"/>`;
    }).join('')}
    <rect x="30" y="78" width="40" height="6" fill="{C}"/>`,
  },
  {
    id: 'acacia',
    label: 'Ramo de Acácia',
    svg: `<line x1="50" y1="82" x2="50" y2="26" stroke="{C}" stroke-width="4"/>
          ${Array.from({ length: 5 }, (_, i) => {
            const y = 34 + i * 10;
            return `<line x1="50" y1="${y}" x2="${34 - i}" y2="${y - 8}" stroke="{C}" stroke-width="3"/><line x1="50" y1="${y}" x2="${66 + i}" y2="${y - 8}" stroke="{C}" stroke-width="3"/>`;
          }).join('')}`,
  },
  {
    id: 'ampulheta',
    label: 'Ampulheta',
    svg: `<path d="M28 22 L72 22 L52 50 L72 78 L28 78 L48 50 Z" fill="{A}" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>
          <line x1="24" y1="22" x2="76" y2="22" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <line x1="24" y1="78" x2="76" y2="78" stroke="{C}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: 'escada',
    label: 'Escada de Jacó',
    svg: `<line x1="36" y1="18" x2="36" y2="84" stroke="{C}" stroke-width="4"/>
          <line x1="64" y1="18" x2="64" y2="84" stroke="{C}" stroke-width="4"/>
          ${Array.from({ length: 6 }, (_, i) => `<line x1="36" y1="${26 + i * 11}" x2="64" y2="${26 + i * 11}" stroke="{C}" stroke-width="3"/>`).join('')}`,
  },
  {
    id: 'ancora',
    label: 'Âncora',
    svg: `<circle cx="50" cy="24" r="7" fill="none" stroke="{C}" stroke-width="4"/>
          <line x1="50" y1="31" x2="50" y2="78" stroke="{C}" stroke-width="4"/>
          <line x1="34" y1="42" x2="66" y2="42" stroke="{C}" stroke-width="4"/>
          <path d="M28 60 Q34 82 50 82 Q66 82 72 60" fill="none" stroke="{C}" stroke-width="4"/>`,
  },
  {
    id: 'livro-lei',
    label: 'Livro da Lei',
    svg: `<path d="M22 34 Q50 26 78 34 L78 74 Q50 66 22 74 Z" fill="{A}" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>
          <line x1="50" y1="30" x2="50" y2="70" stroke="{C}" stroke-width="3"/>`,
  },
  {
    id: 'letra-g',
    label: 'Letra G',
    svg: `<circle cx="50" cy="50" r="30" fill="{A}" stroke="{C}" stroke-width="4"/>
          <text x="50" y="66" font-size="42" font-family="Georgia, serif" font-weight="bold" fill="{C}" text-anchor="middle">G</text>`,
  },
  {
    id: 'espada',
    label: 'Espada Flamejante',
    svg: `<path d="M50 18 q-4 8 0 16 q4 8 0 16 q-4 8 0 16 q4 8 0 12" fill="none" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <line x1="36" y1="76" x2="64" y2="76" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <line x1="50" y1="78" x2="50" y2="86" stroke="{C}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: 'coluna-quebrada',
    label: 'Coluna Quebrada',
    svg: `<rect x="38" y="46" width="24" height="34" fill="{A}" stroke="{C}" stroke-width="3"/>
          <path d="M38 46 L46 36 L54 44 L62 34 L62 46 Z" fill="{C}"/>
          <rect x="32" y="80" width="36" height="6" fill="{C}"/>`,
  },
  {
    id: 'pavimento',
    label: 'Pavimento Mosaico',
    svg: `${Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => {
        const fill = (r + c) % 2 === 0 ? '{C}' : '{A}';
        return `<rect x="${26 + c * 12}" y="${26 + r * 12}" width="12" height="12" fill="${fill}"/>`;
      }).join(''),
    ).join('')}
    <rect x="26" y="26" width="48" height="48" fill="none" stroke="{C}" stroke-width="3"/>`,
  },
  {
    id: 'ponto-circulo',
    label: 'Ponto no Círculo',
    svg: `<circle cx="50" cy="50" r="26" fill="none" stroke="{C}" stroke-width="4"/>
          <circle cx="50" cy="50" r="5" fill="{C}"/>
          <line x1="24" y1="50" x2="18" y2="50" stroke="{C}" stroke-width="4"/>
          <line x1="76" y1="50" x2="82" y2="50" stroke="{C}" stroke-width="4"/>`,
  },
  {
    id: 'cornucopia',
    label: 'Cornucópia',
    svg: `<path d="M30 70 Q26 40 60 34 Q80 30 78 46 Q60 42 52 58 Q48 70 40 74 Z" fill="{A}" stroke="{C}" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="64" cy="30" r="4" fill="{C}"/><circle cx="72" cy="34" r="4" fill="{C}"/>`,
  },
  {
    id: 'triangulo-radiante',
    label: 'Triângulo Radiante',
    svg: `<path d="M50 24 L78 72 L22 72 Z" fill="{A}" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>
          ${Array.from({ length: 8 }, (_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return `<line x1="${(50 + Math.cos(a) * 34).toFixed(1)}" y1="${(52 + Math.sin(a) * 34).toFixed(1)}" x2="${(50 + Math.cos(a) * 42).toFixed(1)}" y2="${(52 + Math.sin(a) * 42).toFixed(1)}" stroke="{C}" stroke-width="3" stroke-linecap="round"/>`;
          }).join('')}`,
  },
  {
    id: 'euclides',
    label: '47º Problema de Euclides',
    svg: `<path d="M40 60 L60 60 L60 40 Z" fill="none" stroke="{C}" stroke-width="4"/>
          <rect x="40" y="60" width="20" height="20" fill="{A}" stroke="{C}" stroke-width="3"/>
          <rect x="20" y="40" width="20" height="20" fill="{A}" stroke="{C}" stroke-width="3"/>
          <rect x="60" y="20" width="20" height="20" fill="{A}" stroke="{C}" stroke-width="3"/>`,
  },
  {
    id: 'compasso',
    label: 'Compasso',
    svg: `<path d="M50 24 L30 78 M50 24 L70 78" fill="none" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <circle cx="50" cy="26" r="5" fill="{C}"/>`,
  },
  {
    id: 'esquadro',
    label: 'Esquadro',
    svg: `<path d="M28 30 L28 72 L72 72" fill="none" stroke="{C}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'templo',
    label: 'Templo',
    svg: `<path d="M20 44 L50 24 L80 44 Z" fill="{A}" stroke="{C}" stroke-width="3" stroke-linejoin="round"/>
          ${Array.from({ length: 4 }, (_, i) => `<rect x="${26 + i * 14}" y="46" width="8" height="30" fill="{A}" stroke="{C}" stroke-width="2"/>`).join('')}
          <rect x="20" y="78" width="60" height="6" fill="{C}"/>`,
  },
  {
    id: 'estrela-davi',
    label: 'Estrela de Davi',
    svg: `<path d="M50 22 L74 66 L26 66 Z" fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>
          <path d="M50 78 L26 34 L74 34 Z" fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round"/>`,
  },
  {
    id: 'chave',
    label: 'Chave',
    svg: `<circle cx="36" cy="40" r="12" fill="none" stroke="{C}" stroke-width="5"/>
          <line x1="44" y1="48" x2="72" y2="76" stroke="{C}" stroke-width="5" stroke-linecap="round"/>
          <line x1="62" y1="66" x2="70" y2="58" stroke="{C}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: 'trono-luz',
    label: 'Vela Acesa',
    svg: `<rect x="42" y="42" width="16" height="40" fill="{A}" stroke="{C}" stroke-width="3"/>
          <path d="M50 24 Q58 34 50 42 Q42 34 50 24 Z" fill="{C}"/>
          <rect x="34" y="80" width="32" height="6" fill="{C}"/>`,
  },
];

// Paletas: [cor principal, cor de destaque, fundo]
const PALETTES: { name: string; c: string; a: string; bg: string }[] = [
  { name: 'ouro', c: '#D4AF37', a: 'rgba(212,175,55,0.15)', bg: '#1a1c22' },
  { name: 'azul', c: '#5B8DEF', a: 'rgba(91,141,239,0.15)', bg: '#141821' },
  { name: 'grafite', c: '#C9CDD6', a: 'rgba(201,205,214,0.12)', bg: '#0f1115' },
  { name: 'marfim', c: '#F2E9D8', a: 'rgba(242,233,216,0.12)', bg: '#1b1a17' },
  { name: 'rubi', c: '#E05A6B', a: 'rgba(224,90,107,0.15)', bg: '#1c1417' },
  { name: 'esmeralda', c: '#4FBF8B', a: 'rgba(79,191,139,0.15)', bg: '#101915' },
  { name: 'âmbar', c: '#E8A13C', a: 'rgba(232,161,60,0.15)', bg: '#1c1710' },
];

// Molduras
const FRAMES: { name: string; svg: string }[] = [
  { name: 'sem', svg: '' },
  { name: 'circulo', svg: '<circle cx="50" cy="50" r="46" fill="none" stroke="{C}" stroke-width="2.5" opacity="0.55"/>' },
  { name: 'losango', svg: '<path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="{C}" stroke-width="2.5" opacity="0.55"/>' },
];

function buildSvg(motif: Motif, pal: (typeof PALETTES)[number], frame: (typeof FRAMES)[number]): string {
  const inner = (motif.svg + frame.svg).split('{C}').join(pal.c).split('{A}').join(pal.a);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="16" fill="${pal.bg}"/>${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface MasonicSymbol {
  id: string;
  label: string;
  src: string;
}

function generateSymbols(target = 200): MasonicSymbol[] {
  const out: MasonicSymbol[] = [];
  // Ordena por moldura -> paleta -> motivo para variar visualmente ao rolar.
  outer: for (const frame of FRAMES) {
    for (const pal of PALETTES) {
      for (const motif of MOTIFS) {
        out.push({
          id: `${motif.id}-${pal.name}-${frame.name}`,
          label: `${motif.label} · ${pal.name}`,
          src: buildSvg(motif, pal, frame),
        });
        if (out.length >= target) break outer;
      }
    }
  }
  return out;
}

export const MASONIC_SYMBOLS: MasonicSymbol[] = generateSymbols(200);
