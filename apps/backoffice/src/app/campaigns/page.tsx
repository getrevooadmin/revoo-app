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

export default function CampaignsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formPrize, setFormPrize] = useState('');
  const [formStamps, setFormStamps] = useState(6);
  const [formExpiration, setFormExpiration] = useState('2026-07-31T23:59');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [showFormMobile, setShowFormMobile] = useState(false);

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

  // Fetch businesses on load
  useEffect(() => {
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

  // Fetch campaigns when selected business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    localStorage.setItem('selectedBusinessId', selectedBusinessId);
    fetchCampaigns();
    resetForm();
  }, [selectedBusinessId]);

  // Auto-edit campaign if edit param is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && campaigns.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('edit');
      if (editId) {
        const match = campaigns.find(c => c.id === editId);
        if (match) {
          handleEditClick(match);
        }
      }
    }
  }, [campaigns]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      showToast('Error al cargar las campañas.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingCampaignId(null);
    setFormTitle('');
    setFormPrize('');
    setFormStamps(6);
    // Set expiration to end of next month
    setFormExpiration('2026-07-31T23:59');
    setFormDescription('');
    setFormStatus('active');
    setShowFormMobile(false);
  };

  const handleEditClick = (campaign: LoyaltyCampaign) => {
    setIsEditing(true);
    setEditingCampaignId(campaign.id);
    setFormTitle(campaign.title || '');
    setFormPrize(campaign.prize_description || '');
    setFormStamps(campaign.target_stamps || 6);
    // Convert ISO string to datetime-local value (YYYY-MM-DDTHH:MM)
    if (campaign.end_date) {
      const date = new Date(campaign.end_date);
      // Adjust timezone offset to local time format YYYY-MM-DDTHH:MM
      const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormExpiration(localISO);
    }
    setFormDescription(campaign.description || '');
    setFormStatus(campaign.status || 'active');
    setShowFormMobile(true);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta campaña?')) return;
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns/${campaignId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Campaña eliminada correctamente.');
        fetchCampaigns();
        if (editingCampaignId === campaignId) {
          resetForm();
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'No se pudo eliminar la campaña.', 'error');
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
      showToast('Error de red al eliminar campaña.', 'error');
    }
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        showToast(`Campaña ${newStatus === 'active' ? 'activada' : 'desactivada'} correctamente.`);
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error al cambiar el estado de la campaña.', 'error');
      }
    } catch (err) {
      console.error('Error toggling campaign status:', err);
      showToast('Error de red al actualizar la campaña.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrize.trim()) {
      showToast('Por favor, rellene todos los campos obligatorios.', 'error');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      prize_description: formPrize.trim(),
      target_stamps: formStamps,
      description: formDescription.trim(),
      status: formStatus,
      // Campaign start date defaults to now, expiration dates to chosen end date
      start_date: new Date('2026-06-14T15:41:53-06:00').toISOString(),
      end_date: new Date(formExpiration).toISOString()
    };

    try {
      let res;
      if (isEditing && editingCampaignId) {
        res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns/${editingCampaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(isEditing ? 'Campaña actualizada con éxito.' : 'Campaña creada con éxito.');
        fetchCampaigns();
        resetForm();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al guardar la campaña.', 'error');
      }
    } catch (err) {
      console.error('Error saving campaign:', err);
      showToast('Error de conexión al guardar la campaña.', 'error');
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedCampaigns = campaigns.filter(c => {
    if (filter === 'active') return c.status === 'active';
    if (filter === 'inactive') return c.status === 'inactive';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col antialiased">
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
                <p className="text-[10px] text-slate-500 font-medium">B2B Merchant Portal</p>
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
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40 transition-all cursor-pointer flex items-center gap-1"
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
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Administración de Campañas</span>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mt-1">
              📢 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Crea, edita y gestiona las campañas de fidelización y metas de sellos del comercio.
            </p>
          </div>
        </div>

        {/* Toggle Form Button on Mobile */}
        <div className="lg:hidden flex justify-end">
          <button
            type="button"
            onClick={() => setShowFormMobile(!showFormMobile)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {showFormMobile 
              ? '🙈 Ocultar Formulario' 
              : isEditing 
                ? '✏️ Mostrar Formulario de Edición' 
                : '➕ Crear Campaña'
            }
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left/Middle Column (2/3): Campaigns List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col min-h-[500px]">
              
              <div className="border-b border-slate-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-300">📋 Historial de Campañas</h3>
                  <p className="text-xs text-slate-500">Historial completo de ofertas de fidelización.</p>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-850">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      filter === 'all' ? 'bg-indigo-650 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      filter === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-900/60 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Activas
                  </button>
                  <button
                    onClick={() => setFilter('inactive')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      filter === 'inactive' ? 'bg-slate-900 text-slate-300 border border-slate-800 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inactivas
                  </button>
                </div>
              </div>

              {/* Loader */}
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500 py-12">
                  Cargando campañas...
                </div>
              ) : displayedCampaigns.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-12 text-slate-600 text-xs">
                  No se encontraron campañas en esta sección.
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {displayedCampaigns.map((c) => {
                    const isActive = c.status === 'active';
                    return (
                      <div 
                        key={c.id}
                        className={`p-4 rounded-xl border transition-all bg-slate-955 hover:border-slate-700 ${
                          isActive ? 'border-slate-800' : 'border-slate-900 opacity-60'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-200">{c.title || 'Campaña sin título'}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">ID: {c.id.slice(0, 8)}...</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Toggle Status switch */}
                            <div className="flex items-center gap-2 bg-slate-900/60 pl-2 pr-1.5 py-1 rounded-xl border border-slate-850">
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-455' : 'text-slate-500'}`}>
                                {isActive ? 'Activa' : 'Inactiva'}
                              </span>
                              <button
                                id={`toggle-status-${c.id}`}
                                type="button"
                                onClick={() => handleToggleStatus(c.id, c.status || 'active')}
                                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isActive ? 'bg-emerald-600' : 'bg-slate-700'
                                }`}
                                title="Cambiar estado de campaña"
                              >
                                <span
                                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                    isActive ? 'translate-x-3.5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold border border-indigo-900/60 px-2 py-0.5 rounded">
                              {c.target_stamps} Sellos
                            </span>
                          </div>
                        </div>

                        {c.description && (
                          <p className="text-xs text-slate-400 mb-3 leading-relaxed">{c.description}</p>
                        )}

                        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 mb-4 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-550 block font-bold uppercase">Premio Recompensa</span>
                            <span className="font-bold text-slate-200">🎁 {c.prize_description}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-550 block font-bold uppercase">Expira</span>
                            <span className="font-bold text-slate-350">{new Date(c.end_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-900 pt-3">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(c.id)}
                            className="px-2.5 py-1 bg-rose-955 hover:bg-rose-950 border border-rose-900/50 rounded-lg text-xs font-bold text-rose-455 hover:text-rose-300 cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3): Creation / Edition Form */}
          <div className={`space-y-6 lg:col-span-1 order-first lg:order-last ${showFormMobile ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>{isEditing ? '✏️ Editar Campaña' : '➕ Crear Campaña'}</span>
                {isEditing && (
                  <button 
                    onClick={resetForm} 
                    className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Título de la Campaña *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Promo Verano, Desafío VIP, etc."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full"
                  />
                </div>

                {/* Target Stamps */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Meta de Sellos (Visitas) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={1000}
                    value={formStamps}
                    onChange={(e) => setFormStamps(parseInt(e.target.value))}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full"
                  />
                </div>

                {/* Prize */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Premio / Recompensa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Postre Gratis, Entrada de Cortesía"
                    value={formPrize}
                    onChange={(e) => setFormPrize(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full"
                  />
                </div>

                {/* Expiration Date */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Fecha y Hora de Expiración *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formExpiration}
                    onChange={(e) => setFormExpiration(e.target.value)}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full text-slate-300"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Estado *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full cursor-pointer"
                  >
                    <option value="active" className="bg-slate-900 text-slate-200">Activa (Elegible para sellos)</option>
                    <option value="inactive" className="bg-slate-900 text-slate-200">Inactiva (Deshabilitada)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider">Descripción de Campaña (Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Describa brevemente los términos o detalles de acumulación..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isEditing ? '💾 Guardar Cambios' : '⚡ Crear Campaña'}
                </button>
              </form>
            </div>
          </div>

        </div>

      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-650 font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
        <p className="mt-1 text-[10px] text-slate-800">Entorno local • Base temporal: 14 de Junio, 2026</p>
      </footer>
    </div>
  );
}
