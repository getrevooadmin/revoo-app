import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService, LoyaltyCampaign } from '../../lib/supabaseService';

export function useCampaignsQuery(businessId?: string | null) {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => SupabaseService.getCampaigns(businessId!),
    enabled: !!businessId
  });

  const campaigns = campaignsQuery.data || [];
  const activeCampaign = campaigns.find((c: LoyaltyCampaign) => c.status === 'active') || null;

  const createCampaignMutation = useMutation({
    mutationFn: (campaignData: Omit<LoyaltyCampaign, 'id' | 'business_id' | 'created_at'>) =>
      SupabaseService.createCampaign(businessId!, campaignData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', businessId] });
    }
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: Partial<LoyaltyCampaign> }) =>
      SupabaseService.updateCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', businessId] });
      queryClient.invalidateQueries({ queryKey: ['codes', businessId] });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => SupabaseService.deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', businessId] });
    }
  });

  return {
    campaigns,
    activeCampaign,
    isLoading: campaignsQuery.isLoading,
    isError: campaignsQuery.isError,
    createCampaign: createCampaignMutation.mutateAsync,
    updateCampaign: (campaignId: string, data: Partial<LoyaltyCampaign>) => updateCampaignMutation.mutateAsync({ campaignId, data }),
    deleteCampaign: deleteCampaignMutation.mutateAsync,
    isSaving: createCampaignMutation.isPending || updateCampaignMutation.isPending || deleteCampaignMutation.isPending
  };
}
