import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AudioFolder {
  id: string;
  nome: string;
  icone: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useAudioFolders() {
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['audioFolders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_audios_pastas')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as AudioFolder[];
    },
  });

  const addFolder = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('sonoplastia_audios_pastas')
        .insert({ nome, ordem: folders.length })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioFolders'] });
      toast({ title: 'Pasta criada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar pasta', description: error.message, variant: 'destructive' });
    },
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('sonoplastia_audios_pastas')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioFolders'] });
      toast({ title: 'Pasta renomeada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao renomear pasta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sonoplastia_audios_pastas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioFolders'] });
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
      toast({ title: 'Pasta excluída' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir pasta', description: error.message, variant: 'destructive' });
    },
  });

  const moveAudioToFolder = useMutation({
    mutationFn: async ({ audioId, folderId }: { audioId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .update({ pasta_id: folderId })
        .eq('id', audioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
    },
  });

  return { folders, isLoading, addFolder, renameFolder, deleteFolder, moveAudioToFolder };
}
