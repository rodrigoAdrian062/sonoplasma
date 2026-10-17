import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate } from '@/types/ceremony';
import { toast } from '@/hooks/use-toast';

export function useStages() {
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading, error } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_etapas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as CeremonyStage[];
    },
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });

  const createStage = useMutation({
    mutationFn: async (stage: CeremonyStageInsert) => {
      const { data, error } = await supabase
        .from('sonoplastia_etapas')
        .insert({
          ...stage,
          secao_id: stage.secao_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast({ title: 'Etapa criada com sucesso', description: 'Você já pode adicionar áudios e configurar o tempo.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar etapa', description: error.message, variant: 'destructive' });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: CeremonyStageUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('sonoplastia_etapas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast({ title: 'Etapa atualizada com sucesso', description: 'As alterações já estão salvas na seção.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar etapa', description: error.message, variant: 'destructive' });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sonoplastia_etapas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast({ title: 'Etapa removida com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover etapa', description: error.message, variant: 'destructive' });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        ordem: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('sonoplastia_etapas')
          .update({ ordem: update.ordem })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const copyStageToSection = useMutation({
    mutationFn: async ({ stageId, targetSectionId }: { stageId: string; targetSectionId: string }) => {
      const { data: origin, error: readErr } = await supabase
        .from('sonoplastia_etapas')
        .select('*')
        .eq('id', stageId)
        .single();
      if (readErr || !origin) throw readErr ?? new Error('Etapa não encontrada');

      const { data: last, error: lastErr } = await supabase
        .from('sonoplastia_etapas')
        .select('ordem')
        .eq('secao_id', targetSectionId)
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastErr) throw lastErr;
      const nextOrdem = (last?.ordem ?? 0) + 1;

      const { data: newStage, error: insErr } = await supabase
        .from('sonoplastia_etapas')
        .insert({
          nome_simbolico: `${origin.nome_simbolico} (cópia)`,
          descricao: origin.descricao,
          tempo_padrao: origin.tempo_padrao,
          icone: origin.icone,
          icone_url: origin.icone_url ?? null,
          ordem: nextOrdem,
          ativo: true,
          oculto: origin.oculto,
          volume_config: origin.volume_config,
          ritual_detalhes: origin.ritual_detalhes,
          audio_url: origin.audio_url,
          fundo_musicas: origin.fundo_musicas,
          secao_id: targetSectionId,
        })
        .select()
        .single();
      if (insErr || !newStage) throw insErr ?? new Error('Erro ao criar cópia');

      try {
        const { data: audios, error: audiosErr } = await supabase
          .from('sonoplastia_etapa_audios')
          .select('*')
          .eq('etapa_id', stageId);
        if (audiosErr) throw audiosErr;

        if (audios?.length) {
          const toInsert = audios.map((audio) => ({
            etapa_id: newStage.id,
            nome: audio.nome,
            audio_url: audio.audio_url,
            ordem: audio.ordem,
            volume_config: audio.volume_config,
          }));
          const { error: audioErr } = await supabase.from('sonoplastia_etapa_audios').insert(toInsert);
          if (audioErr) throw audioErr;
        }
      } catch (error) {
        const { error: cleanupError } = await supabase
          .from('sonoplastia_etapas')
          .delete()
          .eq('id', newStage.id);
        if (cleanupError) {
          const originalMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`${originalMessage}. A cópia incompleta também não pôde ser removida: ${cleanupError.message}`);
        }
        throw error;
      }
      return newStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
      toast({ title: 'Etapa copiada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao copiar etapa', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStageVisibility = useMutation({
    mutationFn: async ({ id, oculto }: { id: string; oculto: boolean }) => {
      const { data, error } = await supabase
        .from('sonoplastia_etapas')
        .update({ oculto })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      // Also invalidate section-specific stages if needed
      if (data.secao_id) {
        queryClient.invalidateQueries({ queryKey: ['stages', data.secao_id] });
      }
      toast({ 
        title: data.oculto ? 'Etapa oculta' : 'Etapa visível',
        description: data.oculto ? 'A etapa não aparecerá na apresentação.' : 'A etapa aparecerá na apresentação.'
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao alterar visibilidade', description: error.message, variant: 'destructive' });
    },
  });

  return {
    stages,
    isLoading,
    error,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    copyStageToSection,
    toggleStageVisibility,
  };
}
