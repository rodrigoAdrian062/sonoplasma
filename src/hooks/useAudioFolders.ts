import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PASTAS_PADRAO } from '@/lib/pastasPadrao';

export interface AudioFolder {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
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

  const updateFolder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nome?: string; cor?: string | null; icone?: string | null }) => {
      const { error } = await supabase
        .from('sonoplastia_audios_pastas')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioFolders'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar pasta', description: error.message, variant: 'destructive' });
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

  const createDefaultFolders = useMutation({
    mutationFn: async () => {
      const existentes = new Set(folders.map((f) => f.nome.trim().toLowerCase()));
      const novas = PASTAS_PADRAO.filter((p) => !existentes.has(p.nome.toLowerCase()));
      if (novas.length === 0) return 0;
      const { error } = await supabase.from('sonoplastia_audios_pastas').insert(
        novas.map((p, i) => ({
          nome: p.nome,
          icone: p.icone,
          cor: p.cor,
          ordem: folders.length + i,
        })),
      );
      if (error) throw error;
      return novas.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['audioFolders'] });
      toast({
        title: count ? `${count} pasta(s) padrão criada(s)` : 'Estrutura já está completa',
        description: count ? 'Estrutura ritual 01 Entrada → 09 Saída pronta.' : undefined,
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar estrutura padrão', description: error.message, variant: 'destructive' });
    },
  });

  return { folders, isLoading, addFolder, renameFolder, updateFolder, deleteFolder, moveAudioToFolder, createDefaultFolders };
}

