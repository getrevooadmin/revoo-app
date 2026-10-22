"use client";

import React from 'react';
import CampaignIcon from '@mui/icons-material/Campaign';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCampaignStore } from '../stores/useCampaignStore';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formPrize: string;
  setFormPrize: (val: string) => void;
  formPoints: number | '';
  setFormPoints: (val: number | '') => void;
  formPointsRewarded: number | '';
  setFormPointsRewarded: (val: number | '') => void;
  formPointsBaseAmount: number | '';
  setFormPointsBaseAmount: (val: number | '') => void;
  formExpiration: string;
  setFormExpiration: (val: string) => void;
  formNeverExpires: boolean;
  setFormNeverExpires: (val: boolean) => void;
  formDescription: string;
  setFormDescription: (val: string) => void;
  formStatus: 'active' | 'grace_period' | 'inactive' | 'closed';
  setFormStatus: (val: 'active' | 'grace_period' | 'inactive' | 'closed') => void;
  formTiers: any[];
  setFormTiers: (tiers: any[]) => void;
  formMultipliers: any[];
  setFormMultipliers: (mults: any[]) => void;
  formFeedbackPromoEnabled?: boolean;
  setFormFeedbackPromoEnabled?: (val: boolean) => void;
  formFeedbackMultiplier?: number | '';
  setFormFeedbackMultiplier?: (val: number | '') => void;
  formGracePeriodEndDate?: string;
  setFormGracePeriodEndDate?: (val: string) => void;
  formUnredeemedPolicy?: 'expire' | 'transfer';
  setFormUnredeemedPolicy?: (val: 'expire' | 'transfer') => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  currencySymbol?: string;
}

