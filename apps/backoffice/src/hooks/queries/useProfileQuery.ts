import { useQuery } from '@tanstack/react-query';
import { SupabaseService, StaffAccount, Permission } from '../../lib/supabaseService';

export function useProfileQuery() {
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => SupabaseService.getMyProfile(),
    staleTime: 1000 * 60 * 5, // Cache profile data for 5 minutes
  });

  const profile = profileQuery.data || null;
  const permissions: Permission[] = profile?.custom_role?.permissions || [];
  const isLoading = profileQuery.isLoading;

  const hasPermission = (perm: Permission): boolean => {
    if (isLoading) return false;
    if (!profile) return false;
    return permissions.includes('global_admin') || permissions.includes(perm);
  };

  return {
    profile,
    permissions,
    isLoading,
    isError: profileQuery.isError,
    refetchProfile: profileQuery.refetch,
    hasPermission
  };
}
