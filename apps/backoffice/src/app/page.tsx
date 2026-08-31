"use client";

import React from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useBusinessQuery } from '../hooks/queries/useBusinessQuery';
import { useCampaignsQuery } from '../hooks/queries/useCampaignsQuery';
import { useCodesQuery } from '../hooks/queries/useCodesQuery';
import { useInteractionsQuery } from '../hooks/queries/useInteractionsQuery';

import { SupabaseService } from '../lib/supabaseService';
import Header from '../components/Header';
import ToastNotification from '../components/ToastNotification';
import BusinessInfoModal from '../components/BusinessInfoModal';
import AccountSettingsModal from '../components/AccountSettingsModal';
import CodeGeneratorCard from '../components/CodeGeneratorCard';
import PointsRedemptionCard from '../components/PointsRedemptionCard';
import InteractionsTable from '../components/InteractionsTable';

export default function DashboardPage() {
  const store = useDashboardStore();
  const { business, updateBusiness, uploadLogo } = useBusinessQuery();
  const selectedBusinessId = business?.id || null;

  const { campaigns, activeCampaign } = useCampaignsQuery(selectedBusinessId);
  const { generateCode, isGenerating } = useCodesQuery(selectedBusinessId);
  const { interactions, isLoading: isInteractionsLoading, redeemPoints, isRedeeming } = useInteractionsQuery(selectedBusinessId);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;
    if (!store.purchaseAmount || parseFloat(store.purchaseAmount) <= 0) {
      store.showToast('Por favor ingrese un monto válido para la compra.', 'error');
      return;
    }
    try {
      const code = await generateCode(
        store.selectedCampaignId || undefined,
        parseFloat(store.purchaseAmount),
        store.invoiceNumber.trim() || null
      );
      store.setGeneratedCodeModal(code);
      store.showToast('¡Código de compra generado con éxito!');
      store.setPurchaseAmount('');
      store.setInvoiceNumber('');
    } catch (err: any) {
      store.showToast(err.message || 'Error al generar código', 'error');
    }
  };

  const handleLookupCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.redeemPhone.trim() || !selectedBusinessId) return;
    store.setIsLookingUpCustomer(true);
    try {
      const data = await SupabaseService.getCustomerStatus(store.redeemPhone.trim(), selectedBusinessId);
      store.setCustomerLookupResult(data);
      if (data && data.target_points) {
        store.setRedeemPointsAmount(data.target_points);
      }
      store.showToast('Puntos del cliente consultados.');
    } catch (err: any) {
      store.showToast(err.message || 'Error al consultar cliente.', 'error');
      store.setCustomerLookupResult(null);
    } finally {
      store.setIsLookingUpCustomer(false);
    }
  };

  const handleRedeemPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.redeemPhone.trim() || !selectedBusinessId) return;
    if (!store.redeemPin.trim()) {
      store.showToast('Por favor ingrese el PIN de 4 dígitos del cliente.', 'error');
      return;
    }

    try {
      const points = typeof store.redeemPointsAmount === 'number' ? store.redeemPointsAmount : (activeCampaign?.target_points || 1000);
      await redeemPoints(store.redeemPhone.trim(), points, store.redeemPin.trim());
      store.showToast('¡Premio redimido con éxito!');
      store.setRedeemPhone('');
      store.setRedeemPointsAmount('');
      store.setRedeemPin('');
      store.setCustomerLookupResult(null);
    } catch (err: any) {
      store.showToast(err.message || 'Error al redimir premio.', 'error');
    }
  };

  const [myPermissions, setMyPermissions] = React.useState<import('../lib/supabaseService').Permission[] | null>(null);

  React.useEffect(() => {
    SupabaseService.getMyProfile().then((profile) => {
      if (profile) {
        setMyPermissions(profile.custom_role?.permissions || []);
      }
    }).catch(console.error);
  }, []);

  const hasPerm = (perm: import('../lib/supabaseService').Permission) => {
    if (!myPermissions) return true;
    return myPermissions.includes('global_admin') || myPermissions.includes(perm);
  };

  const canGenerate = hasPerm('generate_codes');
  const canRedeem = hasPerm('redeem_prizes');
  const canAnalytics = hasPerm('view_analytics');

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      <ToastNotification notification={store.notification} />

      <Header
        business={business}
        onOpenBusinessInfo={() => store.setIsBusinessInfoOpen(true)}
        onOpenSettings={() => store.setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {(canGenerate || canRedeem) && (
          <div className={`grid grid-cols-1 ${canGenerate && canRedeem ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {canGenerate && (
              <CodeGeneratorCard
                campaigns={campaigns}
                selectedCampaignId={store.selectedCampaignId}
                setSelectedCampaignId={store.setSelectedCampaignId}
                purchaseAmount={store.purchaseAmount}
                setPurchaseAmount={store.setPurchaseAmount}
                invoiceNumber={store.invoiceNumber}
                setInvoiceNumber={store.setInvoiceNumber}
                onGenerate={handleGenerateCode}
                isGenerating={isGenerating}
                generatedCode={store.generatedCodeModal}
                onCloseModal={() => store.setGeneratedCodeModal(null)}
              />
            )}

            {canRedeem && (
              <PointsRedemptionCard
                redeemPhone={store.redeemPhone}
                setRedeemPhone={store.setRedeemPhone}
                redeemPointsAmount={store.redeemPointsAmount}
                setRedeemPointsAmount={store.setRedeemPointsAmount}
                redeemPin={store.redeemPin}
                setRedeemPin={store.setRedeemPin}
                onRedeemSubmit={handleRedeemPointsSubmit}
                onLookupCustomer={handleLookupCustomer}
                isRedeeming={isRedeeming}
                isLookingUpCustomer={store.isLookingUpCustomer}
                customerLookupResult={store.customerLookupResult}
                activeCampaignTargetPoints={activeCampaign?.target_points}
              />
            )}
          </div>
        )}

        {canAnalytics && (
          <InteractionsTable interactions={interactions} isLoading={isInteractionsLoading} />
        )}

        {!canGenerate && !canRedeem && !canAnalytics && (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            No tienes módulos activos asignados en el Panel General.
          </div>
        )}
      </main>

      <BusinessInfoModal
        isOpen={store.isBusinessInfoOpen}
        onClose={() => store.setIsBusinessInfoOpen(false)}
        business={business}
        onSave={async (name, logoUrl) => {
          if (selectedBusinessId) await updateBusiness({ businessId: selectedBusinessId, name, logoUrl });
        }}
        onUploadLogo={async (base64) => {
          return selectedBusinessId ? await uploadLogo({ businessId: selectedBusinessId, base64Image: base64 }) : '';
        }}
      />

      <AccountSettingsModal
        isOpen={store.isSettingsOpen}
        onClose={() => store.setIsSettingsOpen(false)}
        onToast={store.showToast}
      />
    </div>
  );
}
