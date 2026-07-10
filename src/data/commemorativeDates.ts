// Datas comemorativas principais do calendário — textos, cores e ícones já prontos.
// Cada faixa pode ser editada e ativada/desativada pelo usuário no painel admin.

export interface FaixaDef {
  key: string;
  nome: string;
  icone: string; // nome do ícone lucide (PascalCase)
  texto: string;
  corFundo: string;
  corTexto: string;
  // Como calcular a data no ano:
  // { month, day } fixo, ou { compute } para datas móveis
  when: { month: number; day: number } | { compute: 'pascoa' | 'carnaval' | 'maes' | 'pais' };
}

export const FAIXAS_DEFAULT: FaixaDef[] = [
  {
    key: 'ano_novo',
    nome: 'Ano Novo',
    icone: 'Sparkles',
    texto: 'Feliz Ano Novo! Que este novo ciclo traga luz, paz e prosperidade a todos os Irmãos.',
    corFundo: '#B8860B',
    corTexto: '#FFF8E7',
    when: { month: 1, day: 1 },
  },
  {
    key: 'carnaval',
    nome: 'Carnaval',
    icone: 'PartyPopper',
    texto: 'Bom Carnaval! Que a alegria venha sempre acompanhada de equilíbrio e fraternidade.',
    corFundo: '#8B5CF6',
    corTexto: '#FFFFFF',
    when: { compute: 'carnaval' },
  },
  {
    key: 'dia_mulher',
    nome: 'Dia da Mulher',
    icone: 'Flower2',
    texto: 'Dia Internacional da Mulher — nossa homenagem à força, à sabedoria e à luz feminina.',
    corFundo: '#EC4899',
    corTexto: '#FFFFFF',
    when: { month: 3, day: 8 },
  },
  {
    key: 'pascoa',
    nome: 'Páscoa',
    icone: 'Sun',
    texto: 'Feliz Páscoa! Tempo de renovação, renascimento e reflexão interior.',
    corFundo: '#F59E0B',
    corTexto: '#3B2F0B',
    when: { compute: 'pascoa' },
  },
  {
    key: 'tiradentes',
    nome: 'Tiradentes',
    icone: 'Flag',
    texto: '21 de Abril — Tiradentes, mártir da liberdade e da pátria.',
    corFundo: '#166534',
    corTexto: '#FFFFFF',
    when: { month: 4, day: 21 },
  },
  {
    key: 'dia_trabalho',
    nome: 'Dia do Trabalho',
    icone: 'Hammer',
    texto: '1º de Maio — Dia do Trabalho. Honramos o labor que dignifica o homem.',
    corFundo: '#B91C1C',
    corTexto: '#FFFFFF',
    when: { month: 5, day: 1 },
  },
  {
    key: 'dia_maes',
    nome: 'Dia das Mães',
    icone: 'Heart',
    texto: 'Feliz Dia das Mães! Gratidão eterna às que nos deram a vida e a primeira luz.',
    corFundo: '#DB2777',
    corTexto: '#FFFFFF',
    when: { compute: 'maes' },
  },
  {
    key: 'dia_namorados',
    nome: 'Dia dos Namorados',
    icone: 'HeartHandshake',
    texto: 'Dia dos Namorados — que o amor una os corações em harmonia.',
    corFundo: '#E11D48',
    corTexto: '#FFFFFF',
    when: { month: 6, day: 12 },
  },
  {
    key: 'dia_pais',
    nome: 'Dia dos Pais',
    icone: 'Heart',
    texto: 'Feliz Dia dos Pais! Homenagem a quem nos guia pelo exemplo e pela retidão.',
    corFundo: '#1D4ED8',
    corTexto: '#FFFFFF',
    when: { compute: 'pais' },
  },
  {
    key: 'dia_macom',
    nome: 'Dia do Maçom',
    icone: 'Compass',
    texto: '20 de Agosto — Dia do Maçom. Salve a Ordem e a Fraternidade Universal!',
    corFundo: '#B8860B',
    corTexto: '#FFF8E7',
    when: { month: 8, day: 20 },
  },
  {
    key: 'independencia',
    nome: 'Independência do Brasil',
    icone: 'Flag',
    texto: '7 de Setembro — Independência do Brasil. Viva a Pátria livre e soberana!',
    corFundo: '#15803D',
    corTexto: '#FFFFFF',
    when: { month: 9, day: 7 },
  },
  {
    key: 'dia_criancas',
    nome: 'Dia das Crianças',
    icone: 'Baby',
    texto: '12 de Outubro — Dia das Crianças. Que nunca falte luz e amor à infância.',
    corFundo: '#0EA5E9',
    corTexto: '#FFFFFF',
    when: { month: 10, day: 12 },
  },
  {
    key: 'dia_professor',
    nome: 'Dia do Professor',
    icone: 'GraduationCap',
    texto: '15 de Outubro — Dia do Professor. Honra a quem transmite o conhecimento.',
    corFundo: '#7C3AED',
    corTexto: '#FFFFFF',
    when: { month: 10, day: 15 },
  },
  {
    key: 'finados',
    nome: 'Finados',
    icone: 'Flower',
    texto: '2 de Novembro — Dia de Finados. Em memória dos Irmãos que passaram ao Oriente Eterno.',
    corFundo: '#374151',
    corTexto: '#F3F4F6',
    when: { month: 11, day: 2 },
  },
  {
    key: 'proclamacao',
    nome: 'Proclamação da República',
    icone: 'Flag',
    texto: '15 de Novembro — Proclamação da República do Brasil.',
    corFundo: '#166534',
    corTexto: '#FFFFFF',
    when: { month: 11, day: 15 },
  },
  {
    key: 'natal',
    nome: 'Natal',
    icone: 'TreePine',
    texto: 'Feliz Natal! Que a luz do Grande Arquiteto do Universo ilumine seu lar.',
    corFundo: '#991B1B',
    corTexto: '#FFF8E7',
    when: { month: 12, day: 25 },
  },
];

// ---- Cálculo de datas móveis ----
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthSunday(year: number, month: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (7 - first.getDay()) % 7; // dias até o primeiro domingo
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7);
}

export function faixaDateFor(def: FaixaDef, year: number): Date {
  const w = def.when;
  if ('month' in w) return new Date(year, w.month - 1, w.day);
  switch (w.compute) {
    case 'pascoa':
      return easterSunday(year);
    case 'carnaval': {
      const e = easterSunday(year);
      return new Date(e.getFullYear(), e.getMonth(), e.getDate() - 47); // Terça de Carnaval
    }
    case 'maes':
      return nthSunday(year, 5, 2);
    case 'pais':
      return nthSunday(year, 8, 2);
  }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Retorna a chave da faixa ativa hoje (se houver)
export function activeFaixaKey(today = new Date()): string | null {
  const year = today.getFullYear();
  for (const def of FAIXAS_DEFAULT) {
    if (sameDay(faixaDateFor(def, year), today)) return def.key;
  }
  return null;
}

export function faixaDateLabel(def: FaixaDef, year = new Date().getFullYear()): string {
  const d = faixaDateFor(def, year);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}
