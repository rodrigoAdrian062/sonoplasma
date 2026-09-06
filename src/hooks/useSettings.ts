import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppSettings } from '@/types/settings';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = (data || []) as AppSettings[];
      // Prefer the user's own settings; fall back to the shared model row.
      const own = user?.id ? rows.find((r) => (r as any).owner_id === user.id) : undefined;
      return (own ?? rows[0] ?? null) as AppSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      // Always update the row currently in use (avoids creating duplicates).
      if (settings?.id) {
        const { data, error } = await supabase
          .from('sonoplastia_configuracoes')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // No settings row yet -> create the first one.
      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .insert({ ...updates } as any)
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
