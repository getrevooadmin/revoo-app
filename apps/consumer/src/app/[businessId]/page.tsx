"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PhoneInputField } from '@feebli/shared';

// MUI Icons
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MapIcon from '@mui/icons-material/Map';
import AddIcon from '@mui/icons-material/Add';
import CelebrationIcon from '@mui/icons-material/Celebration';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
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

const buildActiveTiers = (
  tiers?: CampaignTier[],
  targetPoints?: number,
  prizeDescription?: string
): CampaignTier[] => {
  let list: CampaignTier[] = tiers ? [...tiers] : [];

  const mainPts = targetPoints || 1000;
  const mainPrize = prizeDescription || 'Recompensa Principal';

  const hasMainGoal = list.some(t => t.target_points === mainPts);
  if (!hasMainGoal && mainPts > 0) {
    list.push({
      id: 'main-goal-tier',
      title: 'Meta Principal',
      target_points: mainPts,
      prize_description: mainPrize,
      icon: '👑'
    });
  }

  return list.sort((a, b) => a.target_points - b.target_points);
};

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
  const [activeCounterCode, setActiveCounterCode] = useState<{
    code: string;
    purchase_amount: number;
    invoice_number?: string | null;
  } | null>(null);

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

  // Fetch active counter code for this business on load
  useEffect(() => {
    if (!businessId) return;

    fetch(`/api/businesses/${businessId}/active-code`)
      .then(res => res.json())
      .then(data => {
        if (data.active_code) {
          setActiveCounterCode(data.active_code);
          setInvoiceInput(data.active_code.code);
          setConsumerTab('register');
        }
      })
      .catch(err => console.error('Error fetching active counter code:', err));
  }, [businessId]);

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
        
        const tiersList: CampaignTier[] = buildActiveTiers(
          stats.tiers,
          stats.target_points ?? stats.target_stamps,
          stats.prize
        );

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

      const tiersList: CampaignTier[] = buildActiveTiers(
        data.tiers,
        data.target_points,
        data.prize_description
      );

      setConsumerStatus({
        ...data,
        tiers: tiersList
      });
    } catch (err: any) {
      showToast(err.message, 'error');
      setConsumerStatus(null);
    }
  };

  const activeTiers: CampaignTier[] = buildActiveTiers(
    consumerStatus?.tiers,
    consumerStatus?.target_points,
    consumerStatus?.prize_description
  );

  const currentPts = consumerStatus?.current_points || 0;
  const nextTargetTier = activeTiers.find(t => currentPts < t.target_points) || activeTiers[activeTiers.length - 1];
  const maxPoints = Math.max(consumerStatus?.target_points || 0, activeTiers[activeTiers.length - 1]?.target_points || 1000);
  const activeMultipliers = consumerStatus?.multipliers?.filter(m => m.is_active) || [];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col items-center justify-center p-3 sm:p-6 antialiased relative font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#f0f7f4] border-[#b2dbcd] text-[#153e35]' 
            : 'bg-[#fdf2f2] border-[#f5c6c6] text-[#9b1c1c]'
        }`}>
          {notification.type === 'success' ? <CheckCircleIcon fontSize="small" className="text-[#153e35]" /> : <WarningIcon fontSize="small" className="text-[#9b1c1c]" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* POINTS CELEBRATION MODAL OVERLAY */}
      {celebrationModal?.show && (
        <div className="fixed inset-0 z-50 bg-[#153e35]/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#e8e1d5] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden space-y-5">
            {/* Floating Sparks */}
            <div className="flex justify-center text-[#c49340]">
              <CelebrationIcon fontSize="large" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8c6b2d] bg-[#f7f3eb] px-3 py-1 rounded-full border border-[#e2d5bd]">
                ¡PUNTOS SUMADOS!
              </span>
              <h3 className="text-3xl font-black text-[#c49340] mt-2">
                +{celebrationModal.pointsEarned} Pts
              </h3>
              <p className="text-xs text-[#6b7773] mt-1 font-medium">
                Tu nuevo balance total es <strong className="text-[#153e35] font-bold">{celebrationModal.currentPoints} Puntos</strong>
              </p>
            </div>

            {/* Motivational Next Tier Callout */}
            {celebrationModal.nextTier && (
              <div className="bg-[#fcfaf5] border border-[#e8e1d5] rounded-2xl p-4 space-y-2">
                <p className="text-xs text-[#333d39] font-semibold leading-relaxed">
                  ¡Estás a solo <strong className="text-[#c49340] font-extrabold">{celebrationModal.pointsNeededForNext} pts</strong> de desbloquear:
                </p>
                <div className="bg-white border border-[#e2d8c7] p-3 rounded-xl flex items-center gap-3 text-left shadow-xs">
                  <span className="text-2xl">{celebrationModal.nextTier.icon || '⭐️'}</span>
                  <div>
                    <h4 className="text-xs font-bold text-[#232d2a]">{celebrationModal.nextTier.title}</h4>
                    <p className="text-[10px] text-[#6b7773] font-medium">{celebrationModal.nextTier.prize_description}</p>
                    {celebrationModal.nextTier.monetary_value && (
                      <span className="text-[9px] text-[#8c6b2d] font-bold block mt-0.5">
                        Equiv: ${celebrationModal.nextTier.monetary_value.toFixed(2)} USD
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar Animation */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[10px] text-[#6b7773] font-semibold">
                <span>Progreso hacia siguiente hito:</span>
                <span className="text-[#c49340] font-extrabold">
                  {Math.round((celebrationModal.currentPoints / (celebrationModal.nextTier?.target_points || 1000)) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-[#e8dfce] rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-[#c49340] rounded-full transition-all duration-700 shadow-xs"
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
              className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white font-bold rounded-2xl text-xs shadow-md shadow-[#153e35]/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MapIcon fontSize="small" />
              <span>Ver Mi Aventura de Recompensas</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="text-center max-w-md mb-4 sm:mb-6">
        <h2 className="text-3xl font-extrabold text-[#153e35] tracking-tight">
          {activeBusiness?.name || 'Portal de Recompensas'}
        </h2>
        <p className="text-xs text-[#6b7773] mt-1 font-medium">
          Escanee el código QR en caja para registrar su compra, acumular puntos y ganar.
        </p>

        {/* Business Selector */}
        <div className="relative mt-3.5 z-50" ref={dropdownRef}>
          <div className="flex items-center gap-2 bg-white border border-[#e8e1d5] rounded-2xl px-3 py-1.5 w-fit mx-auto select-none shadow-xs">
            <button
              type="button"
              onClick={() => handleSelectBusiness('')}
              className="text-xs text-[#6b7773] hover:text-[#153e35] transition-colors cursor-pointer pr-1 border-r border-[#e8e1d5] flex items-center justify-center font-bold"
              title="Volver a la búsqueda"
            >
              <ArrowBackIcon fontSize="small" />
            </button>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#c49340]">Comercio:</span>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-xs font-bold text-[#232d2a] flex items-center gap-1.5 hover:text-[#153e35] transition-colors cursor-pointer"
            >
              {activeBusiness?.logo_url && (
                <img
                  src={activeBusiness.logo_url}
                  alt="Logo"
                  className="w-5 h-5 rounded-lg object-cover border border-[#e8e1d5]"
                />
              )}
              <span>{activeBusiness?.name || 'Cargando...'}</span>
              {isDropdownOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </button>
          </div>

          {/* Dropdown Floating Panel */}
          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-3 flex flex-col">
              <div className="relative flex items-center mb-2">
                <input
                  type="text"
                  placeholder="Buscar comercio..."
                  value={topSearchQuery}
                  onChange={(e) => setTopSearchQuery(e.target.value)}
                  className="w-full bg-[#faf8f5] border border-[#e2d8c7] rounded-xl pl-3 pr-8 py-2 text-xs text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors"
                />
                <SearchIcon className="absolute right-2 text-[#9c9384]" fontSize="small" />
              </div>
              
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {filteredTopBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBusiness(b.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      b.id === businessId
                        ? 'bg-[#153e35] text-white'
                        : 'text-[#333d39] hover:bg-[#faf8f5]'
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
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#e8e1d5] shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col p-5 sm:p-7">
        
        {/* Brand Header */}
        <div className="text-center pb-5 border-b border-[#e8e1d5] mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#153e35] mx-auto flex items-center justify-center font-extrabold text-xl text-white mb-2.5 shadow-md shadow-[#153e35]/15">
            {activeBusiness?.name?.charAt(0) || 'B'}
          </div>
          <h3 className="font-extrabold text-xl text-[#232d2a]">
            {activeBusiness?.name || 'Cargando comercio...'}
          </h3>
          <p className="text-xs text-[#6b7773] font-medium mt-0.5">Programa de Lealtad & Feedback</p>

          {/* Active Multiplier Promo Banner */}
          {activeMultipliers.length > 0 && (
            <div className="mt-3 bg-[#fef8ed] border border-[#e6d1a8] rounded-2xl p-2.5 flex items-center justify-center gap-2 text-center shadow-xs">
              <FlashOnIcon className="text-[#8c5e14]" fontSize="small" />
              <span className="text-xs font-extrabold text-[#8c5e14] tracking-wide">
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
                <p className="text-xs text-[#6b7773] font-medium">¡Te damos la bienvenida!</p>
                <h4 className="text-lg font-extrabold text-[#232d2a]">¿Qué deseas realizar hoy?</h4>
              </div>

              {/* Deep Forest Pine Primary Button */}
              <button
                onClick={() => setConsumerTab('register')}
                className="w-full py-3.5 px-4 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-2xl font-bold shadow-md shadow-[#153e35]/15 flex flex-col items-center gap-0.5 active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-sm font-extrabold flex items-center gap-1.5">
                  <AddIcon fontSize="small" />
                  <span>Registrar Visita & Código de Compra</span>
                </span>
                <span className="text-[10px] text-[#b3cec7] font-normal">Acumula puntos y desbloquea premios</span>
              </button>

              <button
                onClick={() => setConsumerTab('lookup')}
                className="w-full py-3.5 px-4 bg-[#faf8f5] hover:bg-[#f2ece1] text-[#232d2a] rounded-2xl font-bold flex flex-col items-center gap-0.5 border border-[#e8e1d5] active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-sm font-extrabold flex items-center gap-1.5">
                  <MapIcon fontSize="small" className="text-[#153e35]" />
                  <span>Ver Mi Aventura de Recompensas</span>
                </span>
                <span className="text-[10px] text-[#6b7773] font-normal">Consulta tus puntos y línea de tiempo</span>
              </button>

              <div className="mt-4 text-center bg-[#faf8f5] p-3.5 rounded-2xl border border-[#e8e1d5]">
                <p className="text-[10px] text-[#6b7773] uppercase tracking-widest font-extrabold mb-1">Meta Principal Vigente</p>
                <p className="text-xs text-[#c49340] font-black flex items-center justify-center gap-1">
                  <EmojiEventsIcon fontSize="small" />
                  <span>{activeTiers[activeTiers.length - 1]?.target_points || 1000} Puntos = ¡{activeTiers[activeTiers.length - 1]?.prize_description || 'Premio VIP'}!</span>
                </p>
                <p className="text-[9px] text-[#9c9384] mt-1">Regístrese con su número telefónico para ganar.</p>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER FORM */}
          {!firstTimePin && consumerTab === 'register' && (
            <div className="flex flex-col py-1">
              <div className="flex items-center gap-2 mb-3.5">
                <button
                  onClick={() => setConsumerTab('landing')}
                  className="w-8 h-8 rounded-xl bg-[#faf8f5] border border-[#e8e1d5] flex items-center justify-center text-xs text-[#6b7773] hover:text-[#232d2a] cursor-pointer"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>
                <span className="font-extrabold text-sm text-[#232d2a]">Registrar Visita & Código</span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-[#6b7773] mb-1">
                    Número de Teléfono *
                  </label>
                  <PhoneInputField
                    required
                    value={phoneInput}
                    onChange={setPhoneInput}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-sm text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors"
                  />
                </div>

                {activeCounterCode && activeCounterCode.code === invoiceInput && (
                  <div className="bg-[#f0f7f4] border border-[#b2dbcd] p-2.5 rounded-xl text-xs flex items-center justify-between text-[#153e35]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <FlashOnIcon fontSize="small" />
                      <span>Código de Caja Cargado: <strong>{activeCounterCode.code}</strong></span>
                    </div>
                    {activeCounterCode.purchase_amount > 0 && (
                      <span className="font-black bg-white px-2 py-0.5 rounded-lg border border-[#b2dbcd]">
                        ${Number(activeCounterCode.purchase_amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-[#6b7773] mb-1 flex items-center justify-between">
                    <span>Código de Compra / Ticket</span>
                    <span className="text-[9px] text-[#9c9384] font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: FEEB-PAMPA1"
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-sm text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors uppercase font-mono font-bold"
                  />
                  <span className="text-[9px] text-[#9c9384] mt-1">
                    Ingresa el código proporcionado por el cajero para sumar puntos.
                  </span>
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-[#6b7773] mb-1 flex items-center justify-between">
                    <span>Opinión / Feedback</span>
                    <span className="text-[9px] text-[#9c9384] font-normal">Opcional</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Cuéntanos cómo estuvo tu experiencia... (Opcional)"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-sm text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors resize-none"
                  />
                  <span className="text-[9px] text-[#9c9384] mt-1">Tu opinión ayuda al comercio a mejorar la atención.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 disabled:bg-[#e8dfce] disabled:text-[#9c9384] rounded-2xl text-sm font-extrabold shadow-md shadow-[#153e35]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-white"
                >
                  {isSubmitting ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <AddIcon fontSize="small" />
                      <span>Registrar Visita & Sumar Puntos</span>
                    </>
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
                    className="w-8 h-8 rounded-xl bg-[#faf8f5] border border-[#e8e1d5] flex items-center justify-center text-xs text-[#6b7773] hover:text-[#232d2a] cursor-pointer"
                  >
                    <ArrowBackIcon fontSize="small" />
                  </button>
                  <span className="font-extrabold text-sm text-[#232d2a]">Aventura de Recompensas</span>
                </div>
                {consumerStatus && (
                  <button
                    onClick={() => setConsumerStatus(null)}
                    className="text-[10px] text-[#153e35] hover:underline font-bold cursor-pointer"
                  >
                    Cambiar teléfono
                  </button>
                )}
              </div>

              {!consumerStatus && (
                <form onSubmit={handleConsumerLookup} className="space-y-3.5 mb-2">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold text-[#6b7773] mb-1">
                      Ingresa tu número de celular para ver tu avance
                    </label>
                    <PhoneInputField
                      required
                      value={phoneInput}
                      onChange={setPhoneInput}
                      className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-sm text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 disabled:bg-[#e8dfce] text-white rounded-2xl text-sm font-extrabold shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Cargando...' : 'Consultar Mi Avance'}
                  </button>
                </form>
              )}

              {/* VERTICAL TIMELINE DESIGN MATCHING USER REFERENCE IMAGE */}
              {consumerStatus && (
                <div className="space-y-4">
                  {/* Top Summary Banner */}
                  <div className="bg-[#fcfaf5] p-4.5 rounded-3xl border border-[#e8e1d5] shadow-xs text-center space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#6b7773] uppercase tracking-wider">
                        📱 {consumerStatus.customer_phone}
                      </span>
                      <span className="text-[9px] text-[#8c6b2d] font-extrabold uppercase tracking-widest bg-[#f7f3eb] px-2.5 py-0.5 rounded-full border border-[#e2d5bd]">
                        Puntos Digitales
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-[#232d2a] flex items-center justify-center gap-1.5">
                        <MapIcon fontSize="small" className="text-[#153e35]" />
                        <span>Tu Aventura de Recompensas</span>
                      </h3>
                      <p className="text-[11px] text-[#6b7773] mt-0.5">
                        Acumula puntos en tus consumos y desbloquea hitos de premio.
                      </p>
                    </div>

                    {/* Total Points Badge */}
                    <div className="inline-flex items-center gap-2 bg-white border border-[#e2d5bd] px-4 py-2 rounded-2xl shadow-xs">
                      <StarIcon className="text-[#c49340]" fontSize="small" />
                      <span className="text-2xl font-black text-[#c49340]">{currentPts}</span>
                      <span className="text-xs text-[#6b7773] font-bold uppercase tracking-wider">puntos</span>
                    </div>

                    {/* Progress Bar matching reference image */}
                    <div className="space-y-1.5 text-left pt-1">
                      <div className="flex justify-between items-center text-[11px] text-[#333d39] font-bold">
                        <span>Progreso hacia {nextTargetTier?.title || 'Siguiente hito'}:</span>
                        <span className="text-[#c49340]">
                          {currentPts} / {nextTargetTier?.target_points || maxPoints} pts
                        </span>
                      </div>
                      
                      {/* Dual Track Bar */}
                      <div className="w-full h-3 bg-[#e8dfce] rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-[#c49340] rounded-full transition-all duration-700 shadow-xs"
                          style={{ width: `${Math.min((currentPts / (nextTargetTier?.target_points || maxPoints)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Active Multipliers Banner */}
                  {activeMultipliers.length > 0 && (
                    <div className="bg-[#fef8ed] border border-[#e6d1a8] rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FlashOnIcon className="text-[#8c5e14]" fontSize="small" />
                        <div>
                          <span className="font-extrabold text-[#8c5e14] block">{activeMultipliers[0].multiplier}X PUNTOS ACTIVOS</span>
                          <span className="text-[10px] text-[#a07428]">{activeMultipliers[0].title} • {activeMultipliers[0].applies_to}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connected Vertical Milestone Progression Path */}
                  <div className="bg-white border border-[#e8e1d5] rounded-3xl p-5 relative overflow-hidden shadow-xs">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6b7773] mb-5 border-b border-[#e8e1d5] pb-2.5 flex items-center justify-between">
                      <span>Ruta de Hitos & Premios</span>
                      <span className="text-[10px] text-[#153e35] font-bold">{activeTiers.length} Niveles</span>
                    </h4>

                    {/* Connected vertical line */}
                    <div className="relative pl-8 space-y-6 before:absolute before:left-4 before:top-3.5 before:bottom-3.5 before:w-0.5 before:border-l-2 before:border-dashed before:border-[#d8caae]">
                      {activeTiers.map((tier, idx) => {
                        const isUnlocked = currentPts >= tier.target_points;
                        const isCurrentTarget = !isUnlocked && (idx === 0 || currentPts >= (activeTiers[idx - 1]?.target_points || 0));
                        const pointsMissing = tier.target_points - currentPts;

                        return (
                          <div key={tier.id || idx} className="relative flex items-start gap-3.5 group">
                            
                            {/* Node Circle */}
                            <div className="absolute -left-8 top-0.5 z-10">
                              {isUnlocked ? (
                                <div className="w-8 h-8 rounded-full bg-[#153e35] border-2 border-white flex items-center justify-center text-white shadow-md shadow-[#153e35]/30">
                                  <CheckIcon fontSize="small" />
                                </div>
                              ) : isCurrentTarget ? (
                                <div className="w-8 h-8 rounded-full bg-[#fefaf3] border-2 border-[#c49340] flex items-center justify-center text-[#c49340] font-black text-xs animate-pulse shadow-md shadow-[#c49340]/20">
                                  {idx + 1}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#f7f3eb] border border-dashed border-[#d8caae] flex items-center justify-center text-[#a08a62]">
                                  <CardGiftcardIcon fontSize="small" />
                                </div>
                              )}
                            </div>

                            {/* Milestone Content Card */}
                            <div className={`flex-1 p-4 rounded-2xl border transition-all ${
                              isUnlocked 
                                ? 'bg-[#f0f7f4] border-[#b2dbcd] text-[#153e35]' 
                                : isCurrentTarget 
                                  ? 'bg-[#fefaf3] border-[#c49340]/60 shadow-xs text-[#232d2a]' 
                                  : 'bg-[#faf8f5] border-[#e8e1d5] opacity-75 text-[#6b7773]'
                            }`}>
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <h5 className={`font-extrabold text-sm ${isUnlocked ? 'text-[#153e35]' : 'text-[#232d2a]'}`}>
                                    {tier.title} — <span className={isUnlocked ? "text-[#153e35] font-black" : "text-[#c49340] font-black"}>{tier.target_points} pts</span>
                                  </h5>
                                </div>

                                {tier.monetary_value && (
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                    isUnlocked
                                      ? 'text-[#153e35] bg-[#e7f3f0] border-[#bfe2d9]'
                                      : 'text-[#8c6b2d] bg-[#f7f3eb] border-[#e2d5bd]'
                                  }`}>
                                    Equiv: ${tier.monetary_value.toFixed(2)} USD
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs font-semibold leading-snug ${isUnlocked ? 'text-[#153e35]' : 'text-[#333d39]'}`}>
                                {tier.prize_description}
                              </p>

                              {/* Status Badge */}
                              <div className="mt-2.5 flex items-center justify-between">
                                {isUnlocked ? (
                                  <span className="text-[10px] font-extrabold text-[#153e35] flex items-center gap-1 bg-[#e7f3f0] px-2.5 py-0.5 rounded-full border border-[#bfe2d9]">
                                    <CheckIcon fontSize="inherit" /> ¡Desbloqueado! Reclamable en caja.
                                  </span>
                                ) : isCurrentTarget ? (
                                  <span className="text-[10px] font-extrabold text-[#8c5e14] bg-[#fef8ed] px-2.5 py-0.5 rounded-full border border-[#e6d1a8] animate-pulse">
                                    Te faltan {pointsMissing} pts
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-[#8a7f6e] bg-[#f2ece1] px-2 py-0.5 rounded-md">
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

                  {consumerStatus.expiration_date && new Date(consumerStatus.expiration_date).getFullYear() < 2099 && (
                    <p className="text-[9px] text-[#9c9384] text-center font-medium">
                      Campaña vigente hasta: {new Date(consumerStatus.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FIRST TIME PIN SUCCESS SCREEN */}
          {firstTimePin && (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#f0f7f4] border border-[#b2dbcd] flex items-center justify-center text-[#153e35] shadow-inner animate-bounce">
                <CelebrationIcon fontSize="large" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#232d2a]">¡Registro Completado!</h4>
                <p className="text-xs text-[#6b7773] max-w-xs mx-auto leading-relaxed">
                  Tus puntos han sido asignados correctamente en tu primera visita a este comercio.
                </p>
              </div>

              <div className="w-full bg-[#faf8f5] border border-[#e8e1d5] p-4.5 rounded-2xl flex flex-col items-center gap-2.5 shadow-xs">
                <span className="text-[10px] text-[#153e35] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <LockIcon fontSize="inherit" /> PIN de Seguridad
                </span>
                <span className="text-2xl font-black text-[#153e35] tracking-widest bg-white px-5 py-1.5 rounded-xl border border-[#e8e1d5] shadow-xs">
                  {firstTimePin}
                </span>
                <p className="text-[11px] text-[#333d39] font-medium leading-relaxed max-w-[280px] mt-1.5">
                  🔒 Tu número ha sido registrado. Tu PIN secreto para reclamar premios es: <strong className="text-[#153e35] font-bold">{firstTimePin}</strong>. Guardalo o tomale captura, el cajero te lo pedirá para entregarte tu premio.
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
                className="w-full py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
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
