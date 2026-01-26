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
        .insert(stage)
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

  return {
    stages,
    isLoading,
    error,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  };
}
