import React, { useState, useEffect } from 'react';

// API interfaces matching the backend
interface Business {
  id: string;
  name: string;
}


interface Interaction {
  id: string;
  business_id: string;
  campaign_id: string | null;
  customer_phone: string;
  invoice_number: string | null;
  feedback_text: string;
  ai_sentiment: 'positive' | 'negative' | 'neutral' | null;
  ai_category: 'service' | 'time' | 'quality' | 'cleanliness' | 'other' | null;
  ai_spam_confidence: boolean;
  status: 'accumulated' | 'redimidos' | 'spam_hidden';
  created_at: string;
}

interface CustomerStatus {
  customer_phone: string;
  current_stamps: number;
  target_stamps: number;
  prize_description: string;
  expiration_date: string;
}

export default function App() {
  // Global states
  const [viewMode, setViewMode] = useState<'consumer' | 'merchant'>('consumer');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Consumer states
  const [consumerTab, setConsumerTab] = useState<'landing' | 'register' | 'lookup'>('landing');
  const [phoneInput, setPhoneInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumerStatus, setConsumerStatus] = useState<CustomerStatus | null>(null);


  // Merchant states
  const [merchantPhoneLookup, setMerchantPhoneLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<CustomerStatus | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([]);
  const [campaignStats, setCampaignStats] = useState<{ active: boolean; target: number; prize: string; expires: string } | null>(null);
  const [unblurredInteractions, setUnblurredInteractions] = useState<Record<string, boolean>>({});

  // Nicaraguan phone regex format
  const nicaraguanRegex = /^[578]\d{7}$/;

  // Toast Notification helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch businesses on load
  useEffect(() => {
    fetch('/api/businesses')
      .then(res => res.json())
      .then((data: Business[]) => {
        setBusinesses(data);
        if (data.length > 0) {
          setSelectedBusinessId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching businesses:', err));
  }, []);

  // Fetch data for Merchant Dashboard when business changes
  useEffect(() => {
    if (!selectedBusinessId || viewMode !== 'merchant') return;
    refreshMerchantDashboard();
  }, [selectedBusinessId, viewMode]);

  const refreshMerchantDashboard = async () => {
    try {
      // 1. Fetch recent interactions
      const interRes = await fetch(`/api/businesses/${selectedBusinessId}/interactions`);
      const interData = await interRes.json();
      setRecentInteractions(interData);

      // 2. Fetch current active campaign details
      // We look up the customer status for a dummy phone number to extract campaign details
      const dummyPhone = '88888888';
      const statusRes = await fetch(`/api/customers/${dummyPhone}/status?business_id=${selectedBusinessId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setCampaignStats({
          active: true,
          target: statusData.target_stamps,
          prize: statusData.prize_description,
          expires: new Date(statusData.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      } else {
        setCampaignStats(null);
      }
    } catch (err) {
      console.error('Error updating merchant dashboard:', err);
    }
  };

  // Handler: Customer Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicaraguanRegex.test(phoneInput)) {
      showToast('Número de teléfono inválido para Nicaragua. Debe iniciar con 5, 7 u 8 y tener 8 dígitos.', 'error');
      return;
    }
    if (feedbackInput.trim().length < 3) {
      showToast('Por favor escribe un comentario de al menos 3 caracteres.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: selectedBusinessId,
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
        showToast(invoiceInput ? '¡Visita registrada y punto sumado!' : '¡Feedback enviado con éxito!');
      }

      // If registered with purchase, show their current stamp card
      if (invoiceInput && data.stamps) {
        setConsumerStatus({
          customer_phone: phoneInput,
          current_stamps: data.stamps.current_stamps,
          target_stamps: data.stamps.target_stamps,
          prize_description: data.stamps.prize,
          expiration_date: data.stamps.campaign_expires
        });
      } else {
        setConsumerStatus(null);
      }

      // Reset form fields
      setInvoiceInput('');
      setFeedbackInput('');
      setConsumerTab('lookup'); // Navigate to lookup view to display result/stamp card
      triggerPointsLookup(phoneInput); // Query points for display

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Consumer Points Lookup
  const handleConsumerLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicaraguanRegex.test(phoneInput)) {
      showToast('Formato de teléfono inválido.', 'error');
      return;
    }
    setIsSubmitting(true);
    await triggerPointsLookup(phoneInput);
    setIsSubmitting(false);
  };

  const triggerPointsLookup = async (phone: string) => {
    try {
      const response = await fetch(`/api/customers/${phone}/status?business_id=${selectedBusinessId}`);
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

  // Handler: Merchant Lookup
  const handleMerchantLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!nicaraguanRegex.test(merchantPhoneLookup)) {
      setLookupError('Formato inválido. Debe tener 8 dígitos iniciando con 5, 7 o 8.');
      setLookupResult(null);
      return;
    }

    try {
      const response = await fetch(`/api/customers/${merchantPhoneLookup}/status?business_id=${selectedBusinessId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cliente no encontrado o sin puntos');
      }

      setLookupResult(data);
    } catch (err: any) {
      setLookupError(err.message);
      setLookupResult(null);
    }
  };

  // Handler: Merchant Redemption Trigger
  const handleRedeemPrize = async () => {
    if (!lookupResult) return;
    try {
      const response = await fetch('/api/businesses/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_phone: lookupResult.customer_phone,
          business_id: selectedBusinessId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al canjear premio');
      }

      showToast(`¡Premio canjeado con éxito! Se redimieron ${data.redeemed_stamps} puntos.`);
      
      // Refresh lookup
      setLookupResult(prev => prev ? {
        ...prev,
        current_stamps: data.remaining_stamps
      } : null);

      // Refresh Merchant list
      refreshMerchantDashboard();

    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border transition-all duration-300 animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
            : 'bg-rose-950 border-rose-500 text-rose-300'
        }`}>
          <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Main Global Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              LOY
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400 leading-none">
                StampAI SaaS
              </h1>
              <p className="text-xs text-slate-500 font-medium">B2B Loyalty & Feedback</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Business Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400 hidden sm:inline">Comercio Activo:</label>
              <select
                value={selectedBusinessId}
                onChange={(e) => {
                  setSelectedBusinessId(e.target.value);
                  setConsumerStatus(null);
                  setLookupResult(null);
                }}
                className="bg-slate-800 border border-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setViewMode('consumer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'consumer'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📱 Cliente
              </button>
              <button
                onClick={() => setViewMode('merchant')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'merchant'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💼 Comercio
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 justify-center">
        
        {/* ========================================================
            VIEW MODE: CONSUMER SIMULATOR (MOBILE VIEW)
            ======================================================== */}
        {viewMode === 'consumer' && (
          <div className="flex-1 flex flex-col items-center py-4">
            
            <div className="text-center max-w-md mb-6">
              <h2 className="text-xl font-bold mb-1">Simulador de Smartphone</h2>
              <p className="text-sm text-slate-400">
                Así es como el cliente ve la landing page tras escanear el código QR en el establecimiento de <span className="font-semibold text-indigo-400">{businesses.find(b => b.id === selectedBusinessId)?.name || 'Comercio'}</span>.
              </p>
            </div>

            {/* Smartphone Case Frame */}
            <div className="w-[375px] h-[720px] rounded-[48px] bg-slate-900 border-[8px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative">
              {/* Speaker / Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-950 rounded-full"></div>
              </div>

              {/* Status Bar */}
              <div className="h-10 bg-slate-900 flex items-end justify-between px-6 pb-1 text-[11px] font-semibold text-slate-500">
                <span>15:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <span>🔋 85%</span>
                </div>
              </div>

              {/* In-App Content Wrapper */}
              <div className="flex-1 bg-slate-950 overflow-y-auto px-5 py-4 flex flex-col">
                
                {/* Brand Banner */}
                <div className="text-center py-4 border-b border-slate-900 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto flex items-center justify-center font-bold text-lg text-white mb-2 shadow-md">
                    {businesses.find(b => b.id === selectedBusinessId)?.name?.charAt(0) || 'B'}
                  </div>
                  <h3 className="font-bold text-base text-slate-200">
                    {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Programa de Fidelidad & Feedback</p>
                </div>

                {/* Simulated Screen Body */}
                <div className="flex-1 flex flex-col">
                  
                  {/* LANDING VIEW */}
                  {consumerTab === 'landing' && (
                    <div className="flex-1 flex flex-col justify-center gap-4 animate-stamp">
                      <div className="text-center mb-2">
                        <p className="text-sm text-slate-300 font-medium">¡Te damos la bienvenida!</p>
                        <h4 className="text-lg font-bold text-slate-200">¿Qué deseas hacer hoy?</h4>
                      </div>

                      <button
                        onClick={() => {
                          setConsumerTab('register');
                        }}
                        className="w-full py-4 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-950/50 flex flex-col items-center gap-1 border border-indigo-400/20 active:scale-95 transition-transform"
                      >
                        <span className="text-xl">✨</span>
                        <span className="text-sm">Registrar Visita / Feedback</span>
                        <span className="text-[10px] text-indigo-300 font-normal">Suma puntos o deja tu opinión</span>
                      </button>

                      <button
                        onClick={() => {
                          setConsumerTab('lookup');
                        }}
                        className="w-full py-4 px-5 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-2xl font-bold flex flex-col items-center gap-1 border border-slate-800 active:scale-95 transition-transform"
                      >
                        <span className="text-xl">🎫</span>
                        <span className="text-sm">Consultar mis Puntos / Premios</span>
                        <span className="text-[10px] text-slate-500 font-normal">Revisa tus sellos acumulados</span>
                      </button>

                      <div className="mt-8 text-center bg-slate-900/50 p-3.5 rounded-xl border border-slate-900">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Campaña Vigente</p>
                        <p className="text-xs text-indigo-400 font-semibold mb-1">
                          {selectedBusinessId === '11111111-1111-1111-1111-111111111111' 
                            ? '6 Sellos = ¡T-Bone Gratis!' 
                            : '10 Sellos = ¡1 Mes de Membresía VIP!'}
                        </p>
                        <p className="text-[10px] text-slate-500">Usa tu número de celular para acumular.</p>
                      </div>
                    </div>
                  )}

                  {/* REGISTER FORM */}
                  {consumerTab === 'register' && (
                    <div className="flex flex-col animate-stamp">
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setConsumerTab('landing')}
                          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400 hover:text-white"
                        >
                          ←
                        </button>
                        <span className="font-bold text-sm text-slate-300">Registrar Visita</span>
                      </div>

                      <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        
                        {/* Phone input */}
                        <div className="flex flex-col">
                          <label className="text-[11px] font-semibold text-slate-400 mb-1">
                            Número de Teléfono (Nicaragua) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: 88888888"
                            pattern="^[578]\d{7}$"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-slate-900 transition-colors"
                          />
                          <span className="text-[9px] text-slate-500 mt-1">Formato: 8 dígitos iniciando con 5, 7, o 8.</span>
                          <span className="error-msg text-[9px] text-rose-400 hidden mt-1">⚠️ Ingrese un formato nicaragüense válido.</span>
                        </div>

                        {/* Invoice Number */}
                        <div className="flex flex-col">
                          <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                            <span>Número de Factura / Ticket</span>
                            <span className="text-[9px] text-slate-500 font-normal">Opcional</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: FAC-1234 (Suma 1 Sello)"
                            value={invoiceInput}
                            onChange={(e) => setInvoiceInput(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                          />
                          <span className="text-[9px] text-slate-500 mt-1">
                            Dejar vacío si no realizaste una compra (queja o sugerencia). No sumará sellos.
                          </span>
                        </div>

                        {/* Feedback Textarea */}
                        <div className="flex flex-col">
                          <label className="text-[11px] font-semibold text-slate-400 mb-1">
                            Comentario / Opinión *
                          </label>
                          <textarea
                            required
                            minLength={3}
                            rows={3}
                            placeholder="Cuéntanos qué tal estuvo tu visita..."
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                          />
                          <span className="text-[9px] text-slate-500 mt-1">Comparte comentarios reales. Será evaluado por el sistema de IA.</span>
                          <span className="error-msg text-[9px] text-rose-400 hidden mt-1">⚠️ El comentario debe tener al menos 3 caracteres.</span>
                        </div>

                        {/* Submit button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <span>Enviar Registro</span>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* LOOKUP & STAMP CARD VIEW */}
                  {consumerTab === 'lookup' && (
                    <div className="flex flex-col animate-stamp">
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => {
                            setConsumerTab('landing');
                            setConsumerStatus(null);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400 hover:text-white"
                        >
                          ←
                        </button>
                        <span className="font-bold text-sm text-slate-300">Mis Puntos</span>
                      </div>

                      {/* Lookup Form */}
                      {!consumerStatus && (
                        <form onSubmit={handleConsumerLookup} className="space-y-4 mb-4">
                          <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-slate-400 mb-1">
                              Ingresa tu número de teléfono
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: 88888888"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                            <span className="text-[9px] text-slate-500 mt-1">Formato: 8 dígitos de Nicaragua.</span>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 active:scale-95 disabled:bg-slate-950 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? 'Cargando...' : 'Consultar Puntos'}
                          </button>
                        </form>
                      )}

                      {/* Stamp Card Visualization */}
                      {consumerStatus && (
                        <div className="space-y-4 animate-stamp">
                          
                          {/* Glamosphic Stamp Card Graphic */}
                          <div className="glass-premium p-4 rounded-3xl relative overflow-hidden border border-slate-800">
                            
                            {/* Card Chip decoration */}
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-8 h-6 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                <div className="w-5 h-4 border border-amber-500/20 rounded-sm"></div>
                              </div>
                              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
                                Digital Loyalty Card
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 font-medium">Cliente celular:</p>
                            <p className="font-bold text-sm text-slate-200 tracking-wider mb-4">
                              +505 {consumerStatus.customer_phone.slice(0,4)}-{consumerStatus.customer_phone.slice(4)}
                            </p>

                            {/* Stamp Grid */}
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              {Array.from({ length: consumerStatus.target_stamps }).map((_, idx) => {
                                const isEarned = idx < consumerStatus.current_stamps;
                                return (
                                  <div
                                    key={idx}
                                    className={`aspect-square rounded-full flex items-center justify-center relative transition-all duration-500 border-2 ${
                                      isEarned
                                        ? 'bg-gradient-to-tr from-indigo-500 to-violet-600 border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-100'
                                        : 'bg-slate-950/80 border-slate-800 border-dashed scale-95'
                                    }`}
                                  >
                                    {isEarned ? (
                                      <span className="text-white text-xs font-black drop-shadow animate-stamp">✓</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-700 font-bold">{idx + 1}</span>
                                    )}

                                    {/* Shimmer overlay for earned stamps */}
                                    {isEarned && (
                                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent rotate-45 transform translate-x-full animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Count Progress Bar */}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                              <span>Progreso acumulado:</span>
                              <span className="text-indigo-300 font-bold">{consumerStatus.current_stamps} / {consumerStatus.target_stamps} sellos</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                                style={{ width: `${(consumerStatus.current_stamps / consumerStatus.target_stamps) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Reward description info */}
                          <div className="bg-indigo-950/40 border border-indigo-900/30 rounded-2xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Premio Activo</p>
                            <p className="text-xs text-slate-200 font-bold">{consumerStatus.prize_description}</p>
                            {consumerStatus.current_stamps >= consumerStatus.target_stamps ? (
                              <div className="mt-2 text-xs text-emerald-400 font-black animate-pulse flex items-center justify-center gap-1">
                                <span>🎉 ¡Felicidades! Reclama tu premio en caja.</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1.5">
                                Faltan <span className="font-bold text-indigo-400">{consumerStatus.target_stamps - consumerStatus.current_stamps}</span> visitas más para ganar.
                              </p>
                            )}
                          </div>

                          <p className="text-[9px] text-slate-600 text-center">
                            Vence: {new Date(consumerStatus.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>

                          <button
                            onClick={() => setConsumerStatus(null)}
                            className="w-full py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold"
                          >
                            Consultar otra cuenta
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Home Indicator line */}
              <div className="h-6 bg-slate-900 flex items-center justify-center pb-2">
                <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            VIEW MODE: B2B MERCHANT DASHBOARD
            ======================================================== */}
        {viewMode === 'merchant' && (
          <div className="space-y-6 animate-stamp">
            
            {/* Top Stats Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Estadísticas de Negocio</span>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  💼 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Panel de Administración'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Revisa el progreso de la campaña de fidelidad y modera el feedback de tus clientes en tiempo real.
                </p>
              </div>

              <button
                onClick={refreshMerchantDashboard}
                className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                🔄 Actualizar Panel
              </button>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Stack 1): Active Campaign Details & Redemption */}
              <div className="space-y-6 lg:col-span-1">
                
                {/* 1. Campaign Specs card */}
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                    <span>📢 Campaña Activa</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold border border-indigo-900/60 px-2 py-0.5 rounded">En Curso</span>
                  </h3>

                  {campaignStats ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Meta de visitas por premio:</p>
                        <p className="text-lg font-bold text-indigo-400">{campaignStats.target} Sellos</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Premio a entregar:</p>
                        <p className="text-sm font-semibold text-slate-200">{campaignStats.prize}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Vence:</p>
                        <p className="text-xs text-slate-300 font-medium">{campaignStats.expires}</p>
                      </div>
                      <div className="text-[10px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        🔑 Configurado sobre la fecha de simulación: <span className="font-bold">2026-06-14</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No hay campañas de fidelidad activas en este momento.
                    </div>
                  )}
                </div>

                {/* 2. Redemption Terminal Card */}
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 mb-4">
                    🎯 Terminal de Canjeo (Cajero)
                  </h3>
                  
                  <p className="text-xs text-slate-400 mb-4">
                    Busca al cliente por su número de celular nicaragüense para verificar y canjear su tarjeta de sellos digital.
                  </p>

                  <form onSubmit={handleMerchantLookup} className="space-y-3 mb-4">
                    <div className="flex flex-col">
                      <input
                        type="text"
                        placeholder="Teléfono del cliente (Ej: 88888888)"
                        value={merchantPhoneLookup}
                        onChange={(e) => setMerchantPhoneLookup(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                      {lookupError && (
                        <span className="text-[10px] text-rose-400 mt-1 font-semibold">⚠️ {lookupError}</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                    >
                      Verificar Sellos
                    </button>
                  </form>

                  {/* Lookup results */}
                  {lookupResult && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 animate-stamp">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-500">Cliente verificado:</p>
                          <p className="text-sm font-bold text-slate-200">+505 {lookupResult.customer_phone}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          lookupResult.current_stamps >= lookupResult.target_stamps 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-900/60' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {lookupResult.current_stamps} / {lookupResult.target_stamps} sellos
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min((lookupResult.current_stamps / lookupResult.target_stamps) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {lookupResult.current_stamps >= lookupResult.target_stamps ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] text-emerald-400 font-semibold">
                            ✓ ¡Elegible para premio! El cliente cumple con los requisitos.
                          </p>
                          <button
                            onClick={handleRedeemPrize}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/30 animate-pulse border border-emerald-400/20"
                          >
                            🎁 Entregar Premio y Redimir Sellos
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 pt-1 text-center font-medium">
                          No califica todavía. Requiere {lookupResult.target_stamps - lookupResult.current_stamps} sellos más.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (Stack 2): Feedbacks & AI Audit Log */}
              <div className="lg:col-span-2 space-y-6">
                
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex-1 flex flex-col">
                  
                  <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300">🔍 Registro de Visitas & Auditoría AI</h3>
                      <p className="text-xs text-slate-500">Últimos comentarios validados por el microservicio de Inteligencia Artificial.</p>
                    </div>
                    
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      Total: {recentInteractions.length} registros
                    </span>
                  </div>

                  {/* List Container */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {recentInteractions.length === 0 ? (
                      <div className="text-center py-12 text-slate-600 text-sm">
                        Aún no hay visitas o comentarios registrados para este negocio.
                      </div>
                    ) : (
                      recentInteractions.map((inter) => {
                        const isSpam = inter.status === 'spam_hidden';
                        const showSpamContent = unblurredInteractions[inter.id];

                        return (
                          <div 
                            key={inter.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isSpam
                                ? 'bg-slate-950/30 border-rose-950/80 shadow-[inset_0_0_12px_rgba(244,63,94,0.03)]'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              
                              {/* Customer and Invoice */}
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-200">📞 +505 {inter.customer_phone}</span>
                                {inter.invoice_number ? (
                                  <span className="text-[9px] bg-slate-900 text-slate-400 font-bold border border-slate-800 px-2 py-0.5 rounded">
                                    Factura: {inter.invoice_number}
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-yellow-950/30 text-amber-500 font-bold border border-amber-900/30 px-2 py-0.5 rounded">
                                    Sin Compra / Queja
                                  </span>
                                )}
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Status badge */}
                                {inter.status === 'spam_hidden' && (
                                  <span className="text-[9px] bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-900/60 flex items-center gap-1 animate-pulse">
                                    🚫 SPAM OCULTO
                                  </span>
                                )}
                                {inter.status === 'redimidos' && (
                                  <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-900/60">
                                    🎁 REDIMIDO
                                  </span>
                                )}
                                {inter.status === 'accumulated' && (
                                  <span className="text-[9px] bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-900/60">
                                    ★ ACUMULADO
                                  </span>
                                )}

                                {/* Category badge */}
                                {inter.ai_category && (
                                  <span className="text-[9px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded uppercase">
                                    📁 {inter.ai_category}
                                  </span>
                                )}

                                {/* Sentiment badge */}
                                {inter.ai_sentiment && (
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    inter.ai_sentiment === 'positive' 
                                      ? 'bg-emerald-950/60 text-emerald-400' 
                                      : inter.ai_sentiment === 'negative' 
                                      ? 'bg-rose-950/60 text-rose-400' 
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {inter.ai_sentiment === 'positive' ? '🟢 POSITIVO' : inter.ai_sentiment === 'negative' ? '🔴 NEGATIVO' : '⚪ NEUTRAL'}
                                  </span>
                                )}
                              </div>

                            </div>

                            {/* Feedback Text Area with AI Spam filtering blur */}
                            <div className="relative">
                              <p className={`text-xs leading-relaxed transition-all duration-300 ${
                                isSpam && !showSpamContent 
                                  ? 'blur-sm select-none opacity-20 text-slate-500' 
                                  : 'text-slate-300'
                              }`}>
                                {inter.feedback_text}
                              </p>

                              {/* Blur Reveal Banner */}
                              {isSpam && !showSpamContent && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-slate-900/90 border border-rose-950 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
                                    <span className="text-xs">🔒</span>
                                    <span className="text-[10px] text-slate-300 font-bold">Comentario Oculto por Spam AI</span>
                                    <button 
                                      onClick={() => setUnblurredInteractions(prev => ({ ...prev, [inter.id]: true }))}
                                      className="text-[9px] bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-0.5 rounded font-black border border-rose-800 transition-colors cursor-pointer"
                                    >
                                      Revelar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isSpam && showSpamContent && (
                                <div className="mt-2 text-right">
                                  <button 
                                    onClick={() => setUnblurredInteractions(prev => ({ ...prev, [inter.id]: false }))}
                                    className="text-[9px] text-slate-500 hover:text-slate-300 font-bold"
                                  >
                                    Ocultar de nuevo
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <div className="mt-3 text-[9px] text-slate-600 font-semibold text-right">
                              Registrado: {new Date(inter.created_at).toLocaleString('es-NI')}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600 font-medium">
        <p>© 2026 StampAI SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
        <p className="mt-1.5 text-[10px] text-slate-750">Entorno local • Base temporal: 14 de Junio, 2026</p>
      </footer>

    </div>
  );
}
