import { create } from 'zustand';

export interface CampaignTier {
  id?: string;
  title: string;
  target_points: number;
  prize_description: string;
  monetary_value?: number;
  icon?: string;
}

export interface CelebrationModalState {
  show: boolean;
  pointsEarned: number;
  currentPoints: number;
  prizeDescription?: string;
  item_promo_name?: string | null;
  multiplier?: number;
  feedback_promo_applied?: boolean;
  feedback_multiplier?: number;
  nextTier?: CampaignTier | null;
  pointsNeededForNext?: number;
}

interface ConsumerState {
  consumerTab: 'landing' | 'register' | 'lookup';
  phoneInput: string;
  invoiceInput: string;
  feedbackInput: string;
  isSubmitting: boolean;
  consumerStatus: any | null;
  firstTimePin: string | null;
  celebrationModal: CelebrationModalState | null;

  isDropdownOpen: boolean;
  topSearchQuery: string;
  notification: { message: string; type: 'success' | 'error' } | null;

  setConsumerTab: (tab: 'landing' | 'register' | 'lookup') => void;
  setPhoneInput: (phone: string) => void;
  setInvoiceInput: (invoice: string) => void;
  setFeedbackInput: (feedback: string) => void;
  setIsSubmitting: (val: boolean) => void;
  setConsumerStatus: (status: any | null) => void;
  setFirstTimePin: (pin: string | null) => void;
  setCelebrationModal: (modal: CelebrationModalState | null) => void;

  setIsDropdownOpen: (val: boolean) => void;
  setTopSearchQuery: (query: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const useConsumerStore = create<ConsumerState>((set) => ({
  consumerTab: 'landing',
  phoneInput: '',
  invoiceInput: '',
  feedbackInput: '',
  isSubmitting: false,
  consumerStatus: null,
  firstTimePin: null,
  celebrationModal: null,

  isDropdownOpen: false,
  topSearchQuery: '',
  notification: null,

  setConsumerTab: (consumerTab) => set({ consumerTab }),
  setPhoneInput: (phoneInput) => set({ phoneInput }),
  setInvoiceInput: (invoiceInput) => set({ invoiceInput }),
  setFeedbackInput: (feedbackInput) => set({ feedbackInput }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setConsumerStatus: (consumerStatus) => set({ consumerStatus }),
  setFirstTimePin: (firstTimePin) => set({ firstTimePin }),
  setCelebrationModal: (celebrationModal) => set({ celebrationModal }),

  setIsDropdownOpen: (isDropdownOpen) => set({ isDropdownOpen }),
  setTopSearchQuery: (topSearchQuery) => set({ topSearchQuery }),
  showToast: (message, type = 'success') => {
    set({ notification: { message, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 4000);
  }
}));
