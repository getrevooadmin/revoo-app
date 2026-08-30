import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../lib/supabaseService';

export function useCodesQuery(businessId?: string | null) {
  const queryClient = useQueryClient();

  const codesQuery = useQuery({
    queryKey: ['codes', businessId],
    queryFn: () => SupabaseService.getPurchaseCodes(businessId!),
    enabled: !!businessId,
    refetchInterval: 5000
  });

  const generateCodeMutation = useMutation({
    mutationFn: ({ campaignId, purchaseAmount, invoiceNumber }: { campaignId?: string; purchaseAmount?: number; invoiceNumber?: string | null }) =>
      SupabaseService.generatePurchaseCode(businessId!, campaignId, purchaseAmount, invoiceNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes', businessId] });
    }
  });

  const deactivateCodeMutation = useMutation({
    mutationFn: (code: string) => SupabaseService.deactivateCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes', businessId] });
    }
  });

  const setReadyForScanMutation = useMutation({
    mutationFn: (code: string) => SupabaseService.setReadyForScan(businessId!, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes', businessId] });
    }
  });

  return {
    codes: codesQuery.data || [],
    isLoading: codesQuery.isLoading,
    isError: codesQuery.isError,
    generateCode: (campaignId?: string, purchaseAmount?: number, invoiceNumber?: string | null) =>
      generateCodeMutation.mutateAsync({ campaignId, purchaseAmount, invoiceNumber }),
    deactivateCode: deactivateCodeMutation.mutateAsync,
    setReadyForScan: setReadyForScanMutation.mutateAsync,
    isGenerating: generateCodeMutation.isPending
  };
}
