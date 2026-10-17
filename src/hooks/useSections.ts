import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { toast } from '@/hooks/use-toast';
import { useUserAccess } from '@/hooks/useUserAccess';
import { hasPermission } from '@/lib/access';

export function useSections() {
  const queryClient = useQueryClient();
  const { access } = useUserAccess();
  const canCreateUnlimitedSections = hasPermission(access, 'canCreateUnlimitedSections');

  const ensureSectionQuota = (count: number) => {
    if (!canCreateUnlimitedSections && count >= 3) {
      throw new Error('Seu plano gratuito permite até 3 seções. Atualize para Premium para criar mais.');
    }
  };

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
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });

  const createSection = useMutation({
    mutationFn: async (section: CeremonySectionInsert) => {
      ensureSectionQuota(sections.length);

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
      toast({ title: 'Seção criada com sucesso', description: 'Agora você pode abrir a seção e adicionar etapas.' });
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
      toast({ title: 'Seção atualizada com sucesso', description: 'As alterações já estão disponíveis na lista de seções.' });
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
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
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
  
  const cloneSection = useMutation({
    mutationFn: async (id: string) => {
      ensureSectionQuota(sections.length);

      // 1. Fetch original section
      const { data: originalSection, error: sectionError } = await supabase
        .from('sonoplastia_secoes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sectionError || !originalSection) throw sectionError || new Error('Seção não encontrada');
      
      // 2. Create new section
      const { data: newSection, error: newSectionError } = await supabase
        .from('sonoplastia_secoes')
        .insert({
          nome: `${originalSection.nome} (cópia)`,
          descricao: originalSection.descricao,
          icone: originalSection.icone,
          icone_url: originalSection.icone_url,
          ordem: sections.length + 1,
          ativo: true,
          reproducao_continua: originalSection.reproducao_continua,
        })
        .select()
        .single();
      
      if (newSectionError || !newSection) throw newSectionError || new Error('Erro ao criar nova seção');
      const clonedStageIds: string[] = [];
      try {
        const { data: originalStages, error: stagesError } = await supabase
          .from('sonoplastia_etapas')
          .select('*')
          .eq('secao_id', id)
          .order('ordem', { ascending: true });

        if (stagesError) throw stagesError;

        for (const stage of originalStages ?? []) {
          const { data: newStage, error: newStageError } = await supabase
            .from('sonoplastia_etapas')
            .insert({
              secao_id: newSection.id,
              nome_simbolico: stage.nome_simbolico,
              descricao: stage.descricao,
              tempo_padrao: stage.tempo_padrao,
              icone: stage.icone,
              icone_url: stage.icone_url,
              ordem: stage.ordem,
              ativo: true,
              oculto: stage.oculto,
              volume_config: stage.volume_config,
              ritual_detalhes: stage.ritual_detalhes,
              audio_url: stage.audio_url,
              fundo_musicas: stage.fundo_musicas,
            })
            .select()
            .single();

          if (newStageError || !newStage) {
            throw newStageError ?? new Error('Erro ao criar uma etapa da cópia');
          }
          clonedStageIds.push(newStage.id);

          const { data: originalAudios, error: audiosError } = await supabase
            .from('sonoplastia_etapa_audios')
            .select('*')
            .eq('etapa_id', stage.id);

          if (audiosError) throw audiosError;

          if (originalAudios?.length) {
            const newAudios = originalAudios.map((audio) => ({
              etapa_id: newStage.id,
              nome: audio.nome,
              audio_url: audio.audio_url,
              ordem: audio.ordem,
              volume_config: audio.volume_config,
            }));

            const { error: insertAudiosError } = await supabase
              .from('sonoplastia_etapa_audios')
              .insert(newAudios);

            if (insertAudiosError) throw insertAudiosError;
          }
        }

        return newSection;
      } catch (error) {
        const cleanupErrors: string[] = [];
        if (clonedStageIds.length > 0) {
          const { error: stagesCleanupError } = await supabase
            .from('sonoplastia_etapas')
            .delete()
            .in('id', clonedStageIds);
          if (stagesCleanupError) cleanupErrors.push(stagesCleanupError.message);
        }

        const { error: sectionCleanupError } = await supabase
          .from('sonoplastia_secoes')
          .delete()
          .eq('id', newSection.id);
        if (sectionCleanupError) cleanupErrors.push(sectionCleanupError.message);

        if (cleanupErrors.length > 0) {
          const originalMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`${originalMessage}. A limpeza da cópia incompleta também falhou: ${cleanupErrors.join('; ')}`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
      toast({ title: 'Seção clonada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao clonar seção', description: error.message, variant: 'destructive' });
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
    cloneSection,
  };
}
