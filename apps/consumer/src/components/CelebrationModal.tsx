"use client";

import React from 'react';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pointsEarned: number;
  currentPoints: number;
  prizeDescription?: string;
  pin?: string | null;
  itemPromoName?: string | null;
  multiplier?: number;
}

export default function CelebrationModal({
  isOpen,
  onClose,
  pointsEarned,
  currentPoints,
  prizeDescription = 'Premio del Club',
  pin,
  itemPromoName,
  multiplier = 1.0
}: CelebrationModalProps) {
  if (!isOpen) return null;

  const pointsEarnedFormatted = Math.floor(Math.round((pointsEarned || 0) * 100) / 100);
  const displayCurrentPoints = Math.floor(Math.round((currentPoints || 0) * 100) / 100);
  const isPromoApplied = (multiplier && multiplier > 1) || !!itemPromoName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
        
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
          <EmojiEventsIcon fontSize="large" />
        </div>

        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
          ¡Felicidades!
        </span>

        {isPromoApplied && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs">
            <span>🔥</span>
            <span>Promo: {itemPromoName || 'Producto Especial'} ({multiplier}x Puntos)</span>
          </div>
        )}

        <h3 className="text-xl font-black text-dark leading-tight">
          ¡Has Acumulado <span className="text-primary font-mono">+{pointsEarnedFormatted} Pts</span>!
        </h3>

        <p className="text-xs text-[#6b7773] mt-2 font-medium">
          Tu saldo actual es de <strong className="text-dark font-mono">{displayCurrentPoints} Pts</strong> para reclamar: <span className="font-extrabold text-primary">{prizeDescription}</span>.
        </p>

        {pin && (
          <div className="mt-4 p-3 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tu PIN Personal de Canje</p>
            <span className="text-2xl font-black font-mono text-primary select-all">{pin}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 bg-primary hover:bg-primary-hover active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          ¡Genial, Entendido!
        </button>
      </div>
    </div>
  );
}
