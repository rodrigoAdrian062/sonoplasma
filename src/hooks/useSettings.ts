import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppSettings } from '@/types/settings';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export function useSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = data || [];
      // Prefer the user's settings; use the shared row as read-only defaults.
      const own = user?.id ? rows.find((r) => r.owner_id === user.id) : undefined;
      const shared = rows.find((r) => r.owner_id === null);
      return own ?? shared ?? rows[0] ?? null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      if (!user?.id) throw new Error('É necessário entrar na conta para salvar as configurações.');

      const canUpdateCurrentRow = settings?.id && (
        settings.owner_id === user.id
        || (isSuperAdmin && settings.owner_id === null)
      );
      if (canUpdateCurrentRow) {
        const { data, error } = await supabase
          .from('sonoplastia_configuracoes')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // A regular user gets a private copy rather than editing shared defaults.
      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .insert({ ...updates, owner_id: user.id })
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
