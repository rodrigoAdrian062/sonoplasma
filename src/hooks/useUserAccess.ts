import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { buildPermissions, normalizePermissions, type AccessPlan, type UserAccess } from '@/lib/access';

export function useUserAccess() {
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ['user-access', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserAccess> => {
      const uid = user?.id;
      if (!uid) {
        return {
          plan: 'free',
          isAdmin: false,
          permissions: buildPermissions('free'),
        };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, permissions')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;

      const plan = (profile?.plan as AccessPlan | undefined) ?? 'free';
      const permissions = normalizePermissions((profile?.permissions as Record<string, boolean> | null) ?? buildPermissions(plan));

      return {
        plan,
        isAdmin: !!isSuperAdmin,
        permissions,
      };
    },
  });

  return {
    access: data ?? {
      plan: 'free',
      isAdmin: !!isSuperAdmin,
      permissions: buildPermissions('free'),
    },
    isLoading: isLoading || roleLoading,
    isAdmin: !!isSuperAdmin,
  };
}
