import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { toast } from '@/hooks/use-toast';

export function useSections() {
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading, error } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_secoes')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as CeremonySection[];
    },
  });

  const createSection = useMutation({
    mutationFn: async (section: CeremonySectionInsert) => {
      const { data, error } = await supabase
        .from('sonoplastia_secoes')
        .insert(section)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({ title: 'Seção criada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar seção', description: error.message, variant: 'destructive' });
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: CeremonySectionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('sonoplastia_secoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({ title: 'Seção atualizada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar seção', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      // First delete all stages belonging to this section
      const { error: stagesError } = await supabase
        .from('sonoplastia_etapas')
        .delete()
        .eq('secao_id', id);

      if (stagesError) throw stagesError;

      // Then delete the section
      const { error } = await supabase
        .from('sonoplastia_secoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['allStageAudios'] });
      toast({ title: 'Seção e etapas removidas com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover seção', description: error.message, variant: 'destructive' });
    },
  });

  const reorderSections = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        ordem: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('sonoplastia_secoes')
          .update({ ordem: update.ordem })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  return {
    sections,
    isLoading,
    error,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  };
}
