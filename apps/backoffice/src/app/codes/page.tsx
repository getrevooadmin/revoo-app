"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
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

interface OneTimeCode {
  code: string;
  business_id: string;
  campaign_id: string | null;
  is_associated: boolean;
  is_active: boolean;
  is_redeemed: boolean;
  customer_phone: string | null;
  associated_at: string | null;
  redeemed_at: string | null;
  purchase_amount: number;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  campaign?: {
    title: string;
    status: 'active' | 'inactive';
  } | null;
}

export default function CodesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [codes, setCodes] = useState<OneTimeCode[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [mockDate, setMockDate] = useState<string>('2026-06-14T15:41:53-06:00');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired' | 'deactivated' | 'redeemed'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deactivatingCode, setDeactivatingCode] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<string>('10.00');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Searchable Business Dropdown states
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
      .catch(err => {
        console.error('Error fetching businesses:', err);
        showToast('Error de conexión al cargar comercios.', 'error');
      });
  }, []);

  // Fetch codes and campaigns when selected business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    localStorage.setItem('selectedBusinessId', selectedBusinessId);
    fetchCodes();
    fetchCampaigns();
  }, [selectedBusinessId]);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/codes`);
      if (res.ok) {
        const data = await res.json();
        setCodes(Array.isArray(data) ? data : []);
      } else {
        showToast('Error al cargar la lista de códigos.', 'error');
      }
    } catch (err) {
      console.error('Error fetching codes:', err);
      showToast('Error de red al cargar los códigos.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`);
      if (res.ok) {
        const data = await res.json();
        const campaignList = Array.isArray(data) ? data : [];
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
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedBusinessId || !selectedCampaignId) {
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
          campaignId: selectedCampaignId,
          purchaseAmount: amountVal,
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo generar el código.');
      }
      const data = await response.json();
      showToast(`Código ${data.code} generado correctamente.`);
      setInvoiceNumber('');
      fetchCodes();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeactivateCode = async (code: string) => {
    if (!selectedBusinessId) return;
    if (!confirm(`¿Está seguro de que desea desactivar el código ${code}? No podrá ser utilizado por ningún cliente.`)) return;
    
    setDeactivatingCode(code);
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes/${code}/deactivate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo desactivar el código.');
      }
      showToast(data.message || 'Código desactivado correctamente.');
      fetchCodes();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeactivatingCode(null);
    }
  };

  const getCodeStatus = (code: OneTimeCode): 'active' | 'used' | 'expired' | 'deactivated' | 'redeemed' => {
    if (!code.is_active) return 'deactivated';
    if (code.is_redeemed) return 'redeemed';
    if (code.is_associated) return 'used';
    
    const createdTime = new Date(code.created_at).getTime();
    const currentTime = new Date(mockDate).getTime();
    const diffHrs = (currentTime - createdTime) / (1000 * 60 * 60);
    if (diffHrs > 24) {
      return 'expired';
    }
    return 'active';
  };

  const getStatusBadge = (status: 'active' | 'used' | 'expired' | 'deactivated' | 'redeemed') => {
    switch (status) {
      case 'deactivated':
        return { text: 'Desactivado', color: 'bg-[#faf8f5] text-[#9c9384] border-[#e8e1d5]' };
      case 'redeemed':
        return { text: 'Redimido', color: 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' };
      case 'used':
        return { text: 'Asociado', color: 'bg-[#f7f3eb] text-[#8c6b2d] border-[#e2d5bd]' };
      case 'expired':
        return { text: 'Expirado', color: 'bg-[#fdf2f2] text-[#9b1c1c] border-[#f5c6c6]' };
      case 'active':
      default:
        return { text: 'Activo', color: 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' };
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedCodes = codes.filter(c => {
    const status = getCodeStatus(c);
    if (filter === 'all') return true;
    return status === filter;
  });

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
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1"
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
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#153e35] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
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
                  id="active-business-btn"
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
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#153e35]">Panel de Códigos</span>
            <h2 className="text-2xl font-black text-[#232d2a] flex items-center gap-2 mt-1">
              🎫 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-[#6b7773] mt-1 font-medium">
              Administración y auditoría de códigos de compra de un solo uso para clientes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Campaña Asociada</label>
              <select
                id="campaign-select"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={isGenerating || isLoading || campaigns.length === 0}
                className="bg-[#faf8f5] border border-[#e2d8c7] hover:border-[#153e35] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none text-[#232d2a] transition-all cursor-pointer min-w-[200px]"
              >
                {campaigns.length === 0 ? (
                  <option value="">No hay campañas creadas</option>
                ) : (
                  campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                      {camp.title} ({camp.status === 'active' ? 'Activa' : 'Inactiva'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Monto Compra ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                disabled={isGenerating || isLoading || campaigns.length === 0}
                className="bg-[#faf8f5] border border-[#e2d8c7] hover:border-[#153e35] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none text-[#232d2a] transition-all cursor-pointer w-[120px] max-w-full font-medium"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Número de Factura</label>
              <input
                type="text"
                placeholder="Ej: FACT-1004 (Opcional)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={isGenerating || isLoading || campaigns.length === 0}
                className="bg-[#faf8f5] border border-[#e2d8c7] hover:border-[#153e35] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none text-[#232d2a] transition-all cursor-pointer w-[180px] max-w-full font-mono"
              />
            </div>
            
            <button
              id="generate-code-btn"
              onClick={handleGenerateCode}
              disabled={isGenerating || isLoading || campaigns.length === 0 || !selectedCampaignId}
              className="px-5 py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 disabled:bg-[#e8dfce] disabled:text-[#9c9384] text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#153e35]/15 h-[42px] mt-auto"
            >
              {isGenerating ? 'Generando...' : '⚡ Generar Código'}
            </button>
          </div>
        </div>

        {/* Filters and Table Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs min-h-[500px] flex flex-col">
          
          <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#232d2a]">📋 Códigos Generados</h3>
              <p className="text-xs text-[#6b7773] font-medium">Lista de códigos con su estado de validez actual.</p>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center bg-[#faf8f5] p-1 rounded-2xl border border-[#e8e1d5] gap-0.5">
              <button
                id="filter-all-btn"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-[#153e35] text-white shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Todos
              </button>
              <button
                id="filter-active-btn"
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'active' ? 'bg-[#f0f7f4] text-[#153e35] border border-[#b2dbcd] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Activos
              </button>
              <button
                id="filter-used-btn"
                onClick={() => setFilter('used')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'used' ? 'bg-[#f7f3eb] text-[#8c6b2d] border border-[#e2d5bd] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Asociados
              </button>
              <button
                id="filter-redeemed-btn"
                onClick={() => setFilter('redeemed')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'redeemed' ? 'bg-[#f0f7f4] text-[#153e35] border border-[#b2dbcd] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Redimidos
              </button>
              <button
                id="filter-expired-btn"
                onClick={() => setFilter('expired')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'expired' ? 'bg-[#fdf2f2] text-[#9b1c1c] border border-[#f5c6c6] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Expirados
              </button>
              <button
                id="filter-deactivated-btn"
                onClick={() => setFilter('deactivated')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  filter === 'deactivated' ? 'bg-[#f2ece1] text-[#232d2a] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                }`}
              >
                Desactivados
              </button>
            </div>
          </div>

          {/* Loader or Table */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#9c9384] py-12">
              Cargando códigos de compra...
            </div>
          ) : displayedCodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-12 text-[#9c9384] text-xs font-medium">
              No se encontraron códigos bajo este estado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e8e1d5] text-[10px] font-bold text-[#6b7773] uppercase tracking-widest bg-[#faf8f5]">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Factura</th>
                    <th className="py-3.5 px-4">Fecha Generación</th>
                    <th className="py-3.5 px-4">Campaña</th>
                    <th className="py-3.5 px-4">Monto Compra</th>
                    <th className="py-3.5 px-4">Puntos</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Cliente Asociado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e1d5] text-xs text-[#232d2a]">
                  {displayedCodes.map((c) => {
                    const status = getCodeStatus(c);
                    const badge = getStatusBadge(status);
                    const isDeactivatable = status === 'active';

                    return (
                      <tr key={c.code} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#153e35] tracking-wider text-sm select-all">
                              {c.code}
                            </span>
                            <button
                              id={`copy-btn-${c.code}`}
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(c.code);
                                showToast(`¡Código ${c.code} copiado!`);
                              }}
                              className="p-1 hover:bg-[#f2ece1] text-[#9c9384] hover:text-[#232d2a] rounded-lg transition-all cursor-pointer"
                              title="Copiar Código"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#333d39]">
                          {c.invoice_number || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#6b7773]">
                          <div>
                            {new Date(c.created_at).toLocaleString('es-NI', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.campaign ? (
                            <div className="flex flex-col gap-0.5 max-w-[180px]">
                              <span className="font-extrabold text-[#232d2a] truncate" title={c.campaign.title}>
                                📢 {c.campaign.title}
                              </span>
                              <span className={`text-[9px] font-semibold ${c.campaign.status === 'active' ? 'text-[#153e35]' : 'text-[#9c9384]'}`}>
                                {c.campaign.status === 'active' ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#9c9384]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-black text-[#232d2a]">
                          {c.purchase_amount !== undefined ? `$${Number(c.purchase_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.purchase_amount !== undefined && c.campaign_id ? (
                            <span className="font-extrabold text-[#c49340]">
                              {Math.round(c.purchase_amount * (campaigns.find(camp => camp.id === c.campaign_id)?.points_per_value_unit || 10))} Pts
                            </span>
                          ) : c.purchase_amount !== undefined ? (
                            <span className="font-extrabold text-[#c49340]">
                              {Math.round(c.purchase_amount * 10)} Pts
                            </span>
                          ) : (
                            <span className="text-[#9c9384]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border inline-block ${badge.color}`}>
                            {badge.text}
                          </span>
                          {c.is_redeemed && c.redeemed_at && (
                            <div className="text-[9px] font-semibold text-[#6b7773] mt-1">
                              🎉 Redimido: {new Date(c.redeemed_at).toLocaleString('es-NI', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#333d39]">
                          {c.customer_phone ? (
                            <div className="flex flex-col gap-0.5">
                              <span>
                                {c.customer_phone.startsWith('+505') && c.customer_phone.length === 12
                                  ? `+505 ${c.customer_phone.slice(4, 8)}-${c.customer_phone.slice(8)}`
                                  : c.customer_phone}
                              </span>
                              {c.associated_at && (
                                <span className="text-[9px] font-sans font-semibold text-[#9c9384]">
                                  🔗 Asociado: {new Date(c.associated_at).toLocaleString('es-NI', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#9c9384]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            id={`deactivate-btn-${c.code}`}
                            type="button"
                            onClick={() => handleDeactivateCode(c.code)}
                            disabled={!isDeactivatable || deactivatingCode === c.code}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              isDeactivatable
                                ? 'bg-[#fdf2f2] hover:bg-[#f5c6c6] border-[#f5c6c6] text-[#9b1c1c]'
                                : 'bg-[#faf8f5] border-[#e8e1d5] text-[#9c9384] cursor-not-allowed'
                            }`}
                          >
                            {deactivatingCode === c.code ? 'Desactivando...' : 'Desactivar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e1d5] bg-white py-6 text-center text-xs text-[#6b7773] font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
      </footer>
    </div>
  );
}
