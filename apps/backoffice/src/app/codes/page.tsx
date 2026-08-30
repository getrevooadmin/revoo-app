"use client";

import React from 'react';
import { useCodeStore } from '../../stores/useCodeStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useBusinessQuery } from '../../hooks/queries/useBusinessQuery';
import { useCampaignsQuery } from '../../hooks/queries/useCampaignsQuery';
import { useCodesQuery } from '../../hooks/queries/useCodesQuery';

import Header from '../../components/Header';
import ToastNotification from '../../components/ToastNotification';
import BusinessInfoModal from '../../components/BusinessInfoModal';
import AccountSettingsModal from '../../components/AccountSettingsModal';
import CodeGeneratorCard from '../../components/CodeGeneratorCard';
import CounterQRCard from '../../components/CounterQRCard';

import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FlashOnIcon from '@mui/icons-material/FlashOn';

export default function CodesPage() {
  const store = useCodeStore();
  const dashStore = useDashboardStore();
  const { business, updateBusiness, uploadLogo } = useBusinessQuery();
  const selectedBusinessId = business?.id || null;

  const { campaigns } = useCampaignsQuery(selectedBusinessId);
  const { codes, isLoading, generateCode, deactivateCode, setReadyForScan, isGenerating } = useCodesQuery(selectedBusinessId);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;
    if (!store.purchaseAmount || parseFloat(store.purchaseAmount) <= 0) {
      dashStore.showToast('Por favor ingrese un monto válido para la compra.', 'error');
      return;
    }
    try {
      const code = await generateCode(
        store.selectedCampaignId || undefined,
        parseFloat(store.purchaseAmount),
        store.invoiceNumber.trim() || null
      );
      store.setGeneratedCode(code);
      dashStore.showToast('¡Código de compra generado con éxito!');
      store.setPurchaseAmount('');
      store.setInvoiceNumber('');
    } catch (err: any) {
      dashStore.showToast(err.message || 'Error al generar código.', 'error');
    }
  };

  const handleSetReady = async (code: string) => {
    try {
      await setReadyForScan(code);
      dashStore.showToast(`Código ${code} activado para escaneo en caja.`);
    } catch (err: any) {
      dashStore.showToast(err.message || 'Error al activar código.', 'error');
    }
  };

  // Compute active counter code by sorting unredeemed active codes by updated_at descending
  const activeCode = [...codes]
    .filter((c: any) => c.is_active && !c.is_associated && !c.is_redeemed)
    .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0] || null;

  const displayedCodes = codes.filter((c: any) => {
    if (store.filter === 'active') return c.is_active && !c.is_associated && !c.is_redeemed;
    if (store.filter === 'used') return c.is_associated || c.is_redeemed;
    if (store.filter === 'deactivated') return !c.is_active;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      <ToastNotification notification={dashStore.notification} />

      <Header
        business={business}
        onOpenBusinessInfo={() => dashStore.setIsBusinessInfoOpen(true)}
        onOpenSettings={() => dashStore.setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Permanent Counter QR Code Card */}
        <CounterQRCard
          business={business}
          activeCode={activeCode}
          onToast={dashStore.showToast}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1">
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
              generatedCode={store.generatedCode}
              onCloseModal={() => store.setGeneratedCode(null)}
            />
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col min-h-[500px]">
            <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
                  <ConfirmationNumberIcon className="text-primary" fontSize="small" />
                  <span>Historial de Códigos de Compra</span>
                </h3>
                <p className="text-xs text-[#6b7773] mt-0.5">Códigos generados para otorgar puntos al consumidor.</p>
              </div>

              <div className="flex gap-1.5 bg-[#faf8f5] p-1 border border-[#e8e1d5] rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => store.setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    store.filter === 'all' ? 'bg-primary text-white font-extrabold' : 'text-gray-600 hover:text-dark'
                  }`}
                >
                  Todos ({codes.length})
                </button>
                <button
                  type="button"
                  onClick={() => store.setFilter('active')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    store.filter === 'active' ? 'bg-primary text-white font-extrabold' : 'text-gray-600 hover:text-dark'
                  }`}
                >
                  Disponibles
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e8e1d5] text-[#6b7773] font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-2">Código</th>
                    <th className="pb-3 px-2">Monto / Factura</th>
                    <th className="pb-3 px-2">Estado</th>
                    <th className="pb-3 px-2 text-right">Acción en Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece1]">
                  {displayedCodes.map((item: any) => {
                    const isCurrentActive = item.code === activeCode?.code;
                    const canBeActive = item.is_active && !item.is_associated && !item.is_redeemed;

                    return (
                      <tr key={item.code} className="hover:bg-[#faf8f5]">
                        <td className="py-3 px-2 font-black font-mono text-primary text-sm select-all">
                          {item.code}
                        </td>
                        <td className="py-3 px-2 font-bold">
                          ${item.purchase_amount?.toFixed(2)}
                          {item.invoice_number && <span className="text-[10px] text-gray-500 block">FAC: {item.invoice_number}</span>}
                        </td>
                        <td className="py-3 px-2">
                          {item.is_associated ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
                              Utilizado
                            </span>
                          ) : item.is_active ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              Disponible
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">
                              Desactivado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {canBeActive && (
                            isCurrentActive ? (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-primary text-white border border-primary animate-pulse inline-flex items-center gap-1 ml-auto">
                                <FlashOnIcon fontSize="inherit" />
                                <span>● Activo en Caja</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetReady(item.code)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-primary-light hover:bg-[#e2f2ec] text-primary border border-primary-border transition-all cursor-pointer ml-auto flex items-center gap-1 shadow-2xs active:scale-95"
                                title="Activar este código para ser escaneado automáticamente en el QR de caja"
                              >
                                <QrCodeScannerIcon fontSize="inherit" />
                                <span>Enviar a Caja</span>
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <BusinessInfoModal
        isOpen={dashStore.isBusinessInfoOpen}
        onClose={() => dashStore.setIsBusinessInfoOpen(false)}
        business={business}
        onSave={async (name, logoUrl) => {
          if (selectedBusinessId) await updateBusiness({ businessId: selectedBusinessId, name, logoUrl });
        }}
        onUploadLogo={async (base64) => {
          return selectedBusinessId ? await uploadLogo({ businessId: selectedBusinessId, base64Image: base64 }) : '';
        }}
      />

      <AccountSettingsModal
        isOpen={dashStore.isSettingsOpen}
        onClose={() => dashStore.setIsSettingsOpen(false)}
        onToast={dashStore.showToast}
      />
    </div>
  );
}
