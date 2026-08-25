"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  tiers?: CampaignTier[];
  multipliers?: CampaignMultiplier[];
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
  const [formPoints, setFormPoints] = useState(1000);
  const [formPointsRate, setFormPointsRate] = useState(10);
  const [formExpiration, setFormExpiration] = useState('2026-07-31T23:59');
  const [formNeverExpires, setFormNeverExpires] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [showFormMobile, setShowFormMobile] = useState(false);

  // Multi-tier & Multiplier states
  const [formTiers, setFormTiers] = useState<CampaignTier[]>([
    { id: '1', title: 'Bienvenida', target_points: 100, prize_description: '5% de descuento en tu consumo', monetary_value: 5.00, icon: '🎉' },
    { id: '2', title: 'Explorador', target_points: 250, prize_description: 'Envío gratis en tu próxima compra', monetary_value: 12.50, icon: '⭐️' },
    { id: '3', title: 'Aventurero', target_points: 500, prize_description: '15% de descuento exclusivo', monetary_value: 25.00, icon: '🔥' },
    { id: '4', title: 'Leyenda', target_points: 750, prize_description: 'Postre & Copa de vino gratis', monetary_value: 37.50, icon: '💎' },
    { id: '5', title: 'Tesoro Final', target_points: 1000, prize_description: 'Caja sorpresa VIP valorada en $100', monetary_value: 50.00, icon: '👑' }
  ]);

  const [formMultipliers, setFormMultipliers] = useState<CampaignMultiplier[]>([
    { id: 'm1', title: 'Doble Puntos en Consumo Diario', multiplier: 2, applies_to: 'Planes Diarios', badge_text: '🔥 ¡HOY 2X PUNTOS en Consumo Diario!', is_active: true }
  ]);

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
    setFormPoints(1000);
    setFormPointsRate(10);
    setFormExpiration('2026-07-31T23:59');
    setFormNeverExpires(false);
    setFormDescription('');
    setFormStatus('active');
    setShowFormMobile(false);
    setFormTiers([
      { id: '1', title: 'Bienvenida', target_points: 100, prize_description: '5% de descuento en tu consumo', monetary_value: 5.00, icon: '🎉' },
      { id: '2', title: 'Explorador', target_points: 250, prize_description: 'Envío gratis en tu próxima compra', monetary_value: 12.50, icon: '⭐️' },
      { id: '3', title: 'Aventurero', target_points: 500, prize_description: '15% de descuento exclusivo', monetary_value: 25.00, icon: '🔥' }
    ]);
    setFormMultipliers([
      { id: 'm1', title: 'Doble Puntos en Consumo Diario', multiplier: 2, applies_to: 'Planes Diarios', badge_text: '🔥 ¡HOY 2X PUNTOS en Consumo Diario!', is_active: true }
    ]);
  };

  const handleEditClick = (campaign: LoyaltyCampaign) => {
    setIsEditing(true);
    setEditingCampaignId(campaign.id);
    setFormTitle(campaign.title || '');
    setFormPrize(campaign.prize_description || '');
    setFormPoints(campaign.target_points || 1000);
    setFormPointsRate(campaign.points_per_value_unit || 10);
    if (campaign.end_date) {
      const date = new Date(campaign.end_date);
      const isNever = date.getFullYear() >= 2099;
      setFormNeverExpires(isNever);
      if (isNever) {
        setFormExpiration('2099-12-31T23:59');
      } else {
        const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setFormExpiration(localISO);
      }
    }
    setFormDescription(campaign.description || '');
    setFormStatus(campaign.status || 'active');
    setFormTiers(campaign.tiers && campaign.tiers.length > 0 ? campaign.tiers : [
      { id: 't1', title: campaign.title || 'Premio Principal', target_points: campaign.target_points || 1000, prize_description: campaign.prize_description || 'Premio', monetary_value: 50.00, icon: '👑' }
    ]);
    setFormMultipliers(campaign.multipliers || []);
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

    const sortedTiers = [...formTiers].sort((a, b) => a.target_points - b.target_points);
    const maxTierPoints = sortedTiers.length > 0 ? Math.max(...sortedTiers.map(t => t.target_points)) : formPoints;
    const maxTierPrize = sortedTiers.length > 0 ? sortedTiers[sortedTiers.length - 1].prize_description : formPrize;

    const payload = {
      title: formTitle.trim(),
      prize_description: maxTierPrize || formPrize.trim(),
      target_points: maxTierPoints || formPoints,
      points_per_value_unit: formPointsRate,
      description: formDescription.trim(),
      status: formStatus,
      start_date: new Date('2026-06-14T15:41:53-06:00').toISOString(),
      end_date: formNeverExpires 
        ? new Date('2099-12-31T23:59:59Z').toISOString() 
        : new Date(formExpiration).toISOString(),
      tiers: sortedTiers,
      multipliers: formMultipliers
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

  const handleAddTier = () => {
    const nextPoints = (formTiers.length + 1) * 200;
    setFormTiers([
      ...formTiers,
      {
        id: `tier-${Date.now()}`,
        title: `Nivel ${formTiers.length + 1}`,
        target_points: nextPoints,
        prize_description: 'Nueva Recompensa',
        monetary_value: 10.00,
        icon: '⭐️'
      }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (formTiers.length <= 1) {
      showToast('Debe haber al menos un nivel de premio.', 'error');
      return;
    }
    setFormTiers(formTiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index: number, field: keyof CampaignTier, value: any) => {
    const updated = [...formTiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormTiers(updated);
  };

  const handleAddMultiplier = () => {
    setFormMultipliers([
      ...formMultipliers,
      {
        id: `mult-${Date.now()}`,
        title: 'Promoción Especial',
        multiplier: 2,
        applies_to: 'Planes Diarios',
        badge_text: '🔥 ¡HOY 2X PUNTOS!',
        is_active: true
      }
    ]);
  };

  const handleRemoveMultiplier = (index: number) => {
    setFormMultipliers(formMultipliers.filter((_, i) => i !== index));
  };

  const handleUpdateMultiplier = (index: number, field: keyof CampaignMultiplier, value: any) => {
    const updated = [...formMultipliers];
    updated[index] = { ...updated[index], [field]: value };
    setFormMultipliers(updated);
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
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#153e35] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
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
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#153e35]">Administración de Campañas</span>
            <h2 className="text-2xl font-black text-[#232d2a] flex items-center gap-2 mt-1">
              📢 {businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}
            </h2>
            <p className="text-sm text-[#6b7773] mt-1 font-medium">
              Crea, edita y gestiona las campañas de fidelización, hitos de premios y multiplicadores.
            </p>
          </div>
        </div>

        {/* Toggle Form Button on Mobile */}
        <div className="lg:hidden flex justify-end">
          <button
            type="button"
            onClick={() => setShowFormMobile(!showFormMobile)}
            className="px-4 py-2.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
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
            <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col min-h-[500px]">
              
              <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#232d2a]">📋 Historial de Campañas</h3>
                  <p className="text-xs text-[#6b7773] font-medium">Historial completo de ofertas de fidelización.</p>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex items-center bg-[#faf8f5] p-1 rounded-2xl border border-[#e8e1d5]">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      filter === 'all' ? 'bg-[#153e35] text-white shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      filter === 'active' ? 'bg-[#f0f7f4] text-[#153e35] border border-[#b2dbcd] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                    }`}
                  >
                    Activas
                  </button>
                  <button
                    onClick={() => setFilter('inactive')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      filter === 'inactive' ? 'bg-[#f2ece1] text-[#232d2a] shadow-xs' : 'text-[#6b7773] hover:text-[#232d2a]'
                    }`}
                  >
                    Inactivas
                  </button>
                </div>
              </div>

              {/* Loader */}
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[#9c9384] py-12 font-medium">
                  Cargando campañas...
                </div>
              ) : displayedCampaigns.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-12 text-[#9c9384] text-xs font-medium">
                  No se encontraron campañas en esta sección.
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {displayedCampaigns.map((c) => {
                    const isActive = c.status === 'active';
                    return (
                      <div 
                        key={c.id}
                        className={`p-4 rounded-2xl border transition-all bg-[#faf8f5] hover:border-[#c49340] ${
                          isActive ? 'border-[#e8e1d5]' : 'border-[#e8e1d5] opacity-70'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#232d2a]">{c.title || 'Campaña sin título'}</h4>
                            <p className="text-[10px] text-[#9c9384] font-semibold tracking-wider uppercase mt-0.5">ID: {c.id.slice(0, 8)}...</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Toggle Status switch */}
                            <div className="flex items-center gap-2 bg-white pl-2 pr-1.5 py-1 rounded-xl border border-[#e8e1d5] shadow-xs">
                              <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isActive ? 'text-[#153e35]' : 'text-[#6b7773]'}`}>
                                {isActive ? 'Activa' : 'Inactiva'}
                              </span>
                              <button
                                id={`toggle-status-${c.id}`}
                                type="button"
                                onClick={() => handleToggleStatus(c.id, c.status || 'active')}
                                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isActive ? 'bg-[#153e35]' : 'bg-[#e8dfce]'
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
                            <span className="text-[10px] bg-[#f7f3eb] text-[#8c6b2d] font-extrabold border border-[#e2d5bd] px-2.5 py-0.5 rounded-full">
                              {c.target_points} Pts ({c.points_per_value_unit} pts/$)
                            </span>
                          </div>
                        </div>

                        {c.description && (
                          <p className="text-xs text-[#333d39] mb-3 leading-relaxed font-medium">{c.description}</p>
                        )}

                        <div className="bg-white p-3.5 rounded-2xl border border-[#e8e1d5] mb-4 flex items-center justify-between text-xs shadow-xs">
                          <div>
                            <span className="text-[10px] text-[#6b7773] block font-bold uppercase">Premio Recompensa</span>
                            <span className="font-extrabold text-[#232d2a]">🎁 {c.prize_description}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#6b7773] block font-bold uppercase">Expira</span>
                            <span className="font-bold text-[#333d39]">
                              {new Date(c.end_date).getFullYear() >= 2099 
                                ? 'Nunca' 
                                : new Date(c.end_date).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 border-t border-[#e8e1d5] pt-3">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="px-3 py-1.5 bg-white hover:bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-[#232d2a] cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(c.id)}
                            className="px-3 py-1.5 bg-[#fdf2f2] hover:bg-[#f5c6c6] border border-[#f5c6c6] rounded-xl text-xs font-bold text-[#9b1c1c] cursor-pointer transition-all flex items-center gap-1.5"
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
            <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs">
              <h3 className="text-sm font-extrabold text-[#232d2a] border-b border-[#e8e1d5] pb-3 mb-4 flex items-center justify-between">
                <span>{isEditing ? '✏️ Editar Campaña' : '➕ Crear Campaña'}</span>
                {isEditing && (
                  <button 
                    onClick={resetForm} 
                    className="text-[10px] bg-[#faf8f5] hover:bg-[#f2ece1] border border-[#e8e1d5] text-[#6b7773] hover:text-[#232d2a] px-2 py-0.5 rounded-md cursor-pointer font-bold"
                  >
                    Cancelar
                  </button>
                )}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Título de la Campaña *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Promo Verano, Desafío VIP"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full font-medium"
                  />
                </div>

                {/* Target Points */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Meta de Puntos para Recompensa *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100000}
                    value={formPoints}
                    onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full font-medium"
                  />
                </div>

                {/* Points Rate */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Puntos por cada $1 gastado *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={formPointsRate}
                    onChange={(e) => setFormPointsRate(parseInt(e.target.value) || 0)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full font-medium"
                  />
                </div>

                {/* Main Prize fallback */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Premio Principal / Recompensa Final *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Caja Sorpresa VIP, T-Bone Gratis"
                    value={formPrize}
                    onChange={(e) => setFormPrize(e.target.value)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full font-medium"
                  />
                </div>

                {/* Dynamic Multi-Tier Milestones Section */}
                <div className="border-t border-b border-[#e8e1d5] py-4 my-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#c49340] uppercase tracking-wider">🏆 Niveles Intermedios</h4>
                      <p className="text-[10px] text-[#6b7773]">Configura hitos de puntos y equivalencias en $.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTier}
                      className="px-2.5 py-1 bg-[#f7f3eb] hover:bg-[#e8dfce] border border-[#e2d5bd] rounded-lg text-[10px] font-bold text-[#8c6b2d] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>➕</span> Agregar Nivel
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {formTiers.map((tier, idx) => (
                      <div key={tier.id || idx} className="bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={tier.icon || '⭐️'}
                              onChange={(e) => handleUpdateTier(idx, 'icon', e.target.value)}
                              className="bg-white border border-[#e8e1d5] text-sm rounded-lg p-1 text-[#232d2a] focus:outline-none cursor-pointer"
                            >
                              <option value="🎉">🎉</option>
                              <option value="⭐️">⭐️</option>
                              <option value="🔥">🔥</option>
                              <option value="💎">💎</option>
                              <option value="👑">👑</option>
                              <option value="⚡">⚡</option>
                              <option value="🏅">🏅</option>
                              <option value="🏆">🏆</option>
                            </select>
                            <span className="text-xs font-extrabold text-[#232d2a]">Nivel #{idx + 1}</span>
                          </div>
                          {formTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(idx)}
                              className="text-[10px] text-[#9b1c1c] font-bold px-1.5 py-0.5 rounded hover:bg-[#fdf2f2] transition-colors cursor-pointer"
                            >
                              ✕ Eliminar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Nombre de Nivel</label>
                            <input
                              type="text"
                              value={tier.title}
                              onChange={(e) => handleUpdateTier(idx, 'title', e.target.value)}
                              placeholder="Ej: Explorador"
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Puntos Requeridos</label>
                            <input
                              type="number"
                              min={10}
                              value={tier.target_points}
                              onChange={(e) => handleUpdateTier(idx, 'target_points', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Premio del Nivel</label>
                            <input
                              type="text"
                              value={tier.prize_description}
                              onChange={(e) => handleUpdateTier(idx, 'prize_description', e.target.value)}
                              placeholder="Ej: Envío gratis"
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Equiv. ($ USD)</label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              value={tier.monetary_value ?? 0}
                              onChange={(e) => handleUpdateTier(idx, 'monetary_value', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Multiplier Promotions Section */}
                <div className="border-b border-[#e8e1d5] pb-4 mb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#8c5e14] uppercase tracking-wider">⚡ Multiplicadores</h4>
                      <p className="text-[10px] text-[#6b7773]">Configura 2X, 3X puntos por producto o evento.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMultiplier}
                      className="px-2.5 py-1 bg-[#fef8ed] hover:bg-[#e6d1a8] border border-[#e6d1a8] rounded-lg text-[10px] font-bold text-[#8c5e14] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡</span> Agregar
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {formMultipliers.map((mult, idx) => (
                      <div key={mult.id || idx} className="bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#c49340]">{mult.multiplier}X Puntos</span>
                            <span className="text-[10px] text-[#6b7773] font-semibold truncate max-w-[120px]">{mult.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiplier(idx)}
                            className="text-[10px] text-[#9b1c1c] font-bold px-1.5 py-0.5 rounded hover:bg-[#fdf2f2] transition-colors cursor-pointer"
                          >
                            ✕ Eliminar
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Multiplicador</label>
                            <select
                              value={mult.multiplier}
                              onChange={(e) => handleUpdateMultiplier(idx, 'multiplier', parseInt(e.target.value) || 2)}
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none cursor-pointer"
                            >
                              <option value={2}>2X (Doble Puntos)</option>
                              <option value={3}>3X (Triple Puntos)</option>
                              <option value={5}>5X (Quíntuple Puntos)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Aplica a Scope</label>
                            <input
                              type="text"
                              value={mult.applies_to}
                              onChange={(e) => handleUpdateMultiplier(idx, 'applies_to', e.target.value)}
                              placeholder="Ej: Planes Diarios"
                              className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-[#6b7773] uppercase block">Texto Banner Promocional</label>
                          <input
                            type="text"
                            value={mult.badge_text || ''}
                            onChange={(e) => handleUpdateMultiplier(idx, 'badge_text', e.target.value)}
                            placeholder="Ej: 🔥 ¡HOY 2X PUNTOS en Consumo Diario!"
                            className="w-full bg-white border border-[#e2d8c7] rounded-lg px-2 py-1 text-xs text-[#232d2a] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiration Settings */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="never-expires"
                      checked={formNeverExpires}
                      onChange={(e) => {
                        setFormNeverExpires(e.target.checked);
                        if (e.target.checked) {
                          setFormExpiration('2099-12-31T23:59');
                        } else {
                          setFormExpiration('2026-07-31T23:59');
                        }
                      }}
                      className="w-4 h-4 rounded border-[#e2d8c7] text-[#153e35] focus:ring-[#153e35] cursor-pointer"
                    />
                    <label htmlFor="never-expires" className="text-xs font-bold text-[#333d39] cursor-pointer select-none">
                      Nunca expira (Sin límite de tiempo)
                    </label>
                  </div>

                  {!formNeverExpires && (
                    <div className="flex flex-col mt-2">
                      <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Fecha y Hora de Expiración *</label>
                      <input
                        type="datetime-local"
                        required={!formNeverExpires}
                        value={formExpiration}
                        onChange={(e) => setFormExpiration(e.target.value)}
                        className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Estado *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full cursor-pointer font-bold"
                  >
                    <option value="active">Activa (Elegible para sellos)</option>
                    <option value="inactive">Inactiva (Deshabilitada)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider">Descripción (Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Describa brevemente los términos..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="bg-[#faf8f5] border border-[#e2d8c7] rounded-xl px-3 py-2 text-xs text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-colors w-full resize-none font-medium"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-[#153e35]/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isEditing ? '💾 Guardar Cambios' : '⚡ Crear Campaña'}
                </button>
              </form>
            </div>
          </div>

        </div>

      </main>

      <footer className="border-t border-[#e8e1d5] bg-white py-6 text-center text-xs text-[#6b7773] font-medium">
        <p>© 2026 feebli SaaS B2B. Diseñado para pequeños comercios y restaurantes.</p>
      </footer>
    </div>
  );
}
