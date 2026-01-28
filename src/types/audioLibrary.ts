export interface AudioLibraryItem {
  id: string;
  nome: string;
  audio_url: string;
  tamanho_bytes: number | null;
  tipo: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioLibraryInsert {
  nome: string;
  audio_url: string;
  tamanho_bytes?: number | null;
  tipo?: string | null;
}
