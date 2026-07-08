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
        .select('*');

      if (error) throw error;
      const rows = (data || []) as AppSettings[];
      // Prefer the user's own settings; fall back to the shared model row.
      const own = rows.find((r) => (r as any).owner_id === user?.id);
      return (own ?? rows[0] ?? null) as AppSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const isOwn = settings && (settings as any).owner_id === user?.id;

      // Editing own settings (or shared row as super admin) -> update in place.
      if (settings?.id && (isOwn || (settings as any).owner_id == null)) {
        const { data, error } = await supabase
          .from('sonoplastia_configuracoes')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Regular user without own settings -> create a personal copy.
      const base: any = { ...(settings || {}) };
      delete base.id;
      delete base.owner_id;
      delete base.created_at;
      delete base.updated_at;

      const { data, error } = await supabase
        .from('sonoplastia_configuracoes')
        .insert({ ...base, ...updates })
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
