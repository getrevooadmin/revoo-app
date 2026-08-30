"use client";

import React from 'react';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import SearchIcon from '@mui/icons-material/Search';
import KeyIcon from '@mui/icons-material/Key';

interface PointsRedemptionCardProps {
  redeemPhone: string;
  setRedeemPhone: (phone: string) => void;
  redeemPointsAmount: number | '';
  setRedeemPointsAmount: (val: number | '') => void;
  redeemPin: string;
  setRedeemPin: (pin: string) => void;
  onRedeemSubmit: (e: React.FormEvent) => void;
  onLookupCustomer: (e: React.FormEvent) => void;
  isRedeeming: boolean;
  isLookingUpCustomer: boolean;
  customerLookupResult: any | null;
  activeCampaignTargetPoints?: number;
}

export default function PointsRedemptionCard({
  redeemPhone,
  setRedeemPhone,
  redeemPointsAmount,
  setRedeemPointsAmount,
  redeemPin,
  setRedeemPin,
  onRedeemSubmit,
  onLookupCustomer,
  isRedeeming,
  isLookingUpCustomer,
  customerLookupResult,
  activeCampaignTargetPoints = 1000
}: PointsRedemptionCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs font-sans">
      <div className="border-b border-[#e8e1d5] pb-4 mb-4">
        <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
          <CardGiftcardIcon className="text-primary" fontSize="small" />
          <span>Canje Directo de Premios</span>
        </h3>
        <p className="text-xs text-[#6b7773] mt-0.5">Valida el PIN de 4 dígitos del cliente y descuenta puntos para otorgar un premio.</p>
      </div>

      <form onSubmit={onRedeemSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Teléfono del Cliente</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={redeemPhone}
              onChange={(e) => setRedeemPhone(e.target.value)}
              placeholder="+50588888888"
              required
              className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={onLookupCustomer}
              disabled={isLookingUpCustomer || !redeemPhone.trim()}
              className="px-3 py-2 bg-primary-light hover:bg-[#e2f2ec] text-primary border border-primary-border font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              title="Consultar Saldo"
            >
              <SearchIcon fontSize="small" />
              <span>{isLookingUpCustomer ? '...' : 'Buscar'}</span>
            </button>
          </div>
        </div>

        {customerLookupResult && (
          <div className="p-3 bg-primary-light border border-primary-border rounded-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-extrabold text-primary">
              <span>Saldo Acumulado:</span>
              <span className="text-sm font-black font-mono">{customerLookupResult.current_points || 0} Pts</span>
            </div>
            {customerLookupResult.prize_description && (
              <p className="text-[11px] text-[#6b7773] mt-1 font-semibold">
                Meta: {customerLookupResult.target_points} Pts ({customerLookupResult.prize_description})
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Puntos a Canjear</label>
            <input
              type="number"
              value={redeemPointsAmount}
              onChange={(e) => setRedeemPointsAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder={`Ej: ${activeCampaignTargetPoints}`}
              required
              className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">PIN del Cliente (4 Dígitos)</label>
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={redeemPin}
                onChange={(e) => setRedeemPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 4932"
                required
                className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono tracking-widest text-center"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isRedeeming}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <CardGiftcardIcon fontSize="small" />
          <span>{isRedeeming ? 'Validando PIN y Canjeando...' : 'Confirmar Canje de Premio'}</span>
        </button>
      </form>
    </div>
  );
}
