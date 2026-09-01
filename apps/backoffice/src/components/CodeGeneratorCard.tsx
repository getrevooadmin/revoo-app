"use client";

import React from 'react';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CodeGeneratorCardProps {
  campaigns: any[];
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  purchaseAmount: string;
  setPurchaseAmount: (amount: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (num: string) => void;
  onGenerate: (e: React.FormEvent) => void;
  isGenerating: boolean;
  generatedCode: any | null;
  onCloseModal?: () => void;
}

export default function CodeGeneratorCard({
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  purchaseAmount,
  setPurchaseAmount,
  invoiceNumber,
  setInvoiceNumber,
  onGenerate,
  isGenerating,
  generatedCode,
  onCloseModal
}: CodeGeneratorCardProps) {
  const activeCampaigns = (campaigns || []).filter((c: any) => c.status === 'active');

  React.useEffect(() => {
    if (activeCampaigns.length > 0) {
      const isValid = activeCampaigns.some((c: any) => c.id === selectedCampaignId);
      if (!selectedCampaignId || !isValid) {
        setSelectedCampaignId(activeCampaigns[0].id);
      }
    }
  }, [activeCampaigns, selectedCampaignId, setSelectedCampaignId]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs font-sans">
      <div className="border-b border-[#e8e1d5] pb-4 mb-4">
        <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
          <ConfirmationNumberIcon className="text-primary" fontSize="small" />
          <span>Generar Código de Compra Rapido</span>
        </h3>
        <p className="text-xs text-[#6b7773] mt-0.5">Emite un ticket con código único para entregar al cliente en caja.</p>
      </div>

      <form onSubmit={onGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Campaña Asociada</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Monto</label>
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
