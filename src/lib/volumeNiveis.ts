/**
 * Escala de volume ritual — Manual do Mestre de Harmonia (cap. 13).
 * Cinco níveis nomeados, aplicáveis com um toque em qualquer controle de volume.
 */
export interface NivelVolume {
  nivel: 1 | 2 | 3 | 4 | 5;
  nome: string;
  /** Volume em fração (0-1). */
  valor: number;
  /** Uso recomendado pelo manual. */
  uso: string;
}

export const NIVEIS_VOLUME: NivelVolume[] = [
  { nivel: 1, nome: 'Quase silêncio', valor: 0.05, uso: 'Reflexão profunda' },
  { nivel: 2, nome: 'Muito baixo', valor: 0.1, uso: 'Acompanhamento de fala' },
  { nivel: 3, nome: 'Baixo', valor: 0.2, uso: 'Ambiente' },
  { nivel: 4, nome: 'Moderado', valor: 0.35, uso: 'Entrada ou saída' },
  { nivel: 5, nome: 'Solene', valor: 0.5, uso: 'Momentos especiais' },
];

/** Nível ritual mais próximo do volume atual (ou null se acima da escala). */
export function nivelAtual(volume: number): NivelVolume | null {
  if (volume > 0.6) return null;
  let melhor: NivelVolume | null = null;
  let dist = Infinity;
  for (const n of NIVEIS_VOLUME) {
    const d = Math.abs(n.valor - volume);
    if (d < dist) {
      dist = d;
      melhor = n;
    }
  }
  return dist <= 0.03 ? melhor : null;
}
