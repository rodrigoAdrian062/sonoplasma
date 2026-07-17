import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Roteiro {
  id: string;
  owner_id: string;
  secao_id: string | null;
  titulo: string;
  conteudo: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export function useRoteiros() {
  const qc = useQueryClient();

  const { data: roteiros = [], isLoading } = useQuery({
    queryKey: ['roteiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_roteiros' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Roteiro[];
    },
  });

  const upsertRoteiro = useMutation({
    mutationFn: async (r: Partial<Roteiro> & { id?: string }) => {
      if (r.id) {
        const { data, error } = await supabase
          .from('sonoplastia_roteiros' as any)
          .update({ titulo: r.titulo, conteudo: r.conteudo, is_template: r.is_template ?? false })
          .eq('id', r.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('sonoplastia_roteiros' as any)
        .insert({
          titulo: r.titulo || 'Novo Roteiro',
          conteudo: r.conteudo || '',
          secao_id: r.secao_id ?? null,
          is_template: r.is_template ?? false,
          owner_id: user.user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roteiros'] }),
    onError: (e: any) => toast.error(e?.message || 'Erro ao salvar roteiro'),
  });

  const deleteRoteiro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sonoplastia_roteiros' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roteiros'] });
      toast.success('Roteiro excluído');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao excluir'),
  });

  return { roteiros, isLoading, upsertRoteiro, deleteRoteiro };
}

export function useRoteiroBySection(secaoId: string | undefined) {
  return useQuery({
    queryKey: ['roteiro-secao', secaoId],
    queryFn: async () => {
      if (!secaoId) return null;
      const { data, error } = await supabase
        .from('sonoplastia_roteiros' as any)
        .select('*')
        .eq('secao_id', secaoId)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as Roteiro | null;
    },
    enabled: !!secaoId,
  });
}
