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
  target_stamps: number;
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
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedBusinessId || !selectedCampaignId) {
      showToast('Por favor seleccione una campaña.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo generar el código.');
      }
      const data = await response.json();
      showToast(`Código ${data.code} generado correctamente.`);
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
    const currentTime = new Date(mockDate).getTime(); // Target context time
    const diffHrs = (currentTime - createdTime) / (1000 * 60 * 60);
    if (diffHrs > 24) {
      return 'expired';
    }
    return 'active';
  };

  const getStatusBadge = (status: 'active' | 'used' | 'expired' | 'deactivated' | 'redeemed') => {
    switch (status) {
      case 'deactivated':
        return { text: 'Desactivado', color: 'bg-slate-900 text-slate-500 border-slate-800' };
      case 'redeemed':
        return { text: 'Redimido', color: 'bg-emerald-950/40 text-emerald-300 border-emerald-900/40' };
      case 'used':
        return { text: 'Asociado', color: 'bg-indigo-950/40 text-indigo-300 border-indigo-900/40' };
      case 'expired':
        return { text: 'Expirado', color: 'bg-rose-955 text-rose-455 border-rose-900/50' };
      case 'active':
      default:
        return { text: 'Activo', color: 'bg-teal-950 text-teal-300 border-teal-900' };
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
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
            : 'bg-rose-955 border-rose-500 text-rose-300'
        }`}>
          <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
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
                <p className="text-[10px] text-slate-550 font-medium">B2B Merchant Portal</p>
              </div>
            </div>
            
            {/* Menu Buttons under logo */}
            <nav className="flex items-center gap-1.5">
              <Link
                href="/"
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-slate-800 text-slate-350 border-slate-700 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
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
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40 transition-all cursor-pointer flex items-center gap-1"
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
                  id="active-business-btn"
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 flex items-center gap-2 transition-all cursor-pointer min-w-[170px] justify-between shadow-md"
                >
                  <span className="truncate">
                    {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando...'}
                  </span>
                  <span className="text-[10px] text-slate-550 shrink-0">
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
                              setIsDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              b.id === selectedBusinessId
                                ? 'bg-indigo-650 text-white'
                                : 'text-slate-350 hover:bg-slate-955 hover:text-white'
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
                    <p className="text-[10px] text-slate-550 font-medium">admin@feebli.com</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Información del Comercio');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-955 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>💼</span> Información del Comercio
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Ajustes de Cuenta');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-955 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>⚙️</span> Ajustes de Cuenta
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Reportes de Sellos');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-955 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>📊</span> Reportes de Sellos
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Acción no implementada: Soporte Técnico');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:bg-slate-955 hover:text-white transition-all cursor-pointer flex items-center gap-2"
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
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Panel de Códigos</span>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mt-1">
              🎫 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Administración y auditoría de códigos de compra de un solo uso para clientes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Campaña Asociada</label>
              <select
                id="campaign-select"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={isGenerating || isLoading || campaigns.length === 0}
                className="bg-slate-850 border border-slate-800 hover:border-slate-750 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer min-w-[200px]"
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
            
            <button
              id="generate-code-btn"
              onClick={handleGenerateCode}
              disabled={isGenerating || isLoading || campaigns.length === 0 || !selectedCampaignId}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-950/50 border border-indigo-500/20 h-[42px] mt-auto"
            >
              {isGenerating ? 'Generando...' : '⚡ Generar Código'}
            </button>
          </div>
        </div>

        {/* Filters and Table Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md min-h-[500px] flex flex-col">
          
          <div className="border-b border-slate-850 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-300">📋 Códigos Generados</h3>
              <p className="text-xs text-slate-555">Lista de códigos con su estado de validez actual.</p>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-850 gap-0.5">
              <button
                id="filter-all-btn"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-indigo-650 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                id="filter-active-btn"
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'active' ? 'bg-teal-950 text-teal-300 border border-teal-900/60 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Activos
              </button>
              <button
                id="filter-used-btn"
                onClick={() => setFilter('used')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'used' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/60 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Asociados
              </button>
              <button
                id="filter-redeemed-btn"
                onClick={() => setFilter('redeemed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'redeemed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-900/60 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Redimidos
              </button>
              <button
                id="filter-expired-btn"
                onClick={() => setFilter('expired')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'expired' ? 'bg-rose-955 text-rose-300 border border-rose-900/60 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Expirados
              </button>
              <button
                id="filter-deactivated-btn"
                onClick={() => setFilter('deactivated')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === 'deactivated' ? 'bg-slate-800 text-slate-300 border border-slate-700 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Desactivados
              </button>
            </div>
          </div>

          {/* Loader or Table */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 py-12">
              Cargando códigos de compra...
            </div>
          ) : displayedCodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-12 text-slate-600 text-xs">
              No se encontraron códigos bajo este estado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Fecha Generación</th>
                    <th className="py-3 px-4">Campaña</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Cliente Asociado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {displayedCodes.map((c) => {
                    const status = getCodeStatus(c);
                    const badge = getStatusBadge(status);
                    const isDeactivatable = status === 'active';

                    return (
                      <tr key={c.code} className="hover:bg-slate-950/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-indigo-400 tracking-wider text-sm select-all">
                              {c.code}
                            </span>
                            <button
                              id={`copy-btn-${c.code}`}
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(c.code);
                                showToast(`¡Código ${c.code} copiado!`);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded transition-all cursor-pointer"
                              title="Copiar Código"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-350">
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
                          {c.updated_at && c.updated_at !== c.created_at && (
                            <div className="text-[10px] text-slate-550 mt-0.5">
                              ✏️ Modif: {new Date(c.updated_at).toLocaleString('es-NI', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.campaign ? (
                            <div className="flex flex-col gap-0.5 max-w-[180px]">
                              <span className="font-bold text-slate-200 truncate" title={c.campaign.title}>
                                📢 {c.campaign.title}
                              </span>
                              <span className={`text-[9px] font-semibold ${c.campaign.status === 'active' ? 'text-emerald-455' : 'text-slate-500'}`}>
                                {c.campaign.status === 'active' ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-650">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${badge.color}`}>
                            {badge.text}
                          </span>
                          {c.is_redeemed && c.redeemed_at && (
                            <div className="text-[9px] font-sans font-semibold text-slate-500 mt-1">
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
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-350">
                          {c.customer_phone ? (
                            <div className="flex flex-col gap-0.5">
                              <span>
                                {c.customer_phone.startsWith('+505') && c.customer_phone.length === 12
                                  ? `+505 ${c.customer_phone.slice(4, 8)}-${c.customer_phone.slice(8)}`
                                  : c.customer_phone}
                              </span>
                              {c.associated_at && (
                                <span className="text-[9px] font-sans font-semibold text-slate-500">
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
                            <span className="text-slate-650">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            id={`deactivate-btn-${c.code}`}
                            type="button"
                            onClick={() => handleDeactivateCode(c.code)}
                            disabled={!isDeactivatable || deactivatingCode === c.code}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              isDeactivatable
                                ? 'bg-rose-955 hover:bg-rose-950 border-rose-900/50 text-rose-455 hover:text-rose-350'
                                : 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed'
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
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-650 font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
        <p className="mt-1 text-[10px] text-slate-800">Entorno local • Base temporal: 14 de Junio, 2026</p>
      </footer>
    </div>
  );
}
