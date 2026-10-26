"use client";

import React from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useBusinessQuery } from '../hooks/queries/useBusinessQuery';
import { useCampaignsQuery } from '../hooks/queries/useCampaignsQuery';
import { useCodesQuery } from '../hooks/queries/useCodesQuery';
import { useInteractionsQuery } from '../hooks/queries/useInteractionsQuery';
import { useProfileQuery } from '../hooks/queries/useProfileQuery';

import Link from 'next/link';
import CampaignIcon from '@mui/icons-material/Campaign';

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
  const { business, updateBusiness, uploadLogo, isLoading: isBusinessLoading } = useBusinessQuery();
  const selectedBusinessId = business?.id || null;

  const { campaigns, activeCampaign, isLoading: isCampaignsLoading } = useCampaignsQuery(selectedBusinessId);
  const { generateCode, isGenerating } = useCodesQuery(selectedBusinessId);
  const { interactions, isLoading: isInteractionsLoading, redeemPoints, isRedeeming } = useInteractionsQuery(selectedBusinessId);

  const isInitialLoading = isBusinessLoading || (selectedBusinessId ? isCampaignsLoading : true);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;
    if (!store.purchaseAmount || parseFloat(store.purchaseAmount) <= 0) {
      store.showToast('Por favor ingrese un monto válido para la compra.', 'error');
      return;
    }
    try {
      const selectedCampaign = campaigns.find(c => c.id === (store.selectedCampaignId || activeCampaign?.id));
      const selectedPromo = (selectedCampaign?.multipliers || []).find((m: any) => (m.id || m.title) === store.selectedPromoId);

      const multiplier = selectedPromo ? (selectedPromo.multiplier || 1.0) : 1.0;
      const itemPromoName = selectedPromo ? selectedPromo.title : null;
      const promoAmount = selectedPromo
        ? (store.promoAmount !== '' ? parseFloat(store.promoAmount) : parseFloat(store.purchaseAmount))
        : null;

      const code = await generateCode(
        store.selectedCampaignId || undefined,
        parseFloat(store.purchaseAmount),
        store.invoiceNumber.trim() || null,
        multiplier,
        itemPromoName,
        promoAmount
      );
      store.setGeneratedCodeModal(code);
      store.showToast('¡Código de compra generado con éxito!');
      store.setPurchaseAmount('');
      store.setPromoAmount('');
      store.setSelectedPromoId('');
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
      if (data && typeof data.current_points === 'number') {
        const maxAvailable = Math.floor(data.current_points || 0);
        store.setRedeemPointsAmount(maxAvailable > 0 ? maxAvailable : '');
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
      const rawPoints = typeof store.redeemPointsAmount === 'number' ? store.redeemPointsAmount : Number(store.redeemPointsAmount || activeCampaign?.target_points || 1000);
      const points = Math.floor(rawPoints);
      if (!points || points <= 0 || !Number.isInteger(points)) {
        store.showToast('Por favor ingrese una cantidad de puntos válida y entera a canjear.', 'error');
        return;
      }

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

  const { hasPermission } = useProfileQuery();

  const canGenerate = hasPermission('generate_codes');
  const canRedeem = hasPermission('redeem_prizes');
  const canAnalytics = hasPermission('view_analytics');

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      <ToastNotification notification={store.notification} />

      <Header
        business={business}
        onOpenBusinessInfo={() => store.setIsBusinessInfoOpen(true)}
        onOpenSettings={() => store.setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {isInitialLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
            <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 sm:p-8 h-80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
                <div className="h-3.5 bg-gray-100 rounded-lg w-2/3" />
                <div className="h-10 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl w-full mt-6" />
                <div className="h-10 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl w-full" />
              </div>
              <div className="h-12 bg-primary/10 rounded-2xl w-full" />
            </div>
            <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 sm:p-8 h-80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
                <div className="h-3.5 bg-gray-100 rounded-lg w-2/3" />
                <div className="h-10 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl w-full mt-6" />
                <div className="h-10 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl w-full" />
              </div>
              <div className="h-12 bg-emerald-500/10 rounded-2xl w-full" />
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e8e1d5] p-8 sm:p-12 shadow-xs text-center font-sans space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs border border-emerald-200/60">
              <CampaignIcon style={{ fontSize: 36 }} />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-dark tracking-tight">
                ¡Bienvenido! Crea tu primera campaña para comenzar
              </h3>
              <p className="text-xs text-[#6b7773] font-medium leading-relaxed">
                Para comenzar a emitir códigos de compra y otorgar premios a tus clientes, primero debes registrar la primera campaña de recompensas de tu comercio.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/campaigns"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <CampaignIcon fontSize="small" />
                <span>+ Crear Mi Primera Campaña</span>
              </Link>
            </div>
          </div>
        ) : (
          (canGenerate || canRedeem) && (
            <div className={`grid grid-cols-1 ${canGenerate && canRedeem ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {canGenerate && (
                <CodeGeneratorCard
                  campaigns={campaigns}
                  selectedCampaignId={store.selectedCampaignId}
                  setSelectedCampaignId={store.setSelectedCampaignId}
                  selectedPromoId={store.selectedPromoId}
                  setSelectedPromoId={store.setSelectedPromoId}
                  promoAmount={store.promoAmount}
                  setPromoAmount={store.setPromoAmount}
                  purchaseAmount={store.purchaseAmount}
                  setPurchaseAmount={store.setPurchaseAmount}
                  invoiceNumber={store.invoiceNumber}
                  setInvoiceNumber={store.setInvoiceNumber}
                  onGenerate={handleGenerateCode}
                  isGenerating={isGenerating}
                  generatedCode={store.generatedCodeModal}
                  onCloseModal={() => store.setGeneratedCodeModal(null)}
                  currencySymbol={business?.currency_symbol || '$'}
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
          )
        )}

        {canAnalytics && (
          <InteractionsTable interactions={interactions} isLoading={isInteractionsLoading} />
        )}

        {!canGenerate && !canRedeem && !canAnalytics && campaigns.length > 0 && (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            No tienes módulos activos asignados en el Panel General.
          </div>
        )}
      </main>

      <BusinessInfoModal
        isOpen={store.isBusinessInfoOpen}
        onClose={() => store.setIsBusinessInfoOpen(false)}
        business={business}
        onSave={async (name, logoUrl, currencySymbol, slug) => {
          if (selectedBusinessId) await updateBusiness({ businessId: selectedBusinessId, name, logoUrl, currencySymbol, slug });
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
