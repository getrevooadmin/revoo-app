"use client";

import React from 'react';
import CampaignIcon from '@mui/icons-material/Campaign';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formPrize: string;
  setFormPrize: (val: string) => void;
  formPoints: number;
  setFormPoints: (val: number) => void;
  formPointsRate: number;
  setFormPointsRate: (val: number) => void;
  formExpiration: string;
  setFormExpiration: (val: string) => void;
  formNeverExpires: boolean;
  setFormNeverExpires: (val: boolean) => void;
  formDescription: string;
  setFormDescription: (val: string) => void;
  formStatus: 'active' | 'inactive';
  setFormStatus: (val: 'active' | 'inactive') => void;
  formTiers: any[];
  setFormTiers: (tiers: any[]) => void;
  formMultipliers: any[];
  setFormMultipliers: (mults: any[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

export default function CampaignFormModal({
  isOpen,
  onClose,
  isEditing,
  formTitle,
  setFormTitle,
  formPrize,
  setFormPrize,
  formPoints,
  setFormPoints,
  formPointsRate,
  setFormPointsRate,
  formExpiration,
  setFormExpiration,
  formNeverExpires,
  setFormNeverExpires,
  formDescription,
  setFormDescription,
  formStatus,
  setFormStatus,
  formTiers,
  setFormTiers,
  formMultipliers,
  setFormMultipliers,
  onSubmit,
  isSaving
}: CampaignFormModalProps) {
  if (!isOpen) return null;

  const handleAddTier = () => {
    const nextPoints = (formTiers.length + 1) * 200;
    setFormTiers([
      ...formTiers,
      {
        id: `tier-${Date.now()}`,
        title: `Nivel ${formTiers.length + 1}`,
        target_points: nextPoints,
        prize_description: 'Nueva Recompensa',
        monetary_value: 10.00,
        icon: '⭐️'
      }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setFormTiers(formTiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index: number, field: string, value: any) => {
    const updated = [...formTiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormTiers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-2xl w-full shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-3 mb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-primary">
            <CampaignIcon fontSize="medium" />
            <h3 className="text-base font-extrabold text-dark">
              {isEditing ? 'Editar Campaña de Fidelización' : 'Nueva Campaña de Fidelización'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Título de la Campaña</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej: Club VIP Verano 2026"
                required
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Estado de la Campaña</label>
              <button
                type="button"
                onClick={() => setFormStatus(formStatus === 'active' ? 'inactive' : 'active')}
                className={`flex items-center justify-between w-full h-[42px] px-3.5 rounded-2xl border transition-all cursor-pointer ${
                  formStatus === 'active'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-[#faf8f5] border-[#e8e1d5] text-gray-500 font-semibold'
                }`}
              >
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${formStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  {formStatus === 'active' ? 'Activa' : 'Inactiva'}
                </span>
                
                {/* Switch Track */}
                <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                  formStatus === 'active' ? 'bg-[#153e35]' : 'bg-gray-300'
                }`}>
                  {/* Switch Knob */}
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                    formStatus === 'active' ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Meta de Puntos (Premio Principal)</label>
              <input
                type="number"
                value={formPoints}
                onChange={(e) => setFormPoints(Number(e.target.value))}
                placeholder="1000"
                required
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Puntos por Cada $1 USD</label>
              <input
                type="number"
                value={formPointsRate}
                onChange={(e) => setFormPointsRate(Number(e.target.value))}
                placeholder="10"
                required
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Descripción del Premio Principal</label>
            <input
              type="text"
              value={formPrize}
              onChange={(e) => setFormPrize(e.target.value)}
              placeholder="Ej: Caja Sorpresa VIP + 50% desc. en consumo"
              required
              className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
            />
          </div>

          {/* Expiration date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-dark uppercase tracking-wider">Fecha de Expiración</label>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={formNeverExpires}
                  onChange={(e) => setFormNeverExpires(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>Sin expiración</span>
              </label>
            </div>
            {!formNeverExpires && (
              <input
                type="datetime-local"
                value={formExpiration}
                onChange={(e) => setFormExpiration(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            )}
          </div>

          {/* Multi-tier Builder */}
          <div className="border-t border-[#e8e1d5] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-dark uppercase tracking-wider">Hitos / Niveles Intermedios ({formTiers.length})</h4>
              <button
                type="button"
                onClick={handleAddTier}
                className="px-2.5 py-1 bg-primary-light text-primary border border-primary-border rounded-xl text-xs font-extrabold flex items-center gap-1 hover:bg-[#e2f2ec] cursor-pointer"
              >
                <AddIcon fontSize="small" />
                <span>Añadir Hito</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {formTiers.map((tier, idx) => (
                <div key={tier.id || idx} className="flex items-center gap-2 p-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs">
                  <input
                    type="text"
                    value={tier.icon || '⭐️'}
                    onChange={(e) => handleUpdateTier(idx, 'icon', e.target.value)}
                    className="w-8 text-center bg-white border border-[#e8e1d5] rounded-lg py-1 font-extrabold"
                  />
                  <input
                    type="text"
                    value={tier.title}
                    onChange={(e) => handleUpdateTier(idx, 'title', e.target.value)}
                    placeholder="Título del Hito"
                    className="flex-1 px-2 py-1 bg-white border border-[#e8e1d5] rounded-lg font-bold text-dark"
                  />
                  <input
                    type="number"
                    value={tier.target_points}
                    onChange={(e) => handleUpdateTier(idx, 'target_points', Number(e.target.value))}
                    placeholder="Pts"
                    className="w-20 px-2 py-1 bg-white border border-[#e8e1d5] rounded-lg font-bold font-mono text-dark"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e8e1d5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <SaveIcon fontSize="small" />
              <span>{isSaving ? 'Guardando...' : isEditing ? 'Actualizar Campaña' : 'Crear Campaña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
