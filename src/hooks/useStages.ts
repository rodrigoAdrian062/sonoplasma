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
      toast({ title: 'Etapa criada com sucesso' });
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
      toast({ title: 'Etapa atualizada com sucesso' });
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

      const { data: last } = await supabase
        .from('sonoplastia_etapas')
        .select('ordem')
        .eq('secao_id', targetSectionId)
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrdem = (last?.ordem ?? 0) + 1;

      const { data: newStage, error: insErr } = await supabase
        .from('sonoplastia_etapas')
        .insert({
          nome_simbolico: `${origin.nome_simbolico} (cópia)`,
          descricao: origin.descricao,
          tempo_padrao: origin.tempo_padrao,
          icone: origin.icone,
          icone_url: (origin as any).icone_url ?? null,
          ordem: nextOrdem,
          ativo: true,
          secao_id: targetSectionId,
        })
        .select()
        .single();
      if (insErr || !newStage) throw insErr ?? new Error('Erro ao criar cópia');

      const { data: audios } = await supabase
        .from('sonoplastia_etapa_audios')
        .select('*')
        .eq('etapa_id', stageId);
      if (audios && audios.length > 0) {
        const toInsert = audios.map((a) => ({
          etapa_id: newStage.id,
          nome: a.nome,
          audio_url: a.audio_url,
          ordem: a.ordem,
        }));
        const { error: audioErr } = await supabase.from('sonoplastia_etapa_audios').insert(toInsert);
        if (audioErr) throw audioErr;
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

  return {
    stages,
    isLoading,
    error,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    copyStageToSection,
  };
}
