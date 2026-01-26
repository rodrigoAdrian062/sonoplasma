export interface CeremonyStage {
  id: string;
  symbolicName: string;
  description: string;
  audioUrl: string;
  defaultTime: number; // in seconds
  order: number;
  icon: string;
}

export interface StageExecution {
  stageId: string;
  startTime: Date | null;
  endTime: Date | null;
  executedTime: number;
  status: 'idle' | 'playing' | 'paused' | 'completed';
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused';
