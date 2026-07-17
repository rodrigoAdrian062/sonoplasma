import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StageAudio, StageAudioInsert, StageAudioUpdate } from '@/types/stageAudio';
import { toast } from '@/hooks/use-toast';

export function useStageAudios(etapaId?: string) {
  const queryClient = useQueryClient();

  const { data: audios = [], isLoading, error } = useQuery({
    queryKey: ['stage-audios', etapaId],
    queryFn: async () => {
      if (!etapaId) return [];
      
      const { data, error } = await supabase
        .from('sonoplastia_etapa_audios')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as StageAudio[];
    },
    enabled: !!etapaId,
  });

  const createAudio = useMutation({
    mutationFn: async (audio: StageAudioInsert) => {
      const { data, error } = await supabase
        .from('sonoplastia_etapa_audios')
        .insert(audio)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stage-audios', variables.etapa_id] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao adicionar áudio', description: error.message, variant: 'destructive' });
    },
  });

  const updateAudio = useMutation({
    mutationFn: async ({ id, ...updates }: StageAudioUpdate & { etapa_id: string }) => {
      const { data, error } = await supabase
        .from('sonoplastia_etapa_audios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stage-audios', variables.etapa_id] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar áudio', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAudio = useMutation({
    mutationFn: async ({ id, etapa_id }: { id: string; etapa_id: string }) => {
      const { error } = await supabase
        .from('sonoplastia_etapa_audios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { etapa_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stage-audios', result.etapa_id] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover áudio', description: error.message, variant: 'destructive' });
    },
  });

  const saveAudios = useMutation({
    mutationFn: async ({ etapa_id, audios }: { etapa_id: string; audios: Array<{ nome: string; audio_url: string }> }) => {
      // Delete existing audios for this stage
      const { error: deleteError } = await supabase
        .from('sonoplastia_etapa_audios')
        .delete()
        .eq('etapa_id', etapa_id);

      if (deleteError) throw deleteError;

      // Insert new audios
      if (audios.length > 0) {
        const audiosToInsert = audios.map((audio, index) => ({
          etapa_id,
          nome: audio.nome,
          audio_url: audio.audio_url,
          ordem: index,
        }));

        const { error: insertError } = await supabase
          .from('sonoplastia_etapa_audios')
          .insert(audiosToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stage-audios', variables.etapa_id] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-audios'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar áudios', description: error.message, variant: 'destructive' });
    },
  });

  return {
    audios,
    isLoading,
    error,
    createAudio,
    updateAudio,
    deleteAudio,
    saveAudios,
  };
}

// Hook to fetch all audios for all stages
export function useAllStageAudios() {
  const { data: allAudios = [], isLoading, error } = useQuery({
    queryKey: ['all-stage-audios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_etapa_audios')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as StageAudio[];
    },
  });

  // Group audios by stage id — memoizado para preservar identidade entre renders
  // e evitar re-execução de effects/memos que dependem deste objeto.
  const audiosByStageId = useMemo(() => {
    return allAudios.reduce((acc, audio) => {
      if (!acc[audio.etapa_id]) acc[audio.etapa_id] = [];
      acc[audio.etapa_id].push(audio);
      return acc;
    }, {} as Record<string, StageAudio[]>);
  }, [allAudios]);

  return {
    allAudios,
    audiosByStageId,
    isLoading,
    error,
  };
}