export default function CampaignFormModal(props: CampaignFormModalProps) {
  const store = useCampaignStore();
  const {
    isOpen,
    onClose,
    isEditing,
    formTitle,
    setFormTitle,
    formPrize,
    setFormPrize,
    formPoints,
    setFormPoints,
    formPointsRewarded,
    setFormPointsRewarded,
    formPointsBaseAmount,
    setFormPointsBaseAmount,
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
    isSaving,
    currencySymbol = '$'
  } = props;

  const formFeedbackPromoEnabled = props.formFeedbackPromoEnabled ?? store.formFeedbackPromoEnabled;
  const setFormFeedbackPromoEnabled = props.setFormFeedbackPromoEnabled ?? store.setFormFeedbackPromoEnabled;
  const formFeedbackMultiplier = props.formFeedbackMultiplier ?? store.formFeedbackMultiplier;
  const setFormFeedbackMultiplier = props.setFormFeedbackMultiplier ?? store.setFormFeedbackMultiplier;
  const formGracePeriodEndDate = props.formGracePeriodEndDate ?? store.formGracePeriodEndDate;
  const setFormGracePeriodEndDate = props.setFormGracePeriodEndDate ?? store.setFormGracePeriodEndDate;
  const formUnredeemedPolicy = props.formUnredeemedPolicy ?? store.formUnredeemedPolicy;
  const setFormUnredeemedPolicy = props.setFormUnredeemedPolicy ?? store.setFormUnredeemedPolicy;
  if (!isOpen) return null;

  const rewardedVal = typeof formPointsRewarded === 'number' && formPointsRewarded > 0 ? formPointsRewarded : 1;
  const baseVal = typeof formPointsBaseAmount === 'number' && formPointsBaseAmount > 0 ? formPointsBaseAmount : 1;
  const examplePointsEarned = ((50 / baseVal) * rewardedVal).toFixed(2);

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

  const handleAddMultiplier = () => {
    setFormMultipliers([
      ...formMultipliers,
      {
        id: `mult-${Date.now()}`,
        title: 'Nueva Promoción',
        multiplier: 2.0,
        description: 'Doble puntos en producto o servicio especial',
        never_expires: true,
        is_active: true
      }
    ]);
  };

  const handleRemoveMultiplier = (index: number) => {
    setFormMultipliers(formMultipliers.filter((_, i) => i !== index));
  };

  const handleUpdateMultiplier = (index: number, field: string, value: any) => {
    const updated = [...formMultipliers];
    updated[index] = { ...updated[index], [field]: value };
    setFormMultipliers(updated);
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
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-dark text-xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre / Título de Campaña</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej: Club Revoo VIP, Campaña Anual 2026"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Estado de Campaña</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-extrabold text-dark focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="active">🟢 Activa (Acumula y Canjea)</option>
                <option value="grace_period">⏳ Período de Gracia (Solo Canje)</option>
                <option value="inactive">🔴 Inactiva / Cerrada</option>
              </select>
            </div>
          </div>

          {formStatus === 'grace_period' && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                <span>⏳ Período de Gracia Activado</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Sin Nuevos Puntos</span>
              </div>
              <p className="text-[#6b7773] text-[11px]">
                Los clientes ya <strong>NO podrán acumular nuevos puntos</strong> en esta campaña, pero podrán <strong>canjear su saldo acumulado</strong> hasta la fecha límite.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Fecha Límite para Canjear Puntos</label>
                  <input
                    type="datetime-local"
                    value={formGracePeriodEndDate}
                    onChange={(e) => setFormGracePeriodEndDate(e.target.value)}
                    required={formStatus === 'grace_period'}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-dark focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Política de Puntos No Canjeados</label>
                  <select
                    value={formUnredeemedPolicy}
                    onChange={(e) => setFormUnredeemedPolicy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="expire">❌ Se Pierden / Expiran</option>
                    <option value="transfer">🔄 Se Transfieren a la Nueva Campaña Activa</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Meta de Puntos</label>
              <input
                type="number"
                value={formPoints}
                onChange={(e) => setFormPoints(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 100"
                required
                min={1}
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Puntos a Otorgar</label>
              <input
                type="number"
                step="any"
                value={formPointsRewarded}
                onChange={(e) => setFormPointsRewarded(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 1"
                required
                min={0.01}
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Por cada {currencySymbol} consumido</label>
              <input
                type="number"
                step="any"
                value={formPointsBaseAmount}
                onChange={(e) => setFormPointsBaseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 36"
                required
                min={0.01}
                className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 font-medium flex items-center justify-between gap-2">
            <div>
              <span className="font-extrabold text-emerald-900 block text-[11px] uppercase tracking-wider">💡 Cálculo en tiempo real:</span>
              <span className="text-xs text-emerald-800">
                Por una compra de <strong className="font-extrabold text-emerald-950">{currencySymbol} 50.00</strong> → El cliente acumula{' '}
                <strong className="font-extrabold text-primary text-sm font-mono">{examplePointsEarned}</strong> puntos.
              </span>
            </div>
            <div className="text-right text-[10px] text-emerald-800 font-mono font-bold bg-white/90 px-2 py-1 rounded-xl border border-emerald-200 shadow-2xs whitespace-nowrap">
              ({rewardedVal} pts / {baseVal} {currencySymbol})
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Premio Principal</label>
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
            <h4 className="text-xs font-extrabold text-dark uppercase tracking-wider mb-1">Hitos / Niveles Intermedios ({formTiers.length})</h4>
            <p className="text-[11px] text-[#6b7773] mb-3">
              Define metas o recompensas intermedias que tus clientes pueden desbloquear al acumular puntos antes de alcanzar el premio principal (ej: 100 pts: Café gratis, 250 pts: Postre de la casa).
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTier}
                className="w-full py-2.5 px-3 bg-[#faf8f5] hover:bg-primary-light text-primary border border-dashed border-primary-border hover:border-primary rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs mt-1"
              >
                <AddIcon fontSize="small" />
                <span>Añadir Hito</span>
              </button>
            </div>
          </div>

          {/* Item Promos / Multipliers Builder */}
          <div className="border-t border-[#e8e1d5] pt-4">
            <h4 className="text-xs font-extrabold text-dark uppercase tracking-wider mb-1">Promociones y Multiplicadores: ({formMultipliers.length})</h4>
            <p className="text-[11px] text-[#6b7773] mb-3">Define promociones especiales para productos, artículos o servicios de tu comercio (ej: Doble puntos en Producto X, Triple puntos los fines de semana).</p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {formMultipliers.map((mult, idx) => (
                <div key={mult.id || idx} className="p-3 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mult.title}
                      onChange={(e) => handleUpdateMultiplier(idx, 'title', e.target.value)}
                      placeholder="Nombre del Producto / Servicio / Promo (ej: Producto Especial, Combo XL)"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-[#e8e1d5] rounded-xl font-bold text-dark focus:outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-1 bg-white border border-[#e8e1d5] rounded-xl px-2 py-1">
                      <span className="font-extrabold text-primary text-xs">x</span>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={mult.multiplier}
                        onChange={(e) => handleUpdateMultiplier(idx, 'multiplier', Number(e.target.value))}
                        placeholder="2.0"
                        className="w-12 text-center font-bold font-mono text-dark focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMultiplier(idx)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      title="Eliminar Promo"
                    >
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#e8e1d5]/60 text-[11px]">
                    <input
                      type="text"
                      value={mult.description || ''}
                      onChange={(e) => handleUpdateMultiplier(idx, 'description', e.target.value)}
                      placeholder="Descripción opcional (ej: Aplica en compras mayores a $20, Válido en consumo local)"
                      className="flex-1 px-2 py-1 bg-white border border-[#e8e1d5] rounded-lg text-xs"
                    />

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mult.is_active !== false}
                        onChange={(e) => handleUpdateMultiplier(idx, 'is_active', e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="font-bold text-dark">Activa</span>
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddMultiplier}
                className="w-full py-2.5 px-3 bg-[#faf8f5] hover:bg-primary-light text-primary border border-dashed border-primary-border hover:border-primary rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs mt-1"
              >
                <AddIcon fontSize="small" />
                <span>Añadir Promoción por Producto</span>
              </button>
            </div>
          </div>

          {/* Feedback Promo Incentive Block */}
          <div className="border-t border-[#e8e1d5] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-dark uppercase tracking-wider">🔥 Incentivo por Opinión / Feedback</h4>
                <p className="text-[11px] text-[#6b7773] mt-0.5">Motiva a los clientes a dejar su comentario al registrar su compra otorgando puntos extra (límite 1 vez cada 24h por cliente).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formFeedbackPromoEnabled}
                  onChange={(e) => setFormFeedbackPromoEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {formFeedbackPromoEnabled && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between text-xs font-medium text-amber-900 animate-in fade-in duration-150">
                <span>Multiplicador por dejar comentario:</span>
                <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl px-2.5 py-1">
                  <span className="font-extrabold text-primary text-xs">x</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formFeedbackMultiplier}
                    onChange={(e) => setFormFeedbackMultiplier(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="2.0"
                    className="w-12 text-center font-bold font-mono text-dark focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 font-bold ml-1">(ej: 2 = Doble Puntos)</span>
                </div>
              </div>
            )}
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
