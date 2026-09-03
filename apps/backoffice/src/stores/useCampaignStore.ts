import { create } from 'zustand';

export interface CampaignTier {
  id?: string;
  title: string;
  target_points: number;
  prize_description: string;
  monetary_value?: number;
  icon?: string;
}

export interface CampaignMultiplier {
  id?: string;
  title: string;
  multiplier: number;
  description?: string;
  applies_to?: string;
  badge_text?: string;
  start_date?: string;
  end_date?: string;
  never_expires?: boolean;
  is_active: boolean;
}

interface CampaignState {
  filter: 'all' | 'active' | 'inactive';
  isEditing: boolean;
  editingCampaignId: string | null;
  formTitle: string;
  formPrize: string;
  formPoints: number | '';
  formPointsRewarded: number | '';
  formPointsBaseAmount: number | '';
  formExpiration: string;
  formNeverExpires: boolean;
  formDescription: string;
  formStatus: 'active' | 'grace_period' | 'inactive' | 'closed';
  showFormMobile: boolean;
  formFeedbackPromoEnabled: boolean;
  formFeedbackMultiplier: number | '';
  formGracePeriodEndDate: string;
  formUnredeemedPolicy: 'expire' | 'transfer';

  formTiers: CampaignTier[];
  formMultipliers: CampaignMultiplier[];

  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  setIsEditing: (val: boolean) => void;
  setEditingCampaignId: (id: string | null) => void;
  setFormTitle: (val: string) => void;
  setFormPrize: (val: string) => void;
  setFormPoints: (val: number | '') => void;
  setFormPointsRewarded: (val: number | '') => void;
  setFormPointsBaseAmount: (val: number | '') => void;
  setFormExpiration: (val: string) => void;
  setFormNeverExpires: (val: boolean) => void;
  setFormDescription: (val: string) => void;
  setFormStatus: (val: 'active' | 'grace_period' | 'inactive' | 'closed') => void;
  setShowFormMobile: (val: boolean) => void;
  setFormFeedbackPromoEnabled: (val: boolean) => void;
  setFormFeedbackMultiplier: (val: number | '') => void;
  setFormGracePeriodEndDate: (val: string) => void;
  setFormUnredeemedPolicy: (val: 'expire' | 'transfer') => void;

  setFormTiers: (tiers: CampaignTier[]) => void;
  setFormMultipliers: (multipliers: CampaignMultiplier[]) => void;
  resetForm: () => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  filter: 'all',
  isEditing: false,
  editingCampaignId: null,
  formTitle: '',
  formPrize: '',
  formPoints: '',
  formPointsRewarded: 1,
  formPointsBaseAmount: 36,
  formExpiration: '',
  formNeverExpires: true,
  formDescription: '',
  formStatus: 'active',
  showFormMobile: false,
  formFeedbackPromoEnabled: true,
  formFeedbackMultiplier: 2.0,
  formGracePeriodEndDate: '',
  formUnredeemedPolicy: 'expire',

  formTiers: [],

  formMultipliers: [],

  setFilter: (filter) => set({ filter }),
  setIsEditing: (isEditing) => set({ isEditing }),
  setEditingCampaignId: (editingCampaignId) => set({ editingCampaignId }),
  setFormTitle: (formTitle) => set({ formTitle }),
  setFormPrize: (formPrize) => set({ formPrize }),
  setFormPoints: (formPoints) => set({ formPoints }),
  setFormPointsRewarded: (formPointsRewarded) => set({ formPointsRewarded }),
  setFormPointsBaseAmount: (formPointsBaseAmount) => set({ formPointsBaseAmount }),
  setFormExpiration: (formExpiration) => set({ formExpiration }),
  setFormNeverExpires: (formNeverExpires) => set({ formNeverExpires }),
  setFormDescription: (formDescription) => set({ formDescription }),
  setFormStatus: (formStatus) => set({ formStatus }),
  setShowFormMobile: (showFormMobile) => set({ showFormMobile }),
  setFormFeedbackPromoEnabled: (formFeedbackPromoEnabled) => set({ formFeedbackPromoEnabled }),
  setFormFeedbackMultiplier: (formFeedbackMultiplier) => set({ formFeedbackMultiplier }),
  setFormGracePeriodEndDate: (formGracePeriodEndDate) => set({ formGracePeriodEndDate }),
  setFormUnredeemedPolicy: (formUnredeemedPolicy) => set({ formUnredeemedPolicy }),

  setFormTiers: (formTiers) => set({ formTiers }),
  setFormMultipliers: (formMultipliers) => set({ formMultipliers }),

  resetForm: () => set({
    isEditing: false,
    editingCampaignId: null,
    formTitle: '',
    formPrize: '',
    formPoints: '',
    formPointsRewarded: 1,
    formPointsBaseAmount: 36,
    formExpiration: '',
    formNeverExpires: true,
    formDescription: '',
    formStatus: 'active',
    showFormMobile: false,
    formFeedbackPromoEnabled: true,
    formFeedbackMultiplier: 2.0,
    formGracePeriodEndDate: '',
    formUnredeemedPolicy: 'expire',
    formTiers: [],
    formMultipliers: []
  })
}));
