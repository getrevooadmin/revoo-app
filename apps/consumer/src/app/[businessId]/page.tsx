"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhoneInputField } from '@feebli/shared';
import { useConsumerStore } from '../../stores/useConsumerStore';
import { useBusinessesQuery, useActiveCampaignQuery, useCustomerStatusQuery } from '../../hooks/queries/useConsumerQuery';

import ConsumerHeader from '../../components/ConsumerHeader';
import CelebrationModal from '../../components/CelebrationModal';
import ToastNotification from '../../components/ToastNotification';

import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

export default function ConsumerBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const store = useConsumerStore();

  const { data: businesses = [] } = useBusinessesQuery();
  const { data: activeCampaign = null } = useActiveCampaignQuery(businessId);
  const { customerStatus, submitInteraction, isSubmitting } = useCustomerStatusQuery(store.phoneInput, businessId);

  const activeBusiness = businesses.find((b: any) => b.id === businessId) || { id: businessId, name: 'Comercio' };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.phoneInput.trim()) {
      store.showToast('Por favor ingrese su número de teléfono', 'error');
      return;
    }

    store.setIsSubmitting(true);
    try {
      const codeToUse = store.invoiceInput.trim() || undefined;
      const res = await submitInteraction({
        business_id: businessId,
        customer_phone: store.phoneInput.trim(),
        invoice_number: codeToUse,
        feedback_text: store.feedbackInput.trim() || 'Visita a comercio registrada'
      });

      store.showToast(res.message || 'Visita registrada con éxito');
      if (res.is_first_time && res.pin) {
        store.setFirstTimePin(res.pin);
      }

      if (res.stamps?.points_earned || res.points?.points_earned) {
        const earned = res.stamps?.points_earned || res.points?.points_earned || 0;
        const current = res.stamps?.current_points || res.points?.current_points || 0;
        store.setCelebrationModal({
          show: true,
          pointsEarned: earned,
          currentPoints: current,
          prizeDescription: res.stamps?.prize || activeCampaign?.prize_description || 'Premio del Club'
        });
      } else {
        store.setConsumerTab('lookup');
      }

      store.setInvoiceInput('');
      store.setFeedbackInput('');
    } catch (err: any) {
      store.showToast(err.message || 'Error al registrar visita', 'error');
    } finally {
      store.setIsSubmitting(false);
    }
  };

  // Build combined milestones array (configured tiers + main campaign prize)
  const milestoneItems: any[] = [];
  if (customerStatus?.tiers && customerStatus.tiers.length > 0) {
    milestoneItems.push(...customerStatus.tiers);
  } else if (activeCampaign?.tiers && activeCampaign.tiers.length > 0) {
    milestoneItems.push(...activeCampaign.tiers);
  }

  const mainTargetPoints = customerStatus?.target_points || activeCampaign?.target_points;
  const mainPrizeDesc = customerStatus?.prize_description || activeCampaign?.prize_description;

  if (mainTargetPoints && mainPrizeDesc) {
    const existsInTiers = milestoneItems.some((t: any) => t.target_points === mainTargetPoints);
    if (!existsInTiers) {
      milestoneItems.push({
        id: 'main-prize',
        title: 'Premio Principal',
        target_points: mainTargetPoints,
        prize_description: mainPrizeDesc,
        icon: '👑',
        isMainPrize: true
      });
    }
  }

  milestoneItems.sort((a, b) => a.target_points - b.target_points);

  // Prepend Start Node (0 pts - Inicio de Aventura)
  const allMilestones = [
    {
      id: 'start-node',
      title: 'Tu Aventura Comienza',
      target_points: 0,
      prize_description: '¡Bienvenido a la aventura de recompensas!',
      icon: '🚀',
      isStartNode: true
    },
    ...milestoneItems
  ];

  const currentPoints = customerStatus?.current_points || 0;
  const nextTarget = milestoneItems.find(m => currentPoints < m.target_points);
  const progressPercent = nextTarget ? Math.min(100, Math.round((currentPoints / nextTarget.target_points) * 100)) : 100;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col font-sans antialiased">
      <ToastNotification notification={store.notification} />

      <ConsumerHeader
        businesses={businesses}
        selectedBusinessId={businessId}
        onSelectBusiness={(id) => router.push(`/${id}`)}
      />

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-6">

        {/* Active Campaign Header Card */}
        {activeCampaign && (
          <div className="bg-[#153e35] text-white p-5 rounded-3xl space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-emerald-100">
                ⚡ Campaña Activa
              </span>
              <span className="text-xs font-mono font-bold text-emerald-200">
                {activeCampaign.target_points} Pts Meta
              </span>
            </div>
            <h2 className="text-lg font-black">{activeCampaign.title || 'Club de Recompensas'}</h2>
            {activeCampaign.description && (
              <p className="text-xs text-emerald-100/90 font-medium">{activeCampaign.description}</p>
            )}
            <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between text-xs font-semibold text-emerald-200">
              <span>🏆 Premio Principal: <strong className="text-white">{activeCampaign.prize_description}</strong></span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-[#e8e1d5] shadow-xs">
          <button
            type="button"
            onClick={() => store.setConsumerTab('register')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              store.consumerTab !== 'lookup' ? 'bg-[#153e35] text-white shadow-xs' : 'text-gray-600 hover:text-[#232d2a]'
            }`}
          >
            Registrar Compra / Visita
          </button>
          <button
            type="button"
            onClick={() => store.setConsumerTab('lookup')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              store.consumerTab === 'lookup' ? 'bg-[#153e35] text-white shadow-xs' : 'text-gray-600 hover:text-[#232d2a]'
            }`}
          >
            Mi Aventura de Puntos
          </button>
        </div>

        {/* Tab 1: Registration Form */}
        {store.consumerTab !== 'lookup' && (
          <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-[#232d2a]">Acumular Puntos</h3>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#232d2a] uppercase tracking-wider mb-1">Teléfono Móvil</label>
                <PhoneInputField
                  value={store.phoneInput}
                  onChange={store.setPhoneInput}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#232d2a] uppercase tracking-wider mb-1">Código de Compra (Ticket)</label>
                <input
                  type="text"
                  value={store.invoiceInput}
                  onChange={(e) => store.setInvoiceInput(e.target.value)}
                  placeholder="FEEB-XXXXXX"
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] font-mono uppercase focus:outline-none focus:border-[#153e35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#232d2a] uppercase tracking-wider mb-1">Opinión / Comentario (Opcional)</label>
                <textarea
                  value={store.feedbackInput}
                  onChange={(e) => store.setFeedbackInput(e.target.value)}
                  placeholder="¿Cómo fue tu experiencia hoy?"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-98 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar & Ganar Puntos'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Points Adventure Vertical Timeline (Lighter Palette) */}
        {store.consumerTab === 'lookup' && (
          <div className="bg-white text-[#232d2a] p-6 rounded-3xl border border-[#e8e1d5] shadow-xs space-y-6 animate-in fade-in duration-200 font-sans">
            <div>
              <label className="block text-xs font-bold text-[#232d2a] uppercase tracking-wider mb-1.5">Teléfono Móvil</label>
              <PhoneInputField
                value={store.phoneInput}
                onChange={store.setPhoneInput}
              />
            </div>

            {/* Current Status Header & Progress to Next Milestone */}
            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e1d5] text-center space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#153e35]">Estado Actual del Cliente</span>
                <h3 className="text-3xl font-black text-[#153e35] font-mono mt-0.5">
                  {currentPoints} <span className="text-[#153e35] text-2xl font-extrabold">Pts</span>
                </h3>
              </div>

              {nextTarget && (
                <div className="space-y-1.5 pt-1 border-t border-[#e8e1d5]">
                  <div className="flex justify-between text-[11px] font-bold text-gray-600">
                    <span>{currentPoints} / {nextTarget.target_points} puntos para tu próximo premio</span>
                    <span className="text-[#153e35] font-mono font-black">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#e8e1d5] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#153e35] to-emerald-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Timeline Journey */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-extrabold text-[#232d2a] uppercase tracking-wider flex items-center justify-between">
                <span>Aventura de Recompensas</span>
                <span className="text-[10px] text-gray-500 font-semibold">{milestoneItems.length} Hitos</span>
              </h4>

              <div className={`relative ${milestoneItems.length <= 2 ? 'space-y-12 py-2' : 'space-y-6'}`}>
                {allMilestones.map((milestone: any, idx: number) => {
                  const isUnlocked = currentPoints >= milestone.target_points;
                  const isCurrentTarget = !isUnlocked && nextTarget && nextTarget.target_points === milestone.target_points;
                  const pointsNeeded = milestone.target_points - currentPoints;
                  const isLast = idx === allMilestones.length - 1;

                  // Calculate segment progress line (from node idx down to node idx+1)
                  const nextMilestone = allMilestones[idx + 1];
                  let segmentProgressPercent = 0;
                  if (nextMilestone) {
                    const startPts = milestone.target_points;
                    const endPts = nextMilestone.target_points;
                    const range = endPts - startPts;
                    const progressRatio = range > 0
                      ? Math.max(0, Math.min(1, (currentPoints - startPts) / range))
                      : (currentPoints >= endPts ? 1 : 0);
                    segmentProgressPercent = Math.min(100, Math.max(0, progressRatio * 100));
                  }

                  // Find real milestone step index (excluding start node)
                  const stepIndex = milestone.isStartNode ? 0 : milestoneItems.findIndex(m => m.id === milestone.id) + 1;
                  const lineBottomOffset = milestoneItems.length <= 2 ? 'bottom-[-3.75rem]' : 'bottom-[-2.25rem]';

                  return (
                    <div key={milestone.id || idx} className="relative flex items-start gap-3.5 group">
                      {/* Connecting Line to Next Node */}
                      {!isLast && (
                        <div className={`absolute left-[10px] top-3 ${lineBottomOffset} w-1 z-0`}>
                          {/* Base Gray Dashed Line */}
                          <div className="absolute left-[1px] top-0 bottom-0 border-l-2 border-dashed border-[#d2c9bc]" />

                          {/* Green Filled Progress Line */}
                          {segmentProgressPercent > 0 && (
                            <div
                              className="absolute top-0 left-0 right-0 overflow-hidden transition-all duration-500"
                              style={{ height: `${segmentProgressPercent}%` }}
                            >
                              <div className="absolute left-[1px] top-0 bottom-0 border-l-2 border-dashed border-emerald-500" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Node Bullet (Flex item, aligned at top with title) */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all flex-shrink-0 z-10 mt-0 ${
                        isUnlocked
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                          : isCurrentTarget
                            ? 'bg-amber-500 text-white ring-4 ring-amber-400/40 animate-pulse'
                            : 'bg-[#faf8f5] text-gray-400 border border-[#e8e1d5]'
                      }`}>
                        {milestone.isStartNode ? null : isUnlocked ? (
                          <CheckIcon style={{ fontSize: 14 }} />
                        ) : isLast || milestone.isMainPrize ? (
                          <CardGiftcardIcon style={{ fontSize: 13 }} />
                        ) : isCurrentTarget ? (
                          <span>{stepIndex}</span>
                        ) : (
                          <LockIcon style={{ fontSize: 13 }} />
                        )}
                      </div>

                      {/* Content Card / Frameless Text / Start Node Label */}
                      {milestone.isStartNode ? (
                        <div className="flex items-center h-6 pl-1">
                          <span className="text-xs font-black text-[#153e35] uppercase tracking-wider flex items-center gap-1.5">
                            <span>🚀 Tu Aventura Comienza — 0 pts</span>
                          </span>
                        </div>
                      ) : isLast || milestone.isMainPrize ? (
                        /* Highlighted Card Box for Final Prize Node */
                        <div className={`flex-1 p-3.5 rounded-2xl border transition-all ${
                          isUnlocked
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                            : isCurrentTarget
                              ? 'bg-amber-50/70 border-amber-300 text-[#232d2a] shadow-xs'
                              : 'bg-[#faf8f5] border-[#e8e1d5] text-gray-700 shadow-xs'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className={`text-xs font-black flex items-center gap-1.5 ${
                                isUnlocked
                                  ? 'text-emerald-950'
                                  : isCurrentTarget
                                    ? 'text-amber-950'
                                    : 'text-[#153e35]'
                              }`}>
                                <span>{milestone.icon || '👑'}</span>
                                <span>{milestone.title === activeCampaign?.title || milestone.isMainPrize ? 'Premio Principal' : milestone.title}</span>
                                <span className="font-mono text-[11px] opacity-80">— {milestone.target_points} pts</span>
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 font-medium leading-relaxed">
                                {milestone.prize_description}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between">
                            {isUnlocked ? (
                              <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-extrabold shadow-2xs">
                                ¡Desbloqueado! Ganaste {milestone.prize_description}
                              </span>
                            ) : isCurrentTarget ? (
                              <span className="text-[10px] bg-amber-500 text-white px-2.5 py-1 rounded-full font-black shadow-2xs">
                                Te faltan {pointsNeeded} pts
                              </span>
                            ) : (
                              <span className="text-[10px] bg-[#e8e1d5] text-gray-600 px-2.5 py-0.5 rounded-full font-semibold">
                                {milestone.target_points} pts necesarios
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Frameless Text Block for Intermediate Tiers */
                        <div className="flex-1 py-1 space-y-1">
                          <h5 className="text-xs font-black text-[#232d2a] flex items-center gap-1.5">
                            <span>{milestone.icon || '⭐️'}</span>
                            <span>{milestone.title === activeCampaign?.title ? 'Premio Principal' : milestone.title}</span>
                            <span className="font-mono text-xs font-bold opacity-75">— {milestone.target_points} pts</span>
                          </h5>
                          <p className="text-xs text-gray-500 font-medium leading-tight">
                            {milestone.prize_description}
                          </p>

                          {/* Status Badge */}
                          <div className="pt-1">
                            {isUnlocked ? (
                              <span className="inline-block text-[10px] bg-emerald-500 text-white px-3 py-0.5 rounded-full font-extrabold shadow-2xs">
                                ¡Desbloqueado! Ganaste {milestone.prize_description}
                              </span>
                            ) : isCurrentTarget ? (
                              <span className="inline-block text-[10px] bg-amber-500 text-white px-3 py-0.5 rounded-full font-black shadow-2xs">
                                Te faltan {pointsNeeded} pts
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] bg-[#e8e1d5] text-gray-600 px-3 py-0.5 rounded-full font-semibold">
                                {milestone.target_points} pts necesarios
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <CelebrationModal
        isOpen={!!store.celebrationModal?.show}
        onClose={() => store.setCelebrationModal(null)}
        pointsEarned={store.celebrationModal?.pointsEarned || 0}
        currentPoints={store.celebrationModal?.currentPoints || 0}
        prizeDescription={store.celebrationModal?.prizeDescription}
        pin={store.firstTimePin}
      />
    </div>
  );
}

