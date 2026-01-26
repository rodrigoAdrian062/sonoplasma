import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CeremonyStage = Tables<'sonoplastia_etapas'>;
export type CeremonyStageInsert = TablesInsert<'sonoplastia_etapas'>;
export type CeremonyStageUpdate = TablesUpdate<'sonoplastia_etapas'>;

export type StageExecution = Tables<'sonoplastia_execucoes'>;

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export const ICON_OPTIONS = [
  { value: 'flame', label: 'Chama' },
  { value: 'compass', label: 'Compasso' },
  { value: 'eye', label: 'Olho' },
  { value: 'columns', label: 'Colunas' },
  { value: 'book-open', label: 'Livro' },
  { value: 'wind', label: 'Vento' },
  { value: 'star', label: 'Estrela' },
  { value: 'sun', label: 'Sol' },
  { value: 'moon', label: 'Lua' },
  { value: 'heart', label: 'Coração' },
];
