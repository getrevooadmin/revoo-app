"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// MUI Icons
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SettingsIcon from '@mui/icons-material/Settings';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BusinessIcon from '@mui/icons-material/Business';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import BlockIcon from '@mui/icons-material/Block';
import FilterListIcon from '@mui/icons-material/FilterList';

interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
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
  is_ready_for_scan?: boolean;
  is_scanned?: boolean;
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
  const router = useRouter();
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

  // Settings Modal & Business Info states
  const [userEmail, setUserEmail] = useState<string>('admin@comercio.com');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Business Info Modal states
  const [isBusinessInfoOpen, setIsBusinessInfoOpen] = useState(false);
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [businessLogoInput, setBusinessLogoInput] = useState('');
  const [isSavingBusinessInfo, setIsSavingBusinessInfo] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);

  const handleOpenBusinessInfoModal = () => {
    const currentBusiness = businesses.find(b => b.id === selectedBusinessId);
    setBusinessNameInput(currentBusiness?.name || '');
    setBusinessLogoInput(currentBusiness?.logo_url || '');
    setIsBusinessInfoOpen(true);
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessNameInput.trim()) {
      showToast('El nombre del comercio no puede estar vacío.', 'error');
      return;
    }

    setIsSavingBusinessInfo(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/businesses/${selectedBusinessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: businessNameInput.trim(),
          logo_url: businessLogoInput.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el comercio');
      }

      showToast('¡Información del comercio actualizada con éxito!');
      setIsBusinessInfoOpen(false);
      if (data.business) {
        setBusinesses([data.business]);
      } else {
        setBusinesses(prev => prev.map(b => b.id === selectedBusinessId ? { ...b, name: businessNameInput.trim(), logo_url: businessLogoInput.trim() || null } : b));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingBusinessInfo(false);
    }
  };

  // Load user data on settings modal open
  useEffect(() => {
    if (isSettingsOpen) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setSettingsName(user.user_metadata?.full_name || '');
        }
      });
    }
  }, [isSettingsOpen]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    
    try {
      const updates: any = {};
      
      if (settingsName.trim()) {
        updates.data = { full_name: settingsName.trim() };
      }
      
      if (settingsPassword) {
        if (settingsPassword !== settingsConfirmPassword) {
          showToast('Las contraseñas no coinciden.', 'error');
          setIsSavingSettings(false);
          return;
        }
        if (settingsPassword.length < 6) {
          showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
          setIsSavingSettings(false);
          return;
        }
        updates.password = settingsPassword;
      }
      
      if (Object.keys(updates).length === 0) {
        setIsSettingsOpen(false);
        setIsSavingSettings(false);
        return;
      }
      
      const { error } = await supabase.auth.updateUser(updates);
      if (error) {
        showToast(error.message, 'error');
        setIsSavingSettings(false);
        return;
      }
      
      showToast('¡Ajustes actualizados con éxito!');
      setSettingsPassword('');
      setSettingsConfirmPassword('');
      setIsSettingsOpen(false);
    } catch (err: any) {
      showToast('Error al intentar guardar ajustes.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

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

  // Check auth session on load
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data?.session;
      if (!session) {
        router.push('/login');
        return;
      }
      loadMerchantData(session.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        router.push('/login');
      }
    });

    // Fetch mock time
    fetch('/api/dev/mock-time')
      .then(res => res.json())
      .then(data => {
        if (data.mockDate) setMockDate(data.mockDate);
      })
      .catch(err => console.error('Error fetching mock time:', err));

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const loadMerchantData = async (accessToken: string) => {
    try {
      const res = await fetch('/api/businesses/my-business', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to load merchant business profile');
      }
      const business = await res.json();
      setBusinesses([business]);
      setSelectedBusinessId(business.id);
    } catch (err) {
      console.error('Error loading merchant business:', err);
      showToast('Error al cargar la información del comercio.', 'error');
    }
  };

  // Fetch codes and campaigns when selected business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    fetchCodes();
    fetchCampaigns();
  }, [selectedBusinessId]);

  const fetchCodes = async () => {
    if (!selectedBusinessId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/codes`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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
    if (!selectedBusinessId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
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
      showToast(`¡Código ${data.code} generado y activado en el QR de caja!`);
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
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setDeactivatingCode(code);
    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes/${code}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
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

  const handleSetReadyForScan = async (code: string) => {
    if (!selectedBusinessId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes/${code}/ready-for-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo activar el código para escaneo.');
      }
      showToast(data.message || 'Código activado en QR de caja correctamente.');
      fetchCodes();
    } catch (err: any) {
      showToast(err.message, 'error');
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
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#f0f7f4] border-[#b2dbcd] text-[#153e35]' 
            : 'bg-[#fdf2f2] border-[#f5c6c6] text-[#9b1c1c]'
        }`}>
          {notification.type === 'success' ? <CheckCircleIcon fontSize="small" className="text-[#153e35]" /> : <WarningIcon fontSize="small" className="text-[#9b1c1c]" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#e8e1d5] bg-white sticky top-0 z-40 py-2 sm:py-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4rem] sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {businesses.find(b => b.id === selectedBusinessId)?.logo_url ? (
                <img
                  src={businesses.find(b => b.id === selectedBusinessId)?.logo_url!}
                  alt="Logo"
                  className="w-10 h-10 rounded-2xl object-cover border border-[#e8e1d5] shadow-xs bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-[#153e35] text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {(businesses.find(b => b.id === selectedBusinessId)?.name || 'C')[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-base font-extrabold text-[#153e35] leading-none">
                  {businesses.find(b => b.id === selectedBusinessId)?.name || 'Comercio'}
                </h1>
                <p className="text-[10px] text-[#6b7773] font-medium">Panel del Comercio</p>
              </div>
            </div>
            
            {/* Menu Buttons under logo */}
            <nav className="flex items-center gap-1.5">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HomeIcon fontSize="inherit" />
                <span>Panel General</span>
              </Link>
              <Link
                href="/campaigns"
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CampaignIcon fontSize="inherit" />
                <span>Campañas</span>
              </Link>
              <Link
                href="/codes"
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#153e35] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ConfirmationNumberIcon fontSize="inherit" />
                <span>Códigos</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">

            {/* Menú de Acciones */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className="w-9 h-9 rounded-xl bg-[#faf8f5] border border-[#e8e1d5] hover:border-[#153e35] flex items-center justify-center text-[#232d2a] cursor-pointer transition-all shadow-xs"
                title="Menú de Acciones"
              >
                <SettingsIcon fontSize="small" />
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-2 flex flex-col z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-[#e8e1d5] mb-1">
                    <p className="text-xs font-bold text-[#232d2a]">Administrador</p>
                    <p className="text-[10px] text-[#6b7773] font-medium">{userEmail}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenBusinessInfoModal();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#333d39] hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <BusinessIcon fontSize="small" />
                    <span>Información del Comercio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#333d39] hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <SettingsIcon fontSize="small" />
                    <span>Ajustes de Cuenta</span>
                  </button>

                  <div className="h-px bg-[#e8e1d5] my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      supabase.auth.signOut().then(() => {
                        router.push('/login');
                      });
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-[#9b1c1c] hover:bg-[#fdf2f2] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ExitToAppIcon fontSize="small" />
                    <span>Cerrar Sesión</span>
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
              <ConfirmationNumberIcon className="text-[#153e35]" fontSize="large" />
              <span>{businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}</span>
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
              className="px-5 py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 disabled:bg-[#e8dfce] disabled:text-[#9c9384] text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#153e35]/15 h-[42px] mt-auto"
            >
              <FlashOnIcon fontSize="small" />
              <span>{isGenerating ? 'Generando...' : 'Generar Código'}</span>
            </button>
          </div>
        </div>

        {/* Static Counter QR Section */}
        {selectedBusinessId && (() => {
          const activeBusinessName = businesses.find(b => b.id === selectedBusinessId)?.name || 'Comercio';
          const readyCodeObj = codes.find(c => c.is_ready_for_scan && getCodeStatus(c) === 'active') || codes.find(c => getCodeStatus(c) === 'active');
          const consumerBaseUrl = process.env.NEXT_PUBLIC_CONSUMER_APP_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000');
          const counterUrl = `${consumerBaseUrl}/${selectedBusinessId}`;
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(counterUrl)}`;

          const handleDownloadQR = async () => {
            try {
              const response = await fetch(qrApiUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `QR_Caja_${activeBusinessName.replace(/\s+/g, '_')}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              showToast('¡Imagen QR descargada con éxito!');
            } catch (e) {
              showToast('Error al descargar la imagen QR.', 'error');
            }
          };

          const handlePrintQRTemplate = () => {
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            printWin.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>QR de Caja - ${activeBusinessName}</title>
                  <style>
                    body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #232d2a; background: #fff; }
                    .card { max-width: 400px; margin: 0 auto; border: 3px solid #153e35; border-radius: 24px; padding: 32px; background: #faf8f5; }
                    h1 { font-size: 24px; color: #153e35; margin-bottom: 8px; font-weight: 900; }
                    p { font-size: 14px; color: #6b7773; margin-top: 0; }
                    .qr-img { width: 240px; height: 240px; margin: 24px 0; border-radius: 16px; border: 1px solid #e8e1d5; }
                    .footer { font-size: 12px; font-weight: bold; color: #153e35; background: #f0f7f4; padding: 10px 18px; border-radius: 12px; display: inline-block; border: 1px solid #b2dbcd; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>${activeBusinessName}</h1>
                    <p>¡Acumula puntos por tu compra y gana premios!</p>
                    <img src="${qrApiUrl}" class="qr-img" alt="QR de Caja" />
                    <div class="footer">Escanea aquí con la cámara de tu celular</div>
                  </div>
                  <script>window.onload = function() { window.print(); };</script>
                </body>
              </html>
            `);
            printWin.document.close();
          };

          return (
            <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* QR Image Box */}
                <div className="relative group shrink-0">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-[#faf8f5] p-2.5 rounded-2xl border border-[#e8e1d5] flex items-center justify-center shadow-xs">
                    <img
                      src={qrApiUrl}
                      alt="QR Fijo de Mostrador"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                </div>

                {/* Info & Status Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#f0f7f4] text-[#153e35] px-2.5 py-0.5 rounded-full border border-[#b2dbcd]">
                      📱 QR Fijo de Mostrador (Caja)
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#232d2a]">
                    QR Permanente de Caja Registradora
                  </h3>

                  <p className="text-xs text-[#6b7773] max-w-xl font-medium leading-relaxed">
                    Imprime o descarga este QR único para colocarlo en tu caja registradora. Tus clientes escanean este mismo QR y el sistema cargará automáticamente el código de compra que generes.
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    {readyCodeObj ? (
                      <div className="flex items-center gap-2 bg-[#f0f7f4] border border-[#b2dbcd] px-3 py-1.5 rounded-xl text-xs">
                        <span className="font-extrabold text-[#153e35] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#153e35] animate-ping" />
                          <span>Código Activo en QR:</span>
                          <strong className="font-mono text-sm tracking-wider">{readyCodeObj.code}</strong>
                        </span>
                        {readyCodeObj.purchase_amount > 0 && (
                          <span className="font-black text-[#8c6b2d] bg-white px-2 py-0.5 rounded-md border border-[#e2d5bd] text-[11px]">
                            ${Number(readyCodeObj.purchase_amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="bg-[#faf8f5] border border-[#e8e1d5] px-3 py-1.5 rounded-xl text-xs text-[#8a7f6e] font-semibold flex items-center gap-1.5">
                        <span>⚪ Ningún código activo en QR. Al generar una nueva compra se activará automáticamente.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-4 py-2.5 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <ContentCopyIcon fontSize="small" />
                  <span>Descargar Imagen QR (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintQRTemplate}
                  className="px-4 py-2.5 bg-[#faf8f5] hover:bg-[#f2ece1] text-[#232d2a] border border-[#e8e1d5] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <ConfirmationNumberIcon fontSize="small" className="text-[#153e35]" />
                  <span>Imprimir Plantilla de Mostrador</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(counterUrl);
                    showToast('¡Enlace del QR copiado!');
                  }}
                  className="text-[11px] font-bold text-[#6b7773] hover:text-[#153e35] transition-colors text-center cursor-pointer py-1"
                >
                  Copiar Enlace ({counterUrl})
                </button>
              </div>
            </div>
          );
        })()}

        {/* Filters and Table Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs min-h-[500px] flex flex-col">
          
          <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#232d2a] flex items-center gap-1.5">
                <ConfirmationNumberIcon fontSize="small" className="text-[#153e35]" />
                <span>Códigos Generados</span>
              </h3>
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
                    const canBeScannable = getCodeStatus(c) === 'active';

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
                              <ContentCopyIcon fontSize="inherit" />
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
                                {c.campaign.title}
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
                          {c.is_ready_for_scan && canBeScannable && (
                            <div className="mt-1">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#153e35] text-white border border-[#153e35] animate-pulse inline-flex items-center gap-1">
                                📱 QR Caja Activo
                              </span>
                            </div>
                          )}
                          {c.is_redeemed && c.redeemed_at && (
                            <div className="text-[9px] font-semibold text-[#6b7773] mt-1">
                              Redimido: {new Date(c.redeemed_at).toLocaleString('es-NI', {
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
                                  Asociado: {new Date(c.associated_at).toLocaleString('es-NI', {
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
                          <div className="flex items-center justify-end gap-1.5">
                            {canBeScannable && !c.is_ready_for_scan && (
                              <button
                                type="button"
                                onClick={() => handleSetReadyForScan(c.code)}
                                className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-[#f0f7f4] hover:bg-[#b2dbcd] text-[#153e35] border border-[#b2dbcd] transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                title="Activar este código para ser escaneado automáticamente en el QR de caja"
                              >
                                <FlashOnIcon fontSize="inherit" />
                                <span>Activar QR Caja</span>
                              </button>
                            )}
                            {c.is_ready_for_scan && canBeScannable && (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-[#153e35] text-white border border-[#153e35] animate-pulse inline-flex items-center gap-1">
                                📱 Activo en QR
                              </span>
                            )}
                            <button
                              id={`deactivate-btn-${c.code}`}
                              type="button"
                              onClick={() => handleDeactivateCode(c.code)}
                              disabled={!isDeactivatable || deactivatingCode === c.code}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                isDeactivatable
                                  ? 'bg-[#fdf2f2] hover:bg-[#f5c6c6] border-[#f5c6c6] text-[#9b1c1c]'
                                  : 'bg-[#faf8f5] border-[#e8e1d5] text-[#9c9384] cursor-not-allowed'
                              }`}
                            >
                              <BlockIcon fontSize="inherit" />
                              <span>{deactivatingCode === c.code ? 'Desactivando...' : 'Desactivar'}</span>
                            </button>
                          </div>
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
        <p>© 2026 Portal de Fidelización. Diseñado para pequeños comercios y restaurantes.</p>
      </footer>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#232d2a]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-[#e8e1d5] p-8 w-full max-w-md shadow-2xl relative overflow-hidden text-[#232d2a]">
            <div className="flex flex-col mb-6">
              <h3 className="text-lg font-black text-[#232d2a]">Ajustes de Cuenta</h3>
              <p className="text-xs text-[#6b7773] mt-1 font-medium font-sans">Actualiza tu información personal o cambia tu contraseña de acceso.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider font-sans">Nombre Completo</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="h-px bg-[#e8e1d5] my-2"></div>
              
              <div className="text-xs font-bold text-[#333d39] mb-1.5 font-sans">Cambiar Contraseña (Opcional)</div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider font-sans">Nueva Contraseña</label>
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                  className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider font-sans">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={settingsConfirmPassword}
                  onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setSettingsPassword('');
                    setSettingsConfirmPassword('');
                  }}
                  className="flex-1 py-3 border border-[#e8e1d5] text-[#333d39] hover:bg-[#faf8f5] rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 py-3 bg-[#153e35] hover:bg-[#0f2e27] disabled:bg-[#a6b8b4] text-white rounded-2xl text-xs font-black shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
                >
                  {isSavingSettings ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Info Modal */}
      {isBusinessInfoOpen && (
        <div className="fixed inset-0 bg-[#232d2a]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0f7f4] border border-[#b2dbcd] flex items-center justify-center text-[#153e35]">
                  <BusinessIcon fontSize="small" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#232d2a]">Información del Comercio</h3>
                  <p className="text-[11px] text-[#6b7773] font-medium">Personaliza el nombre y el logo de tu negocio.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBusinessInfoOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#faf8f5] flex items-center justify-center text-[#9c9384] hover:text-[#232d2a] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
              {/* Combined Logo Avatar & Cambiar Logo Button Card */}
              <div className="bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl p-4 flex items-center gap-4">
                <div className="relative group shrink-0">
                  {businessLogoInput.trim() ? (
                    <img
                      src={businessLogoInput.trim()}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-[#e8e1d5] shadow-xs bg-white"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#153e35] text-white flex items-center justify-center text-2xl font-black shadow-xs">
                      {(businessNameInput || 'C')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#c49340]">Logo del Comercio</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-3.5 py-1.5 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                      <PhotoCameraIcon fontSize="inherit" />
                      <span>Cambiar Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBusinessLogoInput(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {businessLogoInput.trim() && (
                      <button
                        type="button"
                        onClick={() => setBusinessLogoInput('')}
                        className="px-2.5 py-1.5 text-xs text-[#9b1c1c] font-bold hover:bg-[#fdf2f2] rounded-xl transition-all cursor-pointer"
                      >
                        Quitar Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional URL Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#6b7773] uppercase tracking-wider block">O pegar URL de imagen</label>
                <input
                  type="text"
                  value={businessLogoInput}
                  onChange={(e) => setBusinessLogoInput(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full bg-[#faf8f5] border border-[#e8e1d5] rounded-xl px-3.5 py-2 text-xs text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#232d2a] mb-1.5 block">
                  Nombre del Comercio *
                </label>
                <input
                  type="text"
                  required
                  value={businessNameInput}
                  onChange={(e) => setBusinessNameInput(e.target.value)}
                  placeholder="Ej: Gimnasio Fitness Center"
                  className="w-full bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl px-3.5 py-2.5 text-sm text-[#232d2a] focus:outline-none focus:border-[#153e35]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#e8e1d5] pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsBusinessInfoOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold border border-[#e8e1d5] text-[#6b7773] hover:bg-[#faf8f5] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBusinessInfo}
                  className="px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-[#153e35] text-white hover:bg-[#0f2e27] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingBusinessInfo ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
