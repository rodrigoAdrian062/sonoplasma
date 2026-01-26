import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppSettings } from '@/types/settings';
import { toast } from 'sonner';

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as AppSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      if (!settings?.id) {
        throw new Error('Settings not found');
      }

      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações');
      console.error('Settings update error:', error);
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
