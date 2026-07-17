import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CeremonyStage } from '@/types/ceremony';
import { AudioLibraryItem } from '@/types/audioLibrary';
import { StageAudio } from '@/types/stageAudio';
import { matchAudiosForStage } from '@/lib/autoMatchAudios';

interface RunArgs {
  stages: CeremonyStage[];
  library: AudioLibraryItem[];
  existingByStageId: Record<string, StageAudio[]>;
  perStage?: number;
}

export function useAutoSuggestAudios() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const run = async ({ stages, library, existingByStageId, perStage = 5 }: RunArgs) => {
    if (isRunning) return;
    if (library.length === 0) {
      toast({ title: 'Biblioteca vazia', description: 'Adicione músicas antes de sugerir.', variant: 'destructive' });
      return;
    }
    setIsRunning(true);
    try {
      const inserts: Array<{ etapa_id: string; nome: string; audio_url: string; ordem: number }> = [];
      let stagesTouched = 0;

      for (const stage of stages) {
        const existing = existingByStageId[stage.id] || [];
        const excludeUrls = new Set(existing.map((a) => a.audio_url));
        const slots = perStage - existing.length;
        if (slots <= 0) continue;
        const matches = matchAudiosForStage(stage, library, slots, excludeUrls);
        if (matches.length === 0) continue;
        stagesTouched += 1;
        let ordem = existing.length;
        for (const { audio } of matches) {
          inserts.push({
            etapa_id: stage.id,
            nome: audio.nome,
            audio_url: audio.audio_url,
            ordem: ordem++,
          });
        }
      }

      if (inserts.length === 0) {
        toast({ title: 'Nenhuma sugestão encontrada', description: 'Não achei músicas com títulos compatíveis com as etapas.' });
        return;
      }

      // Insert in chunks
      const chunkSize = 100;
      for (let i = 0; i < inserts.length; i += chunkSize) {
        const chunk = inserts.slice(i, i + chunkSize);
        const { error } = await supabase.from('sonoplastia_etapa_audios').insert(chunk);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
      await queryClient.invalidateQueries({ queryKey: ['stage-audios'] });

      toast({
        title: 'Sugestões aplicadas',
        description: `${inserts.length} músicas adicionadas em ${stagesTouched} etapa(s).`,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao sugerir músicas', description: e.message, variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  return { run, isRunning };
}
