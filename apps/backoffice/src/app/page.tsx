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
      const interRes = await fetch(`/api/businesses/${selectedBusinessId}/interactions`);
      const interData = await interRes.json();
      setRecentInteractions(Array.isArray(interData) ? interData : []);

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

      const codesRes = await fetch(`/api/businesses/${selectedBusinessId}/codes`);
      if (codesRes.ok) {
        const codesData = await codesRes.json();
        setGeneratedCodes(Array.isArray(codesData) ? codesData : []);
      }

      const campaignsRes = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`);
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        const campaignList = Array.isArray(campaignsData) ? campaignsData : [];
        setCampaigns(campaignList);
        
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
    if (!code.is_active) return { text: 'Desactivado', color: 'bg-[#faf8f5] text-[#9c9384] border-[#e8e1d5]' };
    if (code.is_redeemed) return { text: 'Redimido', color: 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' };
    if (code.is_associated) return { text: 'Asociado', color: 'bg-[#f7f3eb] text-[#8c6b2d] border-[#e2d5bd]' };
    const createdTime = new Date(code.created_at).getTime();
    const currentTime = new Date(mockDate).getTime();
    const diffHrs = (currentTime - createdTime) / (1000 * 60 * 60);
    if (diffHrs > 24) {
      return { text: 'Expirado', color: 'bg-[#fdf2f2] text-[#9b1c1c] border-[#f5c6c6]' };
    }
    return { text: 'Activo', color: 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' };
  };

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
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#f0f7f4] border-[#b2dbcd] text-[#153e35]' 
            : 'bg-[#fdf2f2] border-[#f5c6c6] text-[#9b1c1c]'
        }`}>
          <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#e8e1d5] bg-white sticky top-0 z-40 py-2 sm:py-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4rem] sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#153e35] flex items-center justify-center font-black text-white shadow-md shadow-[#153e35]/15 text-xs tracking-wider">
                FEE
              </div>
              <div>
                <h1 className="text-base font-extrabold text-[#153e35] leading-none">
                  feebli Backoffice
                </h1>
                <p className="text-[10px] text-[#6b7773] font-medium">B2B Merchant Portal</p>
              </div>
            </div>
            
            {/* Menu Buttons under logo */}
            <nav className="flex items-center gap-1.5">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#153e35] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🏠</span> Panel General
              </Link>
              <Link
                href="/campaigns"
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1"
              >
                <span>📢</span> Campañas
              </Link>
              <Link
                href="/codes"
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🎫</span> Códigos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-[#6b7773] hidden sm:inline">Comercio Activo:</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-[#faf8f5] border border-[#e8e1d5] hover:border-[#c49340] text-xs font-extrabold rounded-2xl px-3 py-1.5 focus:outline-none text-[#232d2a] flex items-center gap-2 transition-all cursor-pointer min-w-[170px] justify-between shadow-xs"
                >
                  <span className="truncate">
                    {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando...'}
                  </span>
                  <span className="text-[10px] text-[#9c9384] shrink-0">
                    {isDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/* Dropdown panel */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-3 flex flex-col z-50 transition-all">
                    <input
                      type="text"
                      placeholder="Buscar comercio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors"
                      autoFocus
                    />
                    
                    <div className="mt-2.5 space-y-1 max-h-[200px] overflow-y-auto pr-1">
                      {filteredBusinesses.length === 0 ? (
                        <p className="text-[11px] text-[#9c9384] text-center py-4">No se encontraron comercios.</p>
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
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              b.id === selectedBusinessId
                                ? 'bg-[#153e35] text-white'
                                : 'text-[#333d39] hover:bg-[#faf8f5]'
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
                className="w-9 h-9 rounded-xl bg-[#faf8f5] border border-[#e8e1d5] hover:border-[#153e35] flex items-center justify-center text-[#232d2a] cursor-pointer transition-all shadow-xs"
                title="Menú de Acciones"
              >
                <span className="text-base">⚙️</span>
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-2 flex flex-col z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-[#e8e1d5] mb-1">
                    <p className="text-xs font-bold text-[#232d2a]">Administrador</p>
                    <p className="text-[10px] text-[#6b7773] font-medium">admin@feebli.com</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Información del Comercio');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#333d39] hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>💼</span> Información del Comercio
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Ajustes de Cuenta');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#333d39] hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>⚙️</span> Ajustes de Cuenta
                  </button>

                  <div className="h-px bg-[#e8e1d5] my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Cerrando sesión (Simulado)...');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-[#9b1c1c] hover:bg-[#fdf2f2] transition-all cursor-pointer flex items-center gap-2"
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#153e35]">Panel de Administración</span>
            <h2 className="text-2xl font-black text-[#232d2a] flex items-center gap-2 mt-1">
              💼 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-[#6b7773] mt-1 font-medium">
              Auditoría de comentarios por Inteligencia Artificial y validación de canje de sellos.
            </p>
          </div>

          <button
            onClick={refreshMerchantDashboard}
            disabled={isLoading}
            className="self-start md:self-auto px-4.5 py-2.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 disabled:bg-[#e8dfce] text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#153e35]/15"
          >
            {isLoading ? 'Actualizando...' : '🔄 Actualizar Panel'}
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column: Active Campaign & Code Generation */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Campaign Specs card */}
            <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
              <h3 className="text-sm font-bold text-[#232d2a] border-b border-[#e8e1d5] pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 font-extrabold">📢 Campaña de Fidelidad Activa</span>
                <span className="text-[10px] bg-[#f0f7f4] text-[#153e35] font-extrabold border border-[#b2dbcd] px-2.5 py-0.5 rounded-full">Activa</span>
              </h3>

              {campaignStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Campaign Information */}
                  <div className="space-y-4 pr-0 md:pr-4 md:border-r md:border-[#e8e1d5]">
                    <div>
                      <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Título de Campaña:</p>
                      <p className="text-base font-extrabold text-[#232d2a] mt-0.5">{campaignStats.title}</p>
                    </div>
                    {campaignStats.description && (
                      <div>
                        <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Descripción:</p>
                        <p className="text-xs text-[#333d39] mt-0.5 leading-relaxed font-medium">{campaignStats.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-[#e8e1d5]">
                      <div>
                        <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Meta de Puntos:</p>
                        <p className="text-sm font-black text-[#c49340] mt-0.5">{campaignStats.target} Puntos</p>
                        <p className="text-[9px] text-[#6b7773] font-semibold mt-0.5">(Tasa: {campaignStats.points_per_value_unit} pts/$)</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Expiración:</p>
                        <p className="text-xs text-[#232d2a] font-semibold mt-1">{campaignStats.expires}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#e8e1d5]">
                      <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Premio a entregar:</p>
                      <p className="text-xs font-extrabold text-[#8c6b2d] mt-1.5 bg-[#f7f3eb] border border-[#e2d5bd] rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                        🎁 {campaignStats.prize}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Code Generator Form */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider mb-2">⚡ Generar Código de Compra:</p>
                      <p className="text-xs text-[#6b7773] leading-relaxed mb-4 font-medium">
                        Ingrese el monto de la compra para calcular los puntos correspondientes y generar el código de un solo uso para el cliente.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Monto de Compra ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          disabled={isGenerating}
                          className="bg-[#faf8f5] border border-[#e2d8c7] focus:bg-white focus:border-[#153e35] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:outline-none transition-all w-full font-medium"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Número de Factura</label>
                        <input
                          type="text"
                          placeholder="Ej: FACT-1004 (Opcional)"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          disabled={isGenerating}
                          className="bg-[#faf8f5] border border-[#e2d8c7] focus:bg-white focus:border-[#153e35] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:outline-none transition-all w-full font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#e8e1d5]">
                      <button
                        type="button"
                        onClick={() => handleGenerateCode(campaignStats.id)}
                        disabled={isGenerating}
                        className="flex-1 py-3 bg-[#153e35] hover:bg-[#0f2e27] rounded-2xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#153e35]/15 active:scale-95"
                      >
                        {isGenerating ? 'Generando...' : '⚡ Generar Código'}
                      </button>
                      <Link
                        href={`/campaigns?edit=${campaignStats.id}`}
                        className="py-3 px-4 bg-[#faf8f5] hover:bg-[#f2ece1] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                      >
                        ✏️ Editar Campaña
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#faf8f5] flex items-center justify-center text-[#6b7773] text-lg border border-[#e8e1d5]">
                    📢
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#232d2a]">No hay campañas de fidelidad configuradas</p>
                    <p className="text-xs text-[#6b7773] max-w-sm mx-auto leading-relaxed">
                      Necesitas crear una campaña activa para este comercio para poder generar códigos de compra.
                    </p>
                  </div>
                  <Link
                    href="/campaigns"
                    className="mt-2 px-4 py-2.5 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    ➕ Crear Nueva Campaña
                  </Link>
                </div>
              )}
            </div>

            {/* Recent codes list card */}
            {generatedCodes.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
                <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-[#232d2a] flex items-center gap-1.5">
                    <span>🎫 Últimos Códigos Generados</span>
                  </h3>
                  <Link
                    href="/codes"
                    className="text-[10px] bg-[#faf8f5] hover:bg-[#f2ece1] text-[#232d2a] px-3 py-1 rounded-xl border border-[#e8e1d5] font-extrabold transition-all cursor-pointer"
                  >
                    Ver Todos los Códigos
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {generatedCodes.slice(0, 6).map((c, idx) => {
                    const status = getCodeStatus(c);
                    return (
                      <div key={idx} className="relative bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e1d5] hover:border-[#c49340] transition-all flex flex-col gap-3 justify-between shadow-xs group">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-[#153e35] tracking-wider text-sm select-all">{c.code}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="space-y-1 border-t border-[#e8e1d5] pt-2 text-[10px]">
                          {c.campaign && (
                            <div className="text-[#6b7773] truncate flex items-center gap-1 font-semibold">
                              <span className="opacity-60">📢</span> <span className="truncate">{c.campaign.title}</span>
                            </div>
                          )}
                          <div className="text-[#6b7773] flex justify-between">
                            <span>Monto: <strong className="text-[#232d2a]">${c.purchase_amount?.toFixed(2) || '0.00'}</strong></span>
                            {c.invoice_number && <span>Factura: <strong className="text-[#232d2a]">{c.invoice_number}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#e8e1d5] pt-2 mt-1">
                          <span className="text-[9px] text-[#9c9384] font-medium">
                            {new Date(c.created_at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(c.code);
                              showToast('¡Código copiado!');
                            }}
                            className="text-[9px] text-[#153e35] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
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

          {/* Side Column: Redemption Terminal & AI Audit Logs */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Redemption Terminal Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs">
              <h3 className="text-sm font-extrabold text-[#232d2a] border-b border-[#e8e1d5] pb-3 mb-4 flex items-center gap-1.5">
                <span>🎯 Terminal de Canjeo (Caja)</span>
              </h3>
              
              <p className="text-xs text-[#6b7773] mb-4 leading-relaxed font-medium">
                Ingrese el celular del cliente para verificar y redimir su tarjeta de sellos digital.
              </p>

              <form onSubmit={handleMerchantLookup} className="space-y-3 mb-4">
                <div className="flex flex-col">
                  <PhoneInputField
                    value={merchantPhoneLookup}
                    onChange={setMerchantPhoneLookup}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-sm text-[#232d2a] focus:outline-none focus:border-[#153e35] transition-colors w-full"
                  />
                  {lookupError && (
                    <span className="text-[10px] text-[#9b1c1c] mt-1 font-semibold">⚠️ {lookupError}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  Verificar Puntos
                </button>
              </form>

              {/* Lookup results */}
              {lookupResult && (
                <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e1d5] space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-[#6b7773] font-bold">Celular Cliente:</p>
                      <p className="text-xs font-extrabold text-[#232d2a]">
                        {lookupResult.customer_phone.startsWith('+505') && lookupResult.customer_phone.length === 12
                          ? `+505 ${lookupResult.customer_phone.slice(4, 8)}-${lookupResult.customer_phone.slice(8)}`
                          : lookupResult.customer_phone}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      lookupResult.current_points >= lookupResult.target_points 
                        ? 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' 
                        : 'bg-[#f7f3eb] text-[#8c6b2d] border-[#e2d5bd]'
                    }`}>
                      {lookupResult.current_points} / {lookupResult.target_points} pts
                    </span>
                  </div>

                  {/* Progress bar matching reference image */}
                  <div className="w-full h-2.5 bg-[#e8dfce] rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-[#c49340] rounded-full"
                      style={{ width: `${Math.min((lookupResult.current_points / lookupResult.target_points) * 100, 100)}%` }}
                    ></div>
                  </div>

                  {lookupResult.current_points >= lookupResult.target_points ? (
                    <form onSubmit={handleRedeemPrize} className="space-y-3 pt-1">
                      <p className="text-[11px] text-[#153e35] font-extrabold">
                        ✓ Meta Alcanzada. ¡Elegible para redención!
                      </p>
                      
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">
                          PIN de Seguridad *
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Ingrese PIN (4932)"
                          value={redeemPinInput}
                          onChange={(e) => setRedeemPinInput(e.target.value.replace(/\D/g, ''))}
                          required
                          className="bg-white border border-[#e2d8c7] focus:border-[#153e35] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:outline-none transition-all w-full font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-[#c49340] hover:bg-[#b08132] text-white rounded-2xl text-xs font-extrabold shadow-md cursor-pointer active:scale-95 transition-all"
                      >
                        🎁 Redimir Premio y Limpiar Puntos
                      </button>
                    </form>
                  ) : (
                    <p className="text-[10px] text-[#6b7773] pt-1 text-center font-medium">
                      No califica. Requiere {lookupResult.target_points - lookupResult.current_points} puntos más.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Audit Log Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col">
              <div className="border-b border-[#e8e1d5] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#232d2a] flex items-center gap-1.5">
                    <span>🔍 Registro & Auditoría AI</span>
                  </h3>
                  <p className="text-[10px] text-[#6b7773] mt-0.5">Comentarios validados por IA.</p>
                </div>
                
                <span className="text-[9px] font-extrabold text-[#232d2a] bg-[#faf8f5] px-2 py-0.5 rounded-full border border-[#e8e1d5]">
                  Total: {recentInteractions.length}
                </span>
              </div>

              {/* List Container */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {recentInteractions.length === 0 ? (
                  <div className="text-center py-12 text-[#9c9384] text-xs">
                    No se registran interacciones.
                  </div>
                ) : (
                  recentInteractions.map((inter) => {
                    const isSpam = inter.status === 'spam_hidden';
                    const showSpamContent = unblurredInteractions[inter.id];

                    return (
                      <div 
                        key={inter.id}
                        className={`p-3.5 rounded-2xl border transition-all text-xs ${
                          isSpam
                            ? 'bg-[#fdf2f2] border-[#f5c6c6]'
                            : 'bg-[#faf8f5] border-[#e8e1d5]'
                        }`}
                      >
                        <div className="flex flex-col gap-2 mb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-[#232d2a]">
                              📞 {inter.customer_phone.startsWith('+505') && inter.customer_phone.length === 12
                                ? `+505 ${inter.customer_phone.slice(4, 8)}-${inter.customer_phone.slice(8)}`
                                : inter.customer_phone}
                            </span>
                            
                            {/* Status badge */}
                            {inter.status === 'spam_hidden' && (
                              <span className="text-[8px] bg-[#9b1c1c] text-white font-black px-2 py-0.5 rounded-full animate-pulse">
                                🚫 SPAM
                              </span>
                            )}
                            {inter.status === 'redimidos' && (
                              <span className="text-[8px] bg-[#f0f7f4] text-[#153e35] font-extrabold px-2 py-0.5 rounded-full border border-[#b2dbcd]">
                                🎁 REDIMIDO
                              </span>
                            )}
                            {inter.status === 'accumulated' && (
                              <span className="text-[8px] bg-[#f7f3eb] text-[#8c6b2d] font-extrabold px-2 py-0.5 rounded-full border border-[#e2d5bd]">
                                ★ ACUMULADO
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {inter.invoice_number ? (
                              <span className="text-[8px] bg-white text-[#333d39] border border-[#e8e1d5] px-2 py-0.5 rounded-md font-semibold">
                                Factura: {inter.invoice_number}
                              </span>
                            ) : (
                              <span className="text-[8px] bg-[#fef8ed] text-[#8c5e14] border border-[#e6d1a8] px-2 py-0.5 rounded-md font-semibold">
                                Sin Compra
                              </span>
                            )}

                            {/* Category badge */}
                            {inter.ai_category && (
                              <span className="text-[8px] bg-white text-[#333d39] border border-[#e8e1d5] px-2 py-0.5 rounded-md uppercase font-semibold">
                                📁 {inter.ai_category}
                              </span>
                            )}

                            {/* Sentiment badge */}
                            {inter.ai_sentiment && (
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                inter.ai_sentiment === 'positive' 
                                  ? 'bg-[#f0f7f4] text-[#153e35] border border-[#b2dbcd]' 
                                  : inter.ai_sentiment === 'negative' 
                                  ? 'bg-[#fdf2f2] text-[#9b1c1c] border border-[#f5c6c6]' 
                                  : 'bg-[#faf8f5] text-[#6b7773] border border-[#e8e1d5]'
                              }`}>
                                {inter.ai_sentiment === 'positive' ? '🟢 POS' : inter.ai_sentiment === 'negative' ? '🔴 NEG' : '⚪ NEU'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Feedback Text Area */}
                        <div className="relative mt-1">
                          <p className={`leading-relaxed transition-all duration-300 text-[11px] ${
                            isSpam && !showSpamContent 
                              ? 'blur-sm select-none opacity-40 text-[#9c9384]' 
                              : 'text-[#333d39] font-medium'
                          }`}>
                            {inter.feedback_text}
                          </p>

                          {/* Blur Reveal Banner */}
                          {isSpam && !showSpamContent && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white border border-[#f5c6c6] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-md">
                                <span className="text-[9px] text-[#9b1c1c] font-bold">Spam AI</span>
                                <button 
                                  onClick={() => setUnblurredInteractions(prev => ({ ...prev, [inter.id]: true }))}
                                  className="text-[8px] bg-[#9b1c1c] text-white px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
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
                                className="text-[9px] text-[#6b7773] hover:text-[#232d2a] font-bold cursor-pointer"
                              >
                                Ocultar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="mt-2 text-[8px] text-[#9c9384] font-semibold text-right">
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

      <footer className="border-t border-[#e8e1d5] bg-white py-6 text-center text-xs text-[#6b7773] font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
      </footer>

      {/* Code Modal */}
      {showCodeModal && modalCode && (
        <div className="fixed inset-0 bg-[#153e35]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#e8e1d5] rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#153e35] flex items-center justify-center text-white text-xl shadow-md shadow-[#153e35]/15">
              ✨
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#232d2a]">¡Código Generado!</h3>
              <p className="text-xs text-[#6b7773]">Entrega este código de un solo uso al cliente para que acumule sellos.</p>
            </div>
            
            <div className="w-full bg-[#faf8f5] border border-[#e8e1d5] py-4 px-2 rounded-2xl flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider">Código de Compra:</span>
              <span className="text-2xl font-black text-[#153e35] select-all tracking-widest font-mono">
                {modalCode}
              </span>
              <span className="text-[9px] text-[#9c9384]">Válido por 24 horas</span>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(modalCode);
                  showToast('¡Código copiado al portapapeles!');
                }}
                className="flex-1 py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold shadow-md cursor-pointer transition-all"
              >
                📋 Copiar Código
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
                  setModalCode(null);
                }}
                className="px-4 py-3 bg-[#faf8f5] hover:bg-[#f2ece1] active:scale-95 text-[#232d2a] rounded-2xl text-xs font-extrabold cursor-pointer transition-all border border-[#e8e1d5]"
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
