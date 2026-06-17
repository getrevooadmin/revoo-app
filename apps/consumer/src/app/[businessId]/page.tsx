"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PhoneInputField } from '@feebli/shared';

interface Business {
  id: string;
  name: string;
}

interface CustomerStatus {
  customer_phone: string;
  current_points: number;
  target_points: number;
  current_stamps: number;
  target_stamps: number;
  prize_description: string;
  expiration_date: string;
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
        showToast(hasPurchaseCode ? '¡Visita registrada y punto sumado!' : '¡Feedback enviado con éxito!');
      }

      // If registered with purchase, show their current stamp card
      if (hasPurchaseCode && (data.points || data.stamps)) {
        const stats = data.points || data.stamps;
        setConsumerStatus({
          customer_phone: phoneInput,
          current_points: stats.current_points ?? stats.current_stamps,
          target_points: stats.target_points ?? stats.target_stamps,
          current_stamps: stats.current_points ?? stats.current_stamps,
          target_stamps: stats.target_points ?? stats.target_stamps,
          prize_description: stats.prize,
          expiration_date: stats.campaign_expires
        });
      } else {
        setConsumerStatus(null);
      }

      // Reset form fields
      const submittedPhone = phoneInput;
      setPhoneInput('');
      setInvoiceInput('');
      setFeedbackInput('');
      
      if (hasPurchaseCode) {
        setConsumerTab('lookup'); // Navigate to lookup view to display result/stamp card
        triggerPointsLookup(submittedPhone); // Query points for display
      } else {
        setConsumerTab('landing'); // Navigate back to landing view
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

      setConsumerStatus(data);
    } catch (err: any) {
      showToast(err.message, 'error');
      setConsumerStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
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

      {/* Main Container */}
      <div className="text-center max-w-md mb-6">
        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400">
          Feebli Portal
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Escanee el código QR en caja para acumular puntos o revisar sus recompensas.
        </p>

        {/* Business Selector */}
        <div className="relative mt-4 z-50" ref={dropdownRef}>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 w-fit mx-auto select-none">
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
              <span className="text-[10px] text-slate-500">{isDropdownOpen ? '▲' : '▼'}</span>
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
      <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col p-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="text-center pb-6 border-b border-slate-800 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 mx-auto flex items-center justify-center font-black text-2xl text-white mb-3 shadow-lg shadow-indigo-500/20">
            {activeBusiness?.name?.charAt(0) || 'B'}
          </div>
          <h3 className="font-black text-xl text-slate-100">
            {activeBusiness?.name || 'Cargando comercio...'}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">Programa de Lealtad & Feedback</p>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* TABS 1: LANDING VIEW */}
          {consumerTab === 'landing' && (
            <div className="flex-1 flex flex-col justify-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-xs text-slate-400 font-medium">¡Te damos la bienvenida!</p>
                <h4 className="text-lg font-black text-slate-100">¿Qué deseas realizar?</h4>
              </div>

              <button
                onClick={() => setConsumerTab('register')}
                className="w-full py-4 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-950/40 flex flex-col items-center gap-1 border border-indigo-400/20 active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-lg">✨</span>
                <span className="text-sm">Registrar Visita & Feedback</span>
                <span className="text-[10px] text-indigo-300 font-normal">Suma sellos en tu consumo</span>
              </button>

              <button
                onClick={() => setConsumerTab('lookup')}
                className="w-full py-4 px-5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-2xl font-bold flex flex-col items-center gap-1 border border-slate-700 active:scale-95 transition-all cursor-pointer text-center"
              >
                <span className="text-lg">🎫</span>
                <span className="text-sm">Consultar mis Puntos / Premios</span>
                <span className="text-[10px] text-slate-500 font-normal">Revisa tus sellos acumulados</span>
              </button>

              <div className="mt-8 text-center bg-slate-950/40 p-4 rounded-2xl border border-slate-950">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Premio Vigente</p>
                <p className="text-xs text-indigo-400 font-black">
                  {businessId === '11111111-1111-1111-1111-111111111111' 
                    ? '6 Sellos = ¡T-Bone Gratis!' 
                    : '10 Sellos = ¡1 Mes de Membresía VIP!'}
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Regístrese con su número telefónico para ganar.</p>
              </div>
            </div>
          )}

          {/* TABS 2: REGISTER FORM */}
          {consumerTab === 'register' && (
            <div className="flex flex-col py-2">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setConsumerTab('landing')}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ←
                </button>
                <span className="font-bold text-sm text-slate-300">Registrar Visita</span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
                    <span>Código de Compra</span>
                    <span className="text-[9px] text-slate-500 font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: COD-1234"
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <span className="text-[9px] text-slate-500 mt-1">
                    Por cada compra realizada puedes acumular sellos en tu tarjeta digital.
                  </span>
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1">
                    Opinión / Feedback *
                  </label>
                  <textarea
                    required
                    minLength={3}
                    rows={3}
                    placeholder="Cuéntanos cómo estuvo tu experiencia..."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  />
                  <span className="text-[9px] text-slate-500 mt-1">El comentario es evaluado por el sistema de IA.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-800 disabled:text-slate-650 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Procesando...</span>
                  ) : (
                    <span>Enviar Registro</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TABS 3: LOOKUP & STAMP CARD */}
          {consumerTab === 'lookup' && (
            <div className="flex flex-col py-2">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setConsumerTab('landing');
                    setConsumerStatus(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ←
                </button>
                <span className="font-bold text-sm text-slate-300">Mi Tarjeta de Sellos</span>
              </div>

              {!consumerStatus && (
                <form onSubmit={handleConsumerLookup} className="space-y-4 mb-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-slate-400 mb-1">
                      Ingresa tu número de celular
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
                    {isSubmitting ? 'Cargando...' : 'Consultar Puntos'}
                  </button>
                </form>
              )}

              {/* Stamp Card view */}
              {consumerStatus && (
                <div className="space-y-4">
                  
                  {/* Glassmorphic Stamp Card */}
                  <div className="bg-gradient-to-br from-slate-950 to-indigo-950/60 p-4 rounded-3xl relative overflow-hidden border border-slate-800 shadow-xl">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-8 h-6 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <div className="w-5 h-4 border border-amber-500/20 rounded-sm"></div>
                      </div>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-955/60 px-2 py-0.5 rounded border border-indigo-900/50">
                        Tarjeta Digital
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-555 font-medium">Cliente celular:</p>
                    <p className="font-bold text-sm text-slate-200 tracking-wider mb-4">
                      {consumerStatus.customer_phone.startsWith('+505') && consumerStatus.customer_phone.length === 12
                        ? `+505 ${consumerStatus.customer_phone.slice(4, 8)}-${consumerStatus.customer_phone.slice(8)}`
                        : consumerStatus.customer_phone}
                    </p>

                    {/* Points Balance Display */}
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-950/40 border border-slate-850 rounded-2xl mb-4 relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>
                      
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Tu Balance</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 drop-shadow-sm">
                          {consumerStatus.current_points}
                        </span>
                        <span className="text-slate-550 text-xs font-semibold">
                          / {consumerStatus.target_points} Puntos
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                      <span>Progreso:</span>
                      <span className="text-indigo-300 font-bold">{Math.round((consumerStatus.current_points / consumerStatus.target_points) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                        style={{ width: `${Math.min((consumerStatus.current_points / consumerStatus.target_points) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Reward Box */}
                  <div className="bg-indigo-950/30 border border-indigo-900/35 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] text-slate-555 font-medium uppercase tracking-wider mb-1">Premio Activo</p>
                    <p className="text-xs text-slate-200 font-bold">{consumerStatus.prize_description}</p>
                    {consumerStatus.current_points >= consumerStatus.target_points ? (
                      <div className="mt-2 text-xs text-emerald-450 font-black animate-pulse">
                        🎉 ¡Meta alcanzada! Reclama tu premio en caja.
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Te faltan <span className="font-bold text-indigo-400">{consumerStatus.target_points - consumerStatus.current_points}</span> puntos para canjear.
                      </p>
                    )}
                  </div>

                  <p className="text-[9px] text-slate-650 text-center">
                    Expiración de campaña: {new Date(consumerStatus.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>

                  <button
                    onClick={() => setConsumerStatus(null)}
                    className="w-full py-2 border border-slate-800 hover:border-slate-750 text-slate-450 hover:text-slate-250 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Consultar otra tarjeta
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
