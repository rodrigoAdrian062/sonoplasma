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
    staleTime: 60_000,
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
  
  const cloneSection = useMutation({
    mutationFn: async (id: string) => {
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
      
      // 3. Fetch original stages
      const { data: originalStages, error: stagesError } = await supabase
        .from('sonoplastia_etapas')
        .select('*')
        .eq('secao_id', id)
        .order('ordem', { ascending: true });
      
      if (stagesError) throw stagesError;
      
      // 4. Clone each stage and its audios
      if (originalStages && originalStages.length > 0) {
        for (const stage of originalStages) {
          // Create new stage
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
              volume_config: stage.volume_config,
              ritual_detalhes: stage.ritual_detalhes,
              audio_url: stage.audio_url,
              fundo_musicas: stage.fundo_musicas,
            })
            .select()
            .single();
          
          if (newStageError || !newStage) throw newStageError;
          
          // Fetch and clone audios for this stage
          const { data: originalAudios, error: audiosError } = await supabase
            .from('sonoplastia_etapa_audios')
            .select('*')
            .eq('etapa_id', stage.id);
          
          if (audiosError) throw audiosError;
          
          if (originalAudios && originalAudios.length > 0) {
            const newAudios = originalAudios.map(a => ({
              etapa_id: newStage.id,
              nome: a.nome,
              audio_url: a.audio_url,
              ordem: a.ordem,
              volume_config: a.volume_config,
            }));
            
            const { error: insertAudiosError } = await supabase
              .from('sonoplastia_etapa_audios')
              .insert(newAudios);
            
            if (insertAudiosError) throw insertAudiosError;
          }
        }
      }
      
      return newSection;
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
