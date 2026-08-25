"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PhoneInputField } from '@feebli/shared';

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
  current_points: number;
  target_points: number;
  points_per_value_unit?: number;
  current_stamps: number;
  target_stamps: number;
  prize_description: string;
  expiration_date: string;
}

interface LoyaltyCampaign {
  id: string;
  business_id: string;
  target_points: number;
  points_per_value_unit: number;
  start_date: string;
  end_date: string;
  prize_description: string;
  title?: string;
  description?: string;
  status?: 'active' | 'inactive';
  created_at: string;
}

export default function MerchantPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Merchant Dashboard states
  const [merchantPhoneLookup, setMerchantPhoneLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<CustomerStatus | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([]);
  const [campaignStats, setCampaignStats] = useState<{
    id: string;
    active: boolean;
    target: number;
    points_per_value_unit: number;
    prize: string;
    expires: string;
    title: string;
    description: string;
  } | null>(null);
  const [unblurredInteractions, setUnblurredInteractions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Purchase Code states
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [mockDate, setMockDate] = useState<string>('2026-06-14T15:41:53-06:00');
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [redeemPinInput, setRedeemPinInput] = useState<string>('');
  
  // Modal states for code generation
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [modalCode, setModalCode] = useState<string | null>(null);

  // Searchable Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Actions Menu states
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const nicaraguanRegex = /^[578]\d{7}$/;

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch businesses and mock time on load
  useEffect(() => {
    fetch('/api/dev/mock-time')
      .then(res => res.json())
      .then(data => {
        if (data.mockDate) setMockDate(data.mockDate);
      })
      .catch(err => console.error('Error fetching mock time:', err));

    fetch('/api/businesses')
      .then(res => res.json())
      .then((data: Business[]) => {
        setBusinesses(data);
        const storedBusinessId = localStorage.getItem('selectedBusinessId');
        if (storedBusinessId && data.some(b => b.id === storedBusinessId)) {
          setSelectedBusinessId(storedBusinessId);
        } else if (data.length > 0) {
          setSelectedBusinessId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching businesses:', err));
  }, []);

  // Fetch data when active business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    localStorage.setItem('selectedBusinessId', selectedBusinessId);
    refreshMerchantDashboard();
  }, [selectedBusinessId]);

  const refreshMerchantDashboard = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch recent interactions
      const interRes = await fetch(`/api/businesses/${selectedBusinessId}/interactions`);
      const interData = await interRes.json();
      setRecentInteractions(Array.isArray(interData) ? interData : []);

      // 2. Fetch current active campaign details (lookup using dummy number)
      const dummyPhone = '+50588888888';
      const statusRes = await fetch(`/api/customers/${encodeURIComponent(dummyPhone)}/status?business_id=${selectedBusinessId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setCampaignStats({
          id: statusData.campaign_id,
          active: true,
          target: statusData.target_points,
          points_per_value_unit: statusData.points_per_value_unit || 10,
          prize: statusData.prize_description,
          expires: new Date(statusData.expiration_date).getFullYear() >= 2099 ? 'Nunca' : new Date(statusData.expiration_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' }),
          title: statusData.title || 'Campaña de Fidelidad',
          description: statusData.description || 'Acumula puntos por cada consumo.'
        });
      } else {
        setCampaignStats(null);
      }

      // 3. Fetch recent purchase codes
      const codesRes = await fetch(`/api/businesses/${selectedBusinessId}/codes`);
      if (codesRes.ok) {
        const codesData = await codesRes.json();
        setGeneratedCodes(Array.isArray(codesData) ? codesData : []);
      }

      // 4. Fetch campaigns for dropdown select
      const campaignsRes = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`);
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        const campaignList = Array.isArray(campaignsData) ? campaignsData : [];
        setCampaigns(campaignList);
        
        // Auto select first active campaign or the first campaign
        if (campaignList.length > 0) {
          const activeCamp = campaignList.find(c => c.status === 'active');
          if (activeCamp) {
            setSelectedCampaignId(activeCamp.id);
          } else {
            setSelectedCampaignId(campaignList[0].id);
          }
        } else {
          setSelectedCampaignId('');
        }
      }
    } catch (err) {
      console.error('Error updating merchant dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async (campaignId: string) => {
    if (!selectedBusinessId || !campaignId) {
      showToast('Por favor seleccione una campaña.', 'error');
      return;
    }
    const amountVal = parseFloat(purchaseAmount);
    if (isNaN(amountVal) || amountVal < 0) {
      showToast('Por favor ingrese un monto de compra válido.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId,
          purchaseAmount: amountVal,
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo generar el código.');
      }
      const data = await response.json();
      setLatestCode(data.code);
      setModalCode(data.code);
      setShowCodeModal(true);
      showToast('¡Código generado con éxito!');
      setInvoiceNumber('');
      refreshMerchantDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCodeStatus = (code: { is_associated: boolean; is_active: boolean; is_redeemed?: boolean; created_at: string }) => {
    if (!code.is_active) return { text: 'Desactivado', color: 'bg-slate-900 text-slate-650 border-slate-800' };
    if (code.is_redeemed) return { text: 'Redimido', color: 'bg-emerald-950/40 text-emerald-300 border-emerald-900/40' };
    if (code.is_associated) return { text: 'Asociado', color: 'bg-indigo-950/40 text-indigo-300 border-indigo-900/40' };
    const createdTime = new Date(code.created_at).getTime();
    const currentTime = new Date(mockDate).getTime(); // Feebli target context date
    const diffHrs = (currentTime - createdTime) / (1000 * 60 * 60);
    if (diffHrs > 24) {
      return { text: 'Expirado', color: 'bg-rose-955 text-rose-455 border-rose-900/50' };
    }
    return { text: 'Activo', color: 'bg-teal-950 text-teal-300 border-teal-900' };
  };

  // Lookup customer stamp status
  const handleMerchantLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setRedeemPinInput('');
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(merchantPhoneLookup)) {
      setLookupError('Formato inválido. Debe incluir el código de país (ej: +50588888888).');
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

  // Redeem reward
  const handleRedeemPrize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupResult) return;

    if (redeemPinInput.trim() !== '4932') {
      showToast('PIN de seguridad incorrecto o vacío.', 'error');
      return;
    }

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
      setRedeemPinInput('');
      
      // Refresh lookup and dashboard
      setLookupResult(prev => prev ? {
        ...prev,
        current_stamps: data.remaining_stamps
      } : null);

      refreshMerchantDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
            : 'bg-rose-950 border-rose-500 text-rose-300'
        }`}>
          <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 py-2 sm:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4rem] sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-sm">
                FEE
              </div>
              <div>
                <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400 leading-none">
                  feebli Backoffice
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">B2B Merchant Portal</p>
              </div>
            </div>
            
            {/* Menu Buttons under logo */}
            <nav className="flex items-center gap-1.5">
              <Link
                href="/"
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🏠</span> Panel General
              </Link>
              <Link
                href="/campaigns"
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-slate-800 text-slate-350 border-slate-700 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>📢</span> Campañas
              </Link>
              <Link
                href="/codes"
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-slate-800 text-slate-350 border-slate-700 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🎫</span> Códigos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-slate-400 hidden sm:inline">Comercio Activo:</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 flex items-center gap-2 transition-all cursor-pointer min-w-[170px] justify-between shadow-md"
                >
                  <span className="truncate">
                    {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando...'}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {isDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/* Dropdown panel */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 flex flex-col z-50 transition-all">
                    <input
                      type="text"
                      placeholder="Buscar comercio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      autoFocus
                    />
                    
                    <div className="mt-2.5 space-y-1 max-h-[200px] overflow-y-auto pr-1">
                      {filteredBusinesses.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-4">No se encontraron comercios.</p>
                      ) : (
                        filteredBusinesses.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setSelectedBusinessId(b.id);
                              setLookupResult(null);
                              setLookupError(null);
                              setMerchantPhoneLookup('');
                              setRedeemPinInput('');
                              setIsDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              b.id === selectedBusinessId
                                ? 'bg-indigo-650 text-white'
                                : 'text-slate-350 hover:bg-slate-950 hover:text-white'
                            }`}
                          >
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Menú de Acciones */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-750 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all shadow-md focus:outline-none"
                title="Menú de Acciones"
              >
                <span className="text-base">⚙️</span>
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800/60 mb-1">
                    <p className="text-xs font-bold text-slate-200">Administrador</p>
                    <p className="text-[10px] text-slate-500 font-medium">admin@feebli.com</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Información del Comercio');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-950 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>💼</span> Información del Comercio
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Ajustes de Cuenta');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-950 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>⚙️</span> Ajustes de Cuenta
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Reportes de Sellos');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-950 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>📊</span> Reportes de Sellos
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Soporte Técnico');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-950 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>🙋</span> Soporte Técnico
                  </button>

                  <div className="h-px bg-slate-800/60 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Cerrando sesión (Simulado)...');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-955 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>🚪</span> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Panel de Administración</span>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mt-1">
              💼 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Auditoría de comentarios por Inteligencia Artificial y validación de canje de sellos.
            </p>
          </div>

          <button
            onClick={refreshMerchantDashboard}
            disabled={isLoading}
            className="self-start md:self-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-950/50"
          >
            {isLoading ? 'Actualizando...' : '🔄 Actualizar Panel'}
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column (Stack 1): Active Campaign Details & Code Generation (takes 2/3 width) */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* 1. Campaign Specs card (wide card with internal columns) */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">📢 Campaña de Fidelidad Activa</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold border border-indigo-900/60 px-2 py-0.5 rounded animate-pulse">Activa</span>
              </h3>

              {campaignStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Campaign Information */}
                  <div className="space-y-4 pr-0 md:pr-4 md:border-r md:border-slate-800/60">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Título de Campaña:</p>
                      <p className="text-base font-bold text-slate-200 mt-0.5">{campaignStats.title}</p>
                    </div>
                    {campaignStats.description && (
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Descripción:</p>
                        <p className="text-xs text-slate-404 mt-0.5 leading-relaxed">{campaignStats.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-800/60">
                      <div>
                        <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Meta de Puntos:</p>
                        <p className="text-sm font-black text-indigo-400 mt-0.5">{campaignStats.target} Puntos</p>
                        <p className="text-[9px] text-slate-505 font-semibold mt-0.5">(Tasa: {campaignStats.points_per_value_unit} pts/$)</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-555 font-bold uppercase tracking-wider">Expiración:</p>
                        <p className="text-xs text-slate-300 font-semibold mt-1">{campaignStats.expires}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-[10px] text-slate-555 font-bold uppercase tracking-wider">Premio a entregar:</p>
                      <p className="text-xs font-bold text-emerald-450 mt-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]">
                        🎁 {campaignStats.prize}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Code Generator Form */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">⚡ Generar Código de Compra:</p>
                      <p className="text-xs text-slate-404 leading-relaxed mb-4">
                        Ingrese el monto de la compra para calcular los puntos correspondientes y generar el código de un solo uso para el cliente.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Monto de Compra ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          disabled={isGenerating}
                          className="bg-slate-955 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-full shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Número de Factura</label>
                        <input
                          type="text"
                          placeholder="Ej: FACT-1004 (Opcional)"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          disabled={isGenerating}
                          className="bg-slate-955 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-full shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleGenerateCode(campaignStats.id)}
                        disabled={isGenerating}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950/50 disabled:bg-slate-850 disabled:text-slate-505 active:scale-95"
                      >
                        {isGenerating ? 'Generando...' : '⚡ Generar Código'}
                      </button>
                      <Link
                        href={`/campaigns?edit=${campaignStats.id}`}
                        className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/40 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm text-center"
                      >
                        ✏️ Editar Campaña
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 text-lg border border-slate-750 shadow-inner">
                    📢
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-300">No hay campañas de fidelidad configuradas</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Necesitas crear una campaña de fidelización activa para este comercio para poder generar códigos de compra y acumular puntos.
                    </p>
                  </div>
                  <Link
                    href="/campaigns"
                    className="mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/50 transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-500/20"
                  >
                    ➕ Crear Nueva Campaña
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Recent codes list card (Wide Table/Grid format) */}
            {generatedCodes.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🎫 Últimos Códigos Generados</span>
                  </h3>
                  <Link
                    href="/codes"
                    className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-770 transition-all cursor-pointer"
                  >
                    Ver Todos los Códigos
                  </Link>
                </div>
                
                {/* Horizontal Ticket Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {generatedCodes.slice(0, 6).map((c, idx) => {
                    const status = getCodeStatus(c);
                    return (
                      <div key={idx} className="relative bg-slate-955 p-4 rounded-xl border border-slate-850 hover:border-slate-700 transition-all flex flex-col gap-3 justify-between shadow-sm overflow-hidden group">
                        {/* Decorative ticket cutouts */}
                        <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-900 rounded-full border-r border-slate-850 transform -translate-y-1/2"></div>
                        <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-900 rounded-full border-l border-slate-850 transform -translate-y-1/2"></div>
                        
                        <div className="flex items-center justify-between pl-1">
                          <span className="font-mono font-black text-slate-200 tracking-wider text-sm select-all">{c.code}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="space-y-1 pl-1 border-t border-slate-800/40 pt-2 text-[10px]">
                          {c.campaign && (
                            <div className="text-slate-400 truncate flex items-center gap-1">
                              <span className="opacity-60">📢</span> <span className="truncate">{c.campaign.title}</span>
                            </div>
                          )}
                          <div className="text-slate-500 flex justify-between">
                            <span>Monto: <strong className="text-slate-350">${c.purchase_amount?.toFixed(2) || '0.00'}</strong></span>
                            {c.invoice_number && <span>Factura: <strong className="text-slate-350">{c.invoice_number}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800/20 pt-2 mt-1 pl-1">
                          <span className="text-[9px] text-slate-600 font-medium">
                            {new Date(c.created_at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(c.code);
                              showToast('¡Código copiado!');
                            }}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            📋 Copiar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Side Column (Stack 2): Redemption Terminal & AI Audit Logs (takes 1/3 width) */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* 3. Redemption Terminal Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                <span>🎯 Terminal de Canjeo (Caja)</span>
              </h3>
              
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Ingrese el celular del cliente para verificar y redimir su tarjeta de sellos digital.
              </p>

              <form onSubmit={handleMerchantLookup} className="space-y-3 mb-4">
                <div className="flex flex-col">
                  <PhoneInputField
                    value={merchantPhoneLookup}
                    onChange={setMerchantPhoneLookup}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full"
                  />
                  {lookupError && (
                    <span className="text-[10px] text-rose-400 mt-1 font-semibold">⚠️ {lookupError}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Verificar Puntos
                </button>
              </form>

              {/* Lookup results */}
              {lookupResult && (
                <div className="bg-slate-955 p-4 rounded-xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-slate-505">Celular Cliente:</p>
                      <p className="text-xs font-bold text-slate-200">
                        {lookupResult.customer_phone.startsWith('+505') && lookupResult.customer_phone.length === 12
                          ? `+505 ${lookupResult.customer_phone.slice(4, 8)}-${lookupResult.customer_phone.slice(8)}`
                          : lookupResult.customer_phone}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      lookupResult.current_points >= lookupResult.target_points 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-900' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {lookupResult.current_points} / {lookupResult.target_points} pts
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min((lookupResult.current_points / lookupResult.target_points) * 100, 100)}%` }}
                    ></div>
                  </div>

                  {lookupResult.current_points >= lookupResult.target_points ? (
                    <form onSubmit={handleRedeemPrize} className="space-y-3 pt-1">
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        ✓ Meta Alcanzada. ¡Elegible para redención!
                      </p>
                      
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                          PIN de Seguridad *
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Ingrese PIN de 4 dígitos"
                          value={redeemPinInput}
                          onChange={(e) => setRedeemPinInput(e.target.value.replace(/\D/g, ''))}
                          required
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-full shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-650 to-emerald-700 hover:from-emerald-600 hover:to-emerald-650 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer border border-emerald-500/20 active:scale-95 transition-all"
                      >
                        🎁 Redimir Premio y Limpiar Puntos
                      </button>
                    </form>
                  ) : (
                    <p className="text-[10px] text-slate-505 pt-1 text-center font-medium">
                      No califica. Requiere {lookupResult.target_points - lookupResult.current_points} puntos más.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 4. AI Audit Log Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col">
              <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🔍 Registro & Auditoría AI</span>
                  </h3>
                  <p className="text-[10px] text-slate-550 mt-0.5">Comentarios validados por IA.</p>
                </div>
                
                <span className="text-[9px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  Total: {recentInteractions.length}
                </span>
              </div>

              {/* List Container */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {recentInteractions.length === 0 ? (
                  <div className="text-center py-12 text-slate-655 text-xs">
                    No se registran interacciones.
                  </div>
                ) : (
                  recentInteractions.map((inter) => {
                    const isSpam = inter.status === 'spam_hidden';
                    const showSpamContent = unblurredInteractions[inter.id];

                    return (
                      <div 
                        key={inter.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isSpam
                            ? 'bg-slate-955/30 border-rose-955/80 shadow-[inset_0_0_12px_rgba(244,63,94,0.03)]'
                            : 'bg-slate-955 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col gap-2 mb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-200">
                              📞 {inter.customer_phone.startsWith('+505') && inter.customer_phone.length === 12
                                ? `+505 ${inter.customer_phone.slice(4, 8)}-${inter.customer_phone.slice(8)}`
                                : inter.customer_phone}
                            </span>
                            
                            {/* Status badge */}
                            {inter.status === 'spam_hidden' && (
                              <span className="text-[8px] bg-rose-950 text-rose-350 font-bold px-1.5 py-0.5 rounded border border-rose-900/60 animate-pulse">
                                🚫 SPAM
                              </span>
                            )}
                            {inter.status === 'redimidos' && (
                              <span className="text-[8px] bg-emerald-950 text-emerald-355 font-bold px-1.5 py-0.5 rounded border border-emerald-900/60">
                                🎁 REDIMIDO
                              </span>
                            )}
                            {inter.status === 'accumulated' && (
                              <span className="text-[8px] bg-indigo-950 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-900/60">
                                ★ ACUMULADO
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {inter.invoice_number ? (
                              <span className="text-[8px] bg-slate-900 text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">
                                Factura: {inter.invoice_number}
                              </span>
                            ) : (
                              <span className="text-[8px] bg-yellow-950/30 text-amber-500/70 border border-amber-900/20 px-1.5 py-0.5 rounded">
                                Sin Compra
                              </span>
                            )}

                            {/* Category badge */}
                            {inter.ai_category && (
                              <span className="text-[8px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                📁 {inter.ai_category}
                              </span>
                            )}

                            {/* Sentiment badge */}
                            {inter.ai_sentiment && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                inter.ai_sentiment === 'positive' 
                                  ? 'bg-emerald-950/60 text-emerald-400 animate-pulse' 
                                  : inter.ai_sentiment === 'negative' 
                                  ? 'bg-rose-955 text-rose-450' 
                                  : 'bg-slate-900 text-slate-505'
                              }`}>
                                {inter.ai_sentiment === 'positive' ? '🟢 POS' : inter.ai_sentiment === 'negative' ? '🔴 NEG' : '⚪ NEU'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Feedback Text Area with AI Spam filtering blur */}
                        <div className="relative mt-1">
                          <p className={`leading-relaxed transition-all duration-300 text-[11px] ${
                            isSpam && !showSpamContent 
                              ? 'blur-sm select-none opacity-20 text-slate-600' 
                              : 'text-slate-300'
                          }`}>
                            {inter.feedback_text}
                          </p>

                          {/* Blur Reveal Banner */}
                          {isSpam && !showSpamContent && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-slate-900/95 border border-rose-950 px-2 py-1 rounded flex items-center gap-1.5 shadow-lg">
                                <span className="text-[9px] text-slate-400 font-bold">Spam AI</span>
                                <button 
                                  onClick={() => setUnblurredInteractions(prev => ({ ...prev, [inter.id]: true }))}
                                  className="text-[8px] bg-rose-955 hover:bg-rose-900 text-rose-350 px-1.5 py-0.5 rounded font-black border border-rose-850 transition-colors cursor-pointer"
                                >
                                  Revelar
                                </button>
                              </div>
                            </div>
                          )}

                          {isSpam && showSpamContent && (
                            <div className="mt-1 text-right">
                              <button 
                                onClick={() => setUnblurredInteractions(prev => ({ ...prev, [inter.id]: false }))}
                                className="text-[9px] text-slate-505 hover:text-slate-350 font-bold cursor-pointer"
                              >
                                Ocultar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="mt-2 text-[8px] text-slate-600 font-semibold text-right">
                          {new Date(inter.created_at).toLocaleString('es-NI')}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-650 font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
        <p className="mt-1 text-[10px] text-slate-800">Entorno local • Base temporal: 14 de Junio, 2026</p>
      </footer>

      {/* Code Modal */}
      {showCodeModal && modalCode && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-500/20">
              ✨
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">¡Código Generado!</h3>
              <p className="text-xs text-slate-450">Entrega este código de un solo uso al cliente para que acumule sellos.</p>
            </div>
            
            <div className="w-full bg-slate-955 border border-slate-850 py-4 px-2 rounded-2xl flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Código de Compra:</span>
              <span className="text-2xl font-black text-indigo-400 select-all tracking-widest font-mono">
                {modalCode}
              </span>
              <span className="text-[9px] text-slate-500">Válido por 24 horas</span>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(modalCode);
                  showToast('¡Código copiado al portapapeles!');
                }}
                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-650 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all border border-indigo-500/20"
              >
                📋 Copiar Código
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
                  setModalCode(null);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-750"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
