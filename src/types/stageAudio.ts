export interface StageAudio {
  id: string;
  etapa_id: string;
  nome: string;
  audio_url: string;
  ordem: number;
  volume_config?: number | null;
  created_at: string;
  updated_at: string;
}

export interface StageAudioInsert {
  etapa_id: string;
  nome: string;
  audio_url: string;
  ordem: number;
  volume_config?: number | null;
}

export interface StageAudioUpdate {
  id: string;
  nome?: string;
  audio_url?: string;
  ordem?: number;
  volume_config?: number | null;
}
