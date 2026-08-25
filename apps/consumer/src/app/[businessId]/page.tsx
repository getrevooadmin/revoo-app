"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PhoneInputField } from '@feebli/shared';

interface Business {
  id: string;
  name: string;
}

interface CampaignTier {
  id?: string;
  title: string;
  target_points: number;
  prize_description: string;
  monetary_value?: number;
  icon?: string;
}

interface CampaignMultiplier {
  id?: string;
  title: string;
  multiplier: number;
  applies_to: string;
  badge_text?: string;
  is_active: boolean;
}

interface CustomerStatus {
  customer_phone: string;
  current_points: number;
  target_points: number;
  current_stamps?: number;
  target_stamps?: number;
  prize_description: string;
  expiration_date: string;
  title?: string;
  description?: string;
  tiers?: CampaignTier[];
  multipliers?: CampaignMultiplier[];
  points_earned?: number;
}

export default function ConsumerBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.businessId as string;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Consumer States
  const [consumerTab, setConsumerTab] = useState<'landing' | 'register' | 'lookup'>('landing');
  const [phoneInput, setPhoneInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumerStatus, setConsumerStatus] = useState<CustomerStatus | null>(null);
  const [firstTimePin, setFirstTimePin] = useState<string | null>(null);

  // Celebration Modal State
  const [celebrationModal, setCelebrationModal] = useState<{
    show: boolean;
    pointsEarned: number;
    currentPoints: number;
    nextTier?: CampaignTier | null;
    pointsNeededForNext?: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const phoneRegex = /^\+[1-9]\d{6,14}$/;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch businesses on load and validate businessId
  useEffect(() => {
    fetch('/api/businesses')
      .then(res => res.json())
      .then((data: Business[]) => {
        setBusinesses(data);
        if (data.length > 0) {
          if (!data.some(b => b.id === businessId)) {
            router.replace('/');
          }
        }
      })
      .catch(err => {
        console.error('Error fetching businesses:', err);
        router.replace('/');
      });
  }, [businessId, router]);

  const handleSelectBusiness = (id: string) => {
    setIsDropdownOpen(false);
    setTopSearchQuery('');
    setConsumerStatus(null);
    setPhoneInput('');
    setCelebrationModal(null);
    
    if (id) {
      router.push(`/${id}`);
    } else {
      router.push('/');
    }
  };

  const filteredTopBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(topSearchQuery.toLowerCase())
  );

  const activeBusiness = businesses.find(b => b.id === businessId);

  // Handler: Customer Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneRegex.test(phoneInput)) {
      showToast('Número de teléfono inválido. Debe incluir el código de país (ej: +50588888888).', 'error');
      return;
    }
    if (feedbackInput.trim().length < 3) {
      showToast('Por favor escribe un comentario de al menos 3 caracteres.', 'error');
      return;
    }

    const hasPurchaseCode = !!invoiceInput.trim();

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          customer_phone: phoneInput,
          invoice_number: invoiceInput.trim() || null,
          feedback_text: feedbackInput.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }

      if (data.interaction.ai_spam_confidence) {
        showToast('Feedback enviado. Advertencia: Detectado como posible SPAM.', 'error');
      } else {
        showToast(hasPurchaseCode ? '¡Visita registrada y puntos sumados!' : '¡Feedback enviado con éxito!');
      }

      // If registered with purchase, set status and trigger celebration modal
      if (hasPurchaseCode && (data.points || data.stamps)) {
        const stats = data.points || data.stamps;
        const currentPts = stats.current_points ?? stats.current_stamps ?? 0;
        const earnedPts = stats.points_earned ?? 100;
        
        const tiersList: CampaignTier[] = stats.tiers && stats.tiers.length > 0 ? stats.tiers : [
          { id: 't1', title: 'Bienvenida', target_points: 100, prize_description: '5% de descuento', monetary_value: 5.00, icon: '🎉' },
          { id: 't2', title: 'Explorador', target_points: 250, prize_description: 'Envío gratis', monetary_value: 12.50, icon: '⭐️' },
          { id: 't3', title: 'Aventurero', target_points: 500, prize_description: '15% de descuento', monetary_value: 25.00, icon: '🔥' },
          { id: 't4', title: 'Tesoro Final', target_points: 1000, prize_description: stats.prize || 'Premio VIP', monetary_value: 50.00, icon: '👑' }
        ];

        const newStatus: CustomerStatus = {
          customer_phone: phoneInput,
          current_points: currentPts,
          target_points: stats.target_points ?? stats.target_stamps ?? 1000,
          current_stamps: currentPts,
          target_stamps: stats.target_points ?? stats.target_stamps ?? 1000,
          prize_description: stats.prize,
          expiration_date: stats.campaign_expires,
          tiers: tiersList,
          multipliers: stats.multipliers || []
        };

        setConsumerStatus(newStatus);

        // Find next locked tier
        const sortedTiers = [...tiersList].sort((a, b) => a.target_points - b.target_points);
        const nextTier = sortedTiers.find(t => currentPts < t.target_points) || sortedTiers[sortedTiers.length - 1];
        const pointsNeeded = nextTier ? Math.max(0, nextTier.target_points - currentPts) : 0;

        setCelebrationModal({
          show: true,
          pointsEarned: earnedPts,
          currentPoints: currentPts,
          nextTier,
          pointsNeededForNext: pointsNeeded
        });
      } else {
        setConsumerStatus(null);
      }

      // Reset form fields
      const submittedPhone = phoneInput;
      setPhoneInput('');
      setInvoiceInput('');
      setFeedbackInput('');
      
      if (data.is_first_time && data.pin) {
        setFirstTimePin(data.pin);
        if (hasPurchaseCode) {
          triggerPointsLookup(submittedPhone);
        }
      } else {
        if (hasPurchaseCode) {
          setConsumerTab('lookup');
          triggerPointsLookup(submittedPhone);
        } else {
          setConsumerTab('landing');
        }
      }

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Consumer Points Lookup
  const handleConsumerLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneRegex.test(phoneInput)) {
      showToast('Número de teléfono inválido. Debe incluir el código de país.', 'error');
      return;
    }
    setIsSubmitting(true);
    await triggerPointsLookup(phoneInput);
    setIsSubmitting(false);
  };

  const triggerPointsLookup = async (phone: string) => {
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(phone)}/status?business_id=${businessId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo obtener el estado');
      }

      // Ensure tiers are present with fallback
      const tiersList: CampaignTier[] = data.tiers && data.tiers.length > 0 ? data.tiers : [
        { id: 'tier-1', title: 'Bienvenida', target_points: 100, prize_description: '5% de descuento en tu consumo', monetary_value: 5.00, icon: '🎉' },
        { id: 'tier-2', title: 'Explorador', target_points: 250, prize_description: 'Envío gratis en tu próxima compra', monetary_value: 12.50, icon: '⭐️' },
        { id: 'tier-3', title: 'Aventurero', target_points: 500, prize_description: '15% de descuento exclusivo', monetary_value: 25.00, icon: '🔥' },
        { id: 'tier-4', title: 'Leyenda', target_points: 750, prize_description: 'Postre & Copa de vino gratis', monetary_value: 37.50, icon: '💎' },
        { id: 'tier-5', title: 'Tesoro Final', target_points: data.target_points || 1000, prize_description: data.prize_description || 'Premio VIP', monetary_value: 50.00, icon: '👑' }
      ];

      setConsumerStatus({
        ...data,
        tiers: tiersList
      });
    } catch (err: any) {
      showToast(err.message, 'error');
      setConsumerStatus(null);
    }
  };

  // Helper computations for vertical milestone progression timeline
  const activeTiers: CampaignTier[] = consumerStatus?.tiers && consumerStatus.tiers.length > 0
    ? [...consumerStatus.tiers].sort((a, b) => a.target_points - b.target_points)
    : [
        { id: 'tier-1', title: 'Bienvenida', target_points: 100, prize_description: '5% de descuento en tu consumo', monetary_value: 5.00, icon: '🎉' },
        { id: 'tier-2', title: 'Explorador', target_points: 250, prize_description: 'Envío gratis en tu próxima compra', monetary_value: 12.50, icon: '⭐️' },
        { id: 'tier-3', title: 'Aventurero', target_points: 500, prize_description: '15% de descuento exclusivo', monetary_value: 25.00, icon: '🔥' },
        { id: 'tier-4', title: 'Leyenda', target_points: 750, prize_description: 'Postre & Copa de vino gratis', monetary_value: 37.50, icon: '💎' },
        { id: 'tier-5', title: 'Tesoro Final', target_points: consumerStatus?.target_points || 1000, prize_description: consumerStatus?.prize_description || 'Premio VIP', monetary_value: 50.00, icon: '👑' }
      ];

  const currentPts = consumerStatus?.current_points || 0;
  const nextTargetTier = activeTiers.find(t => currentPts < t.target_points) || activeTiers[activeTiers.length - 1];
  const maxPoints = activeTiers[activeTiers.length - 1]?.target_points || 1000;
  const activeMultipliers = consumerStatus?.multipliers?.filter(m => m.is_active) || [];

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 antialiased relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-955 border-emerald-500 text-emerald-300' 
            : 'bg-rose-955 border-rose-500 text-rose-300'
        }`}>
          <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* POINTS CELEBRATION MODAL OVERLAY */}
      {celebrationModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden space-y-5">
            {/* Ambient glows */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>

            {/* Floating Sparks */}
            <div className="text-4xl animate-bounce">🎉</div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/50">
                ¡PUNTOS SUMADOS!
              </span>
              <h3 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-amber-300 mt-2">
                +{celebrationModal.pointsEarned} Pts
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Tu nuevo balance total es <strong className="text-indigo-400 font-bold">{celebrationModal.currentPoints} Puntos</strong>
              </p>
            </div>

            {/* Motivational Next Tier Callout */}
            {celebrationModal.nextTier && (
              <div className="bg-indigo-955/60 border border-indigo-800/50 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                  ¡Estás a solo <strong className="text-amber-400 font-black">{celebrationModal.pointsNeededForNext} pts</strong> de desbloquear:
                </p>
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-3 text-left">
                  <span className="text-2xl">{celebrationModal.nextTier.icon || '⭐️'}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{celebrationModal.nextTier.title}</h4>
                    <p className="text-[10px] text-indigo-300 font-medium">{celebrationModal.nextTier.prize_description}</p>
                    {celebrationModal.nextTier.monetary_value && (
                      <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">
                        Equiv: ${celebrationModal.nextTier.monetary_value.toFixed(2)} USD
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar Animation */}
            <div className="space-y-1 text-left">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>Progreso hacia siguiente hito:</span>
                <span className="text-indigo-300 font-bold">
                  {Math.round((celebrationModal.currentPoints / (celebrationModal.nextTier?.target_points || 1000)) * 100)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{ width: `${Math.min((celebrationModal.currentPoints / (celebrationModal.nextTier?.target_points || 1000)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCelebrationModal(null);
                setConsumerTab('lookup');
              }}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-950/60 transition-all cursor-pointer border border-indigo-400/30"
            >
              🗺️ Ver Mi Aventura de Recompensas
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="text-center max-w-md mb-4 sm:mb-6">
        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400">
          feebli Recompensas
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Escanee el código QR en caja para registrar su compra, acumular puntos y ganar.
        </p>

        {/* Business Selector */}
        <div className="relative mt-3.5 z-50" ref={dropdownRef}>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 w-fit mx-auto select-none shadow-md">
            <button
              type="button"
              onClick={() => handleSelectBusiness('')}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer pr-1 border-r border-slate-800 flex items-center justify-center font-bold"
              title="Volver a la búsqueda"
            >
              ←
            </button>
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">Comercio:</span>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-xs font-bold text-slate-200 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              <span>{activeBusiness?.name || 'Cargando...'}</span>
              <span className="text-[10px] text-slate-550">{isDropdownOpen ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Dropdown Floating Panel */}
          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-3 flex flex-col">
              <input
                type="text"
                placeholder="Buscar comercio..."
                value={topSearchQuery}
                onChange={(e) => setTopSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              
              <div className="mt-2.5 space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {filteredTopBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBusiness(b.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      b.id === businessId
                        ? 'bg-indigo-650 text-white'
                        : 'text-slate-350 hover:bg-slate-950 hover:text-white'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-5 sm:p-7">
        
        {/* Brand Header */}
        <div className="text-center pb-5 border-b border-slate-800/80 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 mx-auto flex items-center justify-center font-black text-xl text-white mb-2.5 shadow-lg shadow-indigo-500/20">
            {activeBusiness?.name?.charAt(0) || 'B'}
          </div>
          <h3 className="font-black text-xl text-slate-100">
            {activeBusiness?.name || 'Cargando comercio...'}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Programa de Lealtad & Feedback</p>

          {/* Active Multiplier Promo Banner */}
          {activeMultipliers.length > 0 && (
            <div className="mt-3 bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-amber-950/80 border border-amber-700/50 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center animate-pulse">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-black text-amber-300 tracking-wide">
                {activeMultipliers[0].badge_text || `¡${activeMultipliers[0].multiplier}X PUNTOS ACTIVOS hoy en ${activeMultipliers[0].applies_to}!`}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* TAB 1: LANDING VIEW */}
          {!firstTimePin && consumerTab === 'landing' && (
            <div className="flex-1 flex flex-col justify-center gap-3.5 py-1">
              <div className="text-center mb-1">
                <p className="text-xs text-slate-400 font-medium">¡Te damos la bienvenida!</p>
                <h4 className="text-lg font-black text-slate-100">¿Qué deseas realizar hoy?</h4>
              </div>

              <button
                onClick={() => setConsumerTab('register')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-950/50 flex flex-col items-center gap-0.5 border border-indigo-400/20 active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-base">✨</span>
                <span className="text-sm">Registrar Visita & Código de Compra</span>
                <span className="text-[10px] text-indigo-200 font-normal">Acumula puntos y desbloquea premios</span>
              </button>

              <button
                onClick={() => setConsumerTab('lookup')}
                className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-2xl font-bold flex flex-col items-center gap-0.5 border border-slate-700 active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-base">🗺️</span>
                <span className="text-sm">Ver Mi Aventura de Recompensas</span>
                <span className="text-[10px] text-slate-400 font-normal">Consulta tus puntos y línea de tiempo</span>
              </button>

              <div className="mt-4 text-center bg-slate-955/80 p-3.5 rounded-2xl border border-slate-850">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Meta Principal Vigente</p>
                <p className="text-xs text-indigo-400 font-black">
                  {activeTiers[activeTiers.length - 1]?.target_points || 1000} Puntos = ¡{activeTiers[activeTiers.length - 1]?.prize_description || 'Premio VIP'}!
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Regístrese con su número telefónico para ganar.</p>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER FORM */}
          {!firstTimePin && consumerTab === 'register' && (
            <div className="flex flex-col py-1">
              <div className="flex items-center gap-2 mb-3.5">
                <button
                  onClick={() => setConsumerTab('landing')}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ←
                </button>
                <span className="font-bold text-sm text-slate-300">Registrar Visita & Código</span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="flex flex-col">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1">
                    Número de Teléfono *
                  </label>
                  <PhoneInputField
                    required
                    value={phoneInput}
                    onChange={setPhoneInput}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Código de Compra / Ticket</span>
                    <span className="text-[9px] text-slate-500 font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: FEEB-PAMPA1"
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors uppercase"
                  />
                  <span className="text-[9px] text-slate-500 mt-1">
                    Ingresa el código proporcionado por el cajero para sumar puntos.
                  </span>
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1">
                    Opinión / Feedback *
                  </label>
                  <textarea
                    required
                    minLength={3}
                    rows={2}
                    placeholder="Cuéntanos cómo estuvo tu experiencia..."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  />
                  <span className="text-[9px] text-slate-500 mt-1">Tu opinión es evaluada por nuestro sistema de IA.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:bg-slate-800 disabled:text-slate-650 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/20"
                >
                  {isSubmitting ? (
                    <span>Procesando...</span>
                  ) : (
                    <span>Registrar & Sumar Puntos</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: VERTICAL MILESTONE PROGRESSION TIMELINE ("Tu Aventura de Recompensas") */}
          {!firstTimePin && consumerTab === 'lookup' && (
            <div className="flex flex-col py-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setConsumerTab('landing');
                      setConsumerStatus(null);
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ←
                  </button>
                  <span className="font-bold text-sm text-slate-200">Aventura de Recompensas</span>
                </div>
                {consumerStatus && (
                  <button
                    onClick={() => setConsumerStatus(null)}
                    className="text-[10px] text-slate-400 hover:text-white font-semibold underline cursor-pointer"
                  >
                    Cambiar teléfono
                  </button>
                )}
              </div>

              {!consumerStatus && (
                <form onSubmit={handleConsumerLookup} className="space-y-3.5 mb-2">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-slate-400 mb-1">
                      Ingresa tu número de celular para ver tu avance
                    </label>
                    <PhoneInputField
                      required
                      value={phoneInput}
                      onChange={setPhoneInput}
                      className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Cargando...' : 'Consultar Mi Avance'}
                  </button>
                </form>
              )}

              {/* VERTICAL TIMELINE DESIGN */}
              {consumerStatus && (
                <div className="space-y-4">
                  {/* Top Summary Banner */}
                  <div className="bg-gradient-to-br from-slate-950 via-indigo-955/80 to-slate-950 p-4.5 rounded-3xl border border-indigo-900/40 shadow-xl text-center relative overflow-hidden space-y-3">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        📱 {consumerStatus.customer_phone}
                      </span>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-950 px-2 py-0.5 rounded border border-indigo-850">
                        Puntos Digitales
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-100 flex items-center justify-center gap-1.5">
                        <span>🗺️ Tu Aventura de Recompensas</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Acumula puntos en tus consumos y desbloquea hitos de premio.
                      </p>
                    </div>

                    {/* Total Points Badge */}
                    <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 px-4 py-2 rounded-2xl shadow-inner">
                      <span className="text-amber-400 text-base">⭐️</span>
                      <span className="text-2xl font-black text-amber-300 drop-shadow">{currentPts}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">puntos</span>
                    </div>

                    {/* Progress Bar towards Next Tier */}
                    <div className="space-y-1 text-left pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span>Progreso hacia {nextTargetTier?.title || 'Siguiente hito'}:</span>
                        <span className="text-amber-300 font-bold">
                          {currentPts} / {nextTargetTier?.target_points || maxPoints} pts
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 p-0.5">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                          style={{ width: `${Math.min((currentPts / (nextTargetTier?.target_points || maxPoints)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Active Multipliers Banner */}
                  {activeMultipliers.length > 0 && (
                    <div className="bg-amber-955/70 border border-amber-800/60 rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <div>
                          <span className="font-black text-amber-300 block">{activeMultipliers[0].multiplier}X PUNTOS ACTIVOS</span>
                          <span className="text-[10px] text-amber-200/80">{activeMultipliers[0].title} • {activeMultipliers[0].applies_to}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connected Vertical Milestone Progression Path */}
                  <div className="bg-slate-950/70 border border-slate-850/80 rounded-3xl p-5 relative overflow-hidden">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-5 border-b border-slate-850 pb-2.5 flex items-center justify-between">
                      <span>Ruta de Hitos & Premios</span>
                      <span className="text-[10px] text-indigo-400 font-bold">{activeTiers.length} Niveles</span>
                    </h4>

                    {/* Connected vertical line */}
                    <div className="relative pl-7 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-slate-800">
                      {activeTiers.map((tier, idx) => {
                        const isUnlocked = currentPts >= tier.target_points;
                        const isCurrentTarget = !isUnlocked && (idx === 0 || currentPts >= (activeTiers[idx - 1]?.target_points || 0));
                        const pointsMissing = tier.target_points - currentPts;

                        return (
                          <div key={tier.id || idx} className="relative flex items-start gap-3.5 group">
                            
                            {/* Node Circle */}
                            <div className="absolute -left-7 top-0.5 z-10">
                              {isUnlocked ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                  ✓
                                </div>
                              ) : isCurrentTarget ? (
                                <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-slate-950 font-black text-xs animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                                  {idx + 1}
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-850 border-2 border-slate-900 flex items-center justify-center text-slate-500 text-xs">
                                  🔒
                                </div>
                              )}
                            </div>

                            {/* Milestone Content Card */}
                            <div className={`flex-1 p-3.5 rounded-2xl border transition-all ${
                              isUnlocked 
                                ? 'bg-emerald-955/40 border-emerald-800/40 text-slate-100' 
                                : isCurrentTarget 
                                  ? 'bg-amber-955/40 border-amber-700/50 shadow-lg shadow-amber-950/30 text-slate-100' 
                                  : 'bg-slate-900/60 border-slate-850 opacity-60 text-slate-400'
                            }`}>
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{tier.icon || (isUnlocked ? '🎉' : isCurrentTarget ? '⭐️' : '🔒')}</span>
                                  <h5 className="font-black text-sm text-slate-100">
                                    {tier.title} — <span className="text-amber-400">{tier.target_points} pts</span>
                                  </h5>
                                </div>

                                {tier.monetary_value && (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-850">
                                    Equiv: ${tier.monetary_value.toFixed(2)} USD
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-300 leading-snug">
                                {tier.prize_description}
                              </p>

                              {/* Status Badge */}
                              <div className="mt-2.5 flex items-center justify-between">
                                {isUnlocked ? (
                                  <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/40">
                                    <span>🎉</span> ¡Desbloqueado! Reclamable en caja.
                                  </span>
                                ) : isCurrentTarget ? (
                                  <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-750 animate-pulse">
                                    Te faltan {pointsMissing} pts
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                                    {tier.target_points} pts necesarios
                                  </span>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-600 text-center">
                    Campaña vigente hasta: {new Date(consumerStatus.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FIRST TIME PIN SUCCESS SCREEN */}
          {firstTimePin && (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-955 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-2xl shadow-inner animate-bounce">
                🎉
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100">¡Registro Completado!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Tus puntos han sido asignados correctamente en tu primera visita a este comercio.
                </p>
              </div>

              <div className="w-full bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl flex flex-col items-center gap-2.5 shadow-inner">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">🔒 PIN de Seguridad</span>
                <span className="text-2xl font-black text-white tracking-widest bg-slate-900 px-5 py-1.5 rounded-xl border border-slate-850">
                  {firstTimePin}
                </span>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed max-w-[280px] mt-1.5">
                  🔒 Tu número ha sido registrado. Tu PIN secreto para reclamar premios es: <strong className="text-indigo-400">{firstTimePin}</strong>. Guardalo o tomale captura, el cajero te lo pedirá para entregarte tu premio.
                </p>
              </div>

              <button
                onClick={() => {
                  setFirstTimePin(null);
                  if (consumerStatus) {
                    setConsumerTab('lookup');
                  } else {
                    setConsumerTab('landing');
                  }
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer border border-indigo-500/20"
              >
                Entendido
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
