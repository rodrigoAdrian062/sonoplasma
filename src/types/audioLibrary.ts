export interface AudioLibraryItem {
  id: string;
  nome: string;
  audio_url: string;
  tamanho_bytes: number | null;
  tipo: string | null;
  pasta_id: string | null;
  duracao_segundos: number | null;
  created_at: string;
  updated_at: string;
  clima?: string | null;
}

export interface AudioLibraryInsert {
  nome: string;
  audio_url: string;
  tamanho_bytes?: number | null;
  tipo?: string | null;
  duracao_segundos?: number | null;
}

/** Formata segundos em mm:ss (ou h:mm:ss). */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
