import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CeremonySection = Tables<'sonoplastia_secoes'>;
export type CeremonySectionInsert = TablesInsert<'sonoplastia_secoes'>;
export type CeremonySectionUpdate = TablesUpdate<'sonoplastia_secoes'>;
