import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConsumerSupabaseService } from '../../lib/supabaseService';

export function useBusinessesQuery() {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () => ConsumerSupabaseService.getBusinesses()
  });
}

export function useActiveCampaignQuery(businessId?: string) {
  return useQuery({
    queryKey: ['active-campaign', businessId],
    queryFn: () => ConsumerSupabaseService.getActiveCampaign(businessId!),
    enabled: !!businessId
  });
}

export function useCustomerStatusQuery(phone?: string, businessId?: string) {
  const queryClient = useQueryClient();

  const customerStatusQuery = useQuery({
    queryKey: ['customer-status', phone, businessId],
    queryFn: () => ConsumerSupabaseService.getCustomerStatus(phone!, businessId!),
    enabled: !!phone && !!businessId
  });

  const submitInteractionMutation = useMutation({
    mutationFn: async (interactionData: {
      business_id: string;
      customer_phone: string;
      invoice_number?: string | null;
      feedback_text?: string;
    }) => {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interactionData)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-status', variables.customer_phone, variables.business_id] });
    }
  });

  return {
    customerStatus: customerStatusQuery.data || null,
    isLoading: customerStatusQuery.isLoading,
    isError: customerStatusQuery.isError,
    refetchStatus: customerStatusQuery.refetch,
    submitInteraction: submitInteractionMutation.mutateAsync,
    isSubmitting: submitInteractionMutation.isPending
  };
}
