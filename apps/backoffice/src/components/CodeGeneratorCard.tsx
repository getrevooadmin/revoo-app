"use client";

import React from 'react';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CodeGeneratorCardProps {
  campaigns: any[];
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  selectedPromoId?: string;
  setSelectedPromoId?: (id: string) => void;
  promoAmount?: string;
  setPromoAmount?: (amount: string) => void;
  purchaseAmount: string;
  setPurchaseAmount: (amount: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (num: string) => void;
  onGenerate: (e: React.FormEvent) => void;
  isGenerating: boolean;
  generatedCode: any | null;
  onCloseModal?: () => void;
  currencySymbol?: string;
}

export default function CodeGeneratorCard({
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  selectedPromoId = '',
  setSelectedPromoId,
  promoAmount = '',
  setPromoAmount,
  purchaseAmount,
  setPurchaseAmount,
  invoiceNumber,
  setInvoiceNumber,
  onGenerate,
  isGenerating,
  generatedCode,
  onCloseModal,
  currencySymbol = '$'
}: CodeGeneratorCardProps) {
  const activeCampaigns = (campaigns || []).filter((c: any) => c.status === 'active');
  const selectedCampaign = activeCampaigns.find((c: any) => c.id === selectedCampaignId);

  React.useEffect(() => {
    if (activeCampaigns.length > 0) {
      const isValid = activeCampaigns.some((c: any) => c.id === selectedCampaignId);
      if (!selectedCampaignId || !isValid) {
        setSelectedCampaignId(activeCampaigns[0].id);
      }
    }
  }, [activeCampaigns, selectedCampaignId, setSelectedCampaignId]);

  const currentDate = new Date();
  const validPromos = (selectedCampaign?.multipliers || []).filter((m: any) => {
    if (m.is_active === false) return false;
    if (!m.never_expires && m.end_date && new Date(m.end_date) < currentDate) return false;
    if (!m.never_expires && m.start_date && new Date(m.start_date) > currentDate) return false;
    return true;
  });

  const selectedPromo = validPromos.find((m: any) => (m.id || m.title) === selectedPromoId);
  const totalAmountVal = Number(purchaseAmount) || 0;
  const promoAmountVal = selectedPromo ? (promoAmount !== '' ? Number(promoAmount) : totalAmountVal) : 0;
  const regularAmountVal = Math.max(0, totalAmountVal - promoAmountVal);

  const rate = selectedCampaign?.points_per_value_unit || 1;
  const regularPoints = regularAmountVal * rate;
  const promoPoints = promoAmountVal * rate * (selectedPromo?.multiplier || 1.0);
  const estimatedPoints = (regularPoints + promoPoints).toFixed(2);
  const bonusExtraPoints = (promoAmountVal * rate * ((selectedPromo?.multiplier || 1.0) - 1)).toFixed(2);

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs font-sans">
      <div className="border-b border-[#e8e1d5] pb-4 mb-4">
        <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
          <ConfirmationNumberIcon className="text-primary" fontSize="small" />
          <span>Generar Código de Compra Rápido</span>
        </h3>
        <p className="text-xs text-[#6b7773] mt-0.5">Emite un ticket con código único para entregar al cliente en caja.</p>
      </div>

      <form onSubmit={onGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Campaña Asociada</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => {
              setSelectedCampaignId(e.target.value);
              if (setSelectedPromoId) setSelectedPromoId('');
            }}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary cursor-pointer"
          >
            {activeCampaigns.length === 0 ? (
              <option value="" disabled>No hay campañas activas</option>
            ) : (
              activeCampaigns.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.prize_description}
                </option>
              ))
            )}
          </select>
        </div>

        {validPromos.length > 0 && (
          <div className="space-y-3 p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl">
            <div>
              <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>🔥 Promoción / Producto Aplicado</span>
                <span className="text-[10px] text-amber-700 font-normal lowercase">(opcional)</span>
              </label>
              <select
                value={selectedPromoId}
                onChange={(e) => {
                  if (setSelectedPromoId) setSelectedPromoId(e.target.value);
                  if (setPromoAmount && !e.target.value) setPromoAmount('');
                }}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Sin Promo (Multiplicador Estándar 1x)</option>
                {validPromos.map((p: any) => (
                  <option key={p.id || p.title} value={p.id || p.title}>
                    {p.title} ({p.multiplier}x Puntos)
                  </option>
                ))}
              </select>
            </div>

            {selectedPromo && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    Monto Aplicable a la Promo ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={purchaseAmount || undefined}
                    value={promoAmount !== '' ? promoAmount : purchaseAmount}
                    onChange={(e) => setPromoAmount && setPromoAmount(e.target.value)}
                    placeholder={purchaseAmount || '0.00'}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-dark focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    Si el ticket contiene productos regulares + promo, edita aquí el monto específico en promo.
                  </p>
                </div>

                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 text-xs flex items-center justify-between font-mono">
                  <span className="text-[#6b7773] text-[11px]">Estima Puntos Ticket:</span>
                  <span className="font-extrabold text-primary text-sm">
                    {estimatedPoints} Pts
                    <span className="text-[10px] text-amber-800 font-bold block text-right font-sans">
                      (incluye +{bonusExtraPoints} Pts bonus promo)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Monto Total</label>
            <input
              type="number"
              step="0.01"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nº Factura (Opcional)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="FAC-9012"
              className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3 bg-primary hover:bg-primary-hover active:scale-98 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <AddIcon fontSize="small" />
          <span>{isGenerating ? 'Generando...' : 'Generar Código de Compra'}</span>
        </button>
      </form>

      {/* Generated Code Modal */}
      {generatedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-sm w-full shadow-2xl text-center">
            <CheckCircleIcon className="text-emerald-500 mx-auto mb-2" fontSize="large" />
            <h4 className="text-lg font-black text-dark">¡Código Generado!</h4>
            <p className="text-xs text-[#6b7773] mt-1">Entregue este código al cliente o escanéelo en caja:</p>

            <div className="my-4 p-4 bg-[#faf8f5] border-2 border-dashed border-primary rounded-2xl">
              <span className="text-2xl font-black font-mono text-primary select-all">{generatedCode.code}</span>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Monto: {generatedCode.purchase_amount?.toFixed(2)}</p>
            </div>

            <button
              type="button"
              onClick={() => onCloseModal && onCloseModal()}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
