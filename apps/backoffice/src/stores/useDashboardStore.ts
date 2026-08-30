import { create } from 'zustand';

interface Notification {
  message: string;
  type: 'success' | 'error';
}

interface DashboardState {
  notification: Notification | null;
  purchaseAmount: string;
  invoiceNumber: string;
  selectedCampaignId: string;
  isGenerating: boolean;
  generatedCodeModal: any | null;

  redeemPhone: string;
  redeemPointsAmount: number | '';
  redeemPin: string;
  isRedeeming: boolean;
  customerLookupResult: any | null;
  isLookingUpCustomer: boolean;

  userEmail: string;
  isActionsMenuOpen: boolean;
  isSettingsOpen: boolean;
  settingsName: string;
  settingsPassword: string;
  settingsConfirmPassword: string;
  isSavingSettings: boolean;

  isBusinessInfoOpen: boolean;
  businessNameInput: string;
  businessLogoInput: string;
  isSavingBusinessInfo: boolean;
  isUploadingLogo: boolean;

  // Actions
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearNotification: () => void;
  setPurchaseAmount: (val: string) => void;
  setInvoiceNumber: (val: string) => void;
  setSelectedCampaignId: (val: string) => void;
  setIsGenerating: (val: boolean) => void;
  setGeneratedCodeModal: (code: any | null) => void;

  setRedeemPhone: (val: string) => void;
  setRedeemPointsAmount: (val: number | '') => void;
  setRedeemPin: (val: string) => void;
  setIsRedeeming: (val: boolean) => void;
  setCustomerLookupResult: (val: any | null) => void;
  setIsLookingUpCustomer: (val: boolean) => void;

  setUserEmail: (val: string) => void;
  setIsActionsMenuOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  setSettingsName: (val: string) => void;
  setSettingsPassword: (val: string) => void;
  setSettingsConfirmPassword: (val: string) => void;
  setIsSavingSettings: (val: boolean) => void;

  setIsBusinessInfoOpen: (val: boolean) => void;
  setBusinessNameInput: (val: string) => void;
  setBusinessLogoInput: (val: string) => void;
  setIsSavingBusinessInfo: (val: boolean) => void;
  setIsUploadingLogo: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  notification: null,
  purchaseAmount: '',
  invoiceNumber: '',
  selectedCampaignId: '',
  isGenerating: false,
  generatedCodeModal: null,

  redeemPhone: '',
  redeemPointsAmount: '',
  redeemPin: '',
  isRedeeming: false,
  customerLookupResult: null,
  isLookingUpCustomer: false,

  userEmail: '',
  isActionsMenuOpen: false,
  isSettingsOpen: false,
  settingsName: '',
  settingsPassword: '',
  settingsConfirmPassword: '',
  isSavingSettings: false,

  isBusinessInfoOpen: false,
  businessNameInput: '',
  businessLogoInput: '',
  isSavingBusinessInfo: false,
  isUploadingLogo: false,

  showToast: (message, type = 'success') => {
    set({ notification: { message, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 4000);
  },
  clearNotification: () => set({ notification: null }),
  setPurchaseAmount: (purchaseAmount) => set({ purchaseAmount }),
  setInvoiceNumber: (invoiceNumber) => set({ invoiceNumber }),
  setSelectedCampaignId: (selectedCampaignId) => set({ selectedCampaignId }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedCodeModal: (generatedCodeModal) => set({ generatedCodeModal }),

  setRedeemPhone: (redeemPhone) => set({ redeemPhone }),
  setRedeemPointsAmount: (redeemPointsAmount) => set({ redeemPointsAmount }),
  setRedeemPin: (redeemPin) => set({ redeemPin }),
  setIsRedeeming: (isRedeeming) => set({ isRedeeming }),
  setCustomerLookupResult: (customerLookupResult) => set({ customerLookupResult }),
  setIsLookingUpCustomer: (isLookingUpCustomer) => set({ isLookingUpCustomer }),

  setUserEmail: (userEmail) => set({ userEmail }),
  setIsActionsMenuOpen: (isActionsMenuOpen) => set({ isActionsMenuOpen }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setSettingsName: (settingsName) => set({ settingsName }),
  setSettingsPassword: (settingsPassword) => set({ settingsPassword }),
  setSettingsConfirmPassword: (settingsConfirmPassword) => set({ settingsConfirmPassword }),
  setIsSavingSettings: (isSavingSettings) => set({ isSavingSettings }),

  setIsBusinessInfoOpen: (isBusinessInfoOpen) => set({ isBusinessInfoOpen }),
  setBusinessNameInput: (businessNameInput) => set({ businessNameInput }),
  setBusinessLogoInput: (businessLogoInput) => set({ businessLogoInput }),
  setIsSavingBusinessInfo: (isSavingBusinessInfo) => set({ isSavingBusinessInfo }),
  setIsUploadingLogo: (isUploadingLogo) => set({ isUploadingLogo }),
}));
