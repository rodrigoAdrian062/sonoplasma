export interface StageAudio {
  id: string;
  etapa_id: string;
  nome: string;
  audio_url: string;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface StageAudioInsert {
  etapa_id: string;
  nome: string;
  audio_url: string;
  ordem: number;
}

export interface StageAudioUpdate {
  id: string;
  nome?: string;
  audio_url?: string;
  ordem?: number;
}
