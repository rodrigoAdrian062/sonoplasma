import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  return { isSuperAdmin, isLoading };
}
