import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../lib/supabaseService';

export function useInteractionsQuery(businessId?: string | null) {
  const queryClient = useQueryClient();

  const interactionsQuery = useQuery({
    queryKey: ['interactions', businessId],
    queryFn: () => SupabaseService.getRecentInteractions(businessId!),
    enabled: !!businessId
  });

  const redeemPointsMutation = useMutation({
    mutationFn: ({ customerPhone, pointsToRedeem, customerPin }: { customerPhone: string; pointsToRedeem: number; customerPin?: string }) =>
      SupabaseService.redeemPoints(businessId!, customerPhone, pointsToRedeem, customerPin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions', businessId] });
      queryClient.invalidateQueries({ queryKey: ['codes', businessId] });
    }
  });

  return {
    interactions: interactionsQuery.data || [],
    isLoading: interactionsQuery.isLoading,
    isError: interactionsQuery.isError,
    redeemPoints: (customerPhone: string, pointsToRedeem: number, customerPin?: string) =>
      redeemPointsMutation.mutateAsync({ customerPhone, pointsToRedeem, customerPin }),
    isRedeeming: redeemPointsMutation.isPending
  };
}
