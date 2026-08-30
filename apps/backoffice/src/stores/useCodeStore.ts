import { create } from 'zustand';

interface CodeState {
  filter: 'all' | 'active' | 'used' | 'deactivated';
  purchaseAmount: string;
  invoiceNumber: string;
  selectedCampaignId: string;
  isGenerating: boolean;
  generatedCode: any | null;

  setFilter: (filter: 'all' | 'active' | 'used' | 'deactivated') => void;
  setPurchaseAmount: (val: string) => void;
  setInvoiceNumber: (val: string) => void;
  setSelectedCampaignId: (val: string) => void;
  setIsGenerating: (val: boolean) => void;
  setGeneratedCode: (code: any | null) => void;
}

export const useCodeStore = create<CodeState>((set) => ({
  filter: 'all',
  purchaseAmount: '',
  invoiceNumber: '',
  selectedCampaignId: '',
  isGenerating: false,
  generatedCode: null,

  setFilter: (filter) => set({ filter }),
  setPurchaseAmount: (purchaseAmount) => set({ purchaseAmount }),
  setInvoiceNumber: (invoiceNumber) => set({ invoiceNumber }),
  setSelectedCampaignId: (selectedCampaignId) => set({ selectedCampaignId }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedCode: (generatedCode) => set({ generatedCode })
}));
