import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../lib/supabaseService';

export function useBusinessQuery() {
  const queryClient = useQueryClient();

  const businessQuery = useQuery({
    queryKey: ['business'],
    queryFn: () => SupabaseService.getMyBusiness()
  });

  const updateBusinessMutation = useMutation({
    mutationFn: ({ businessId, name, logoUrl }: { businessId: string; name?: string; logoUrl?: string | null }) =>
      SupabaseService.updateBusiness(businessId, name, logoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: ({ businessId, base64Image }: { businessId: string; base64Image: string }) =>
      SupabaseService.uploadBusinessLogo(businessId, base64Image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    }
  });

  return {
    business: businessQuery.data || null,
    isLoading: businessQuery.isLoading,
    isError: businessQuery.isError,
    refetchBusiness: businessQuery.refetch,
    updateBusiness: updateBusinessMutation.mutateAsync,
    uploadLogo: uploadLogoMutation.mutateAsync,
    isUpdating: updateBusinessMutation.isPending || uploadLogoMutation.isPending
  };
}
