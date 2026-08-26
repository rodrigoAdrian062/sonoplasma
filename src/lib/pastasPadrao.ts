import type { ClimaId } from './climas';

export interface PastaPadrao {
  nome: string;
  icone: string;
  cor: string;
  clima: ClimaId;
  descricao: string;
}

/**
 * Estrutura oficial de pastas do Manual do Mestre de Harmonia (cap. 2).
 * Ordem ritual: 01 Entrada → 09 Saída.
 */
export const PASTAS_PADRAO: PastaPadrao[] = [
  { nome: '01 Entrada', icone: 'Compass', cor: '#94A3B8', clima: 'transicao', descricao: 'Recepção e entrada dos Irmãos no Templo' },
  { nome: '02 Abertura', icone: 'Crown', cor: '#D4AF37', clima: 'solene', descricao: 'Abertura dos trabalhos e entrada de autoridades' },
  { nome: '03 Instrução', icone: 'BookOpen', cor: '#3B82F6', clima: 'reflexiva', descricao: 'Instruções e leituras' },
  { nome: '04 Peça de Arquitetura', icone: 'Bookmark', cor: '#3B82F6', clima: 'reflexiva', descricao: 'Peças de arquitetura e meditação' },
  { nome: '05 Homenagens', icone: 'Award', cor: '#EC4899', clima: 'emocional', descricao: 'Homenagens e reconhecimentos' },
  { nome: '06 Cadeia de União', icone: 'Heart', cor: '#22C55E', clima: 'fraternal', descricao: 'Cadeia de União e momentos de fraternidade' },
  { nome: '07 Encerramento', icone: 'Bell', cor: '#22C55E', clima: 'fraternal', descricao: 'Encerramento dos trabalhos' },
  { nome: '08 Confraternização', icone: 'Sparkles', cor: '#22C55E', clima: 'fraternal', descricao: 'Ágape e confraternização' },
  { nome: '09 Saída', icone: 'Flag', cor: '#94A3B8', clima: 'transicao', descricao: 'Saída do Templo' },
];
