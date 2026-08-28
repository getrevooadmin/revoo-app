"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhoneInputField } from '@feebli/shared';
import { supabase } from '../lib/supabase';

// MUI Icons
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BusinessIcon from '@mui/icons-material/Business';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
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

interface CampaignTier {
  id?: string;
  title: string;
  target_points: number;
  prize_description: string;
  monetary_value?: number;
  icon?: string;
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
  tiers?: CampaignTier[];
  pin?: string;
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

export default function MerchantPage() {
  const router = useRouter();
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
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(0);
  
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setBusinessLogoInput(base64Data);

      setIsUploadingLogo(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/businesses/${selectedBusinessId}/logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ image: base64Data })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al subir la imagen a Supabase Storage');
        }

        setBusinessLogoInput(data.logo_url);
        showToast('Logo subido a Supabase Storage con éxito');
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
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

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check auth session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      loadMerchantData(session.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // Fetch data when active business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    refreshMerchantDashboard();
  }, [selectedBusinessId]);

  const refreshMerchantDashboard = async () => {
    if (!selectedBusinessId) return;
    
    // Get fresh token from Supabase client
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const accessToken = session.access_token;
    
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      
      const interRes = await fetch(`/api/businesses/${selectedBusinessId}/interactions`, { headers });
      const interData = await interRes.json();
      setRecentInteractions(Array.isArray(interData) ? interData : []);

      const dummyPhone = '+50588888888';
      const statusRes = await fetch(`/api/customers/${encodeURIComponent(dummyPhone)}/status?business_id=${selectedBusinessId}`, { headers });
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

      const codesRes = await fetch(`/api/businesses/${selectedBusinessId}/codes`, { headers });
      if (codesRes.ok) {
        const codesData = await codesRes.json();
        setGeneratedCodes(Array.isArray(codesData) ? codesData : []);
      }

      const campaignsRes = await fetch(`/api/businesses/${selectedBusinessId}/campaigns`, { headers });
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
      console.error('Error refreshing dashboard:', err);
      showToast('Error al actualizar datos del panel.', 'error');
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

  const handleSetReadyForScan = async (code: string) => {
    if (!selectedBusinessId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(`/api/businesses/${selectedBusinessId}/codes/${code}/ready-for-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Código activado en QR de caja correctamente.');
        refreshMerchantDashboard();
      } else {
        showToast(data.error || 'No se pudo activar el código para escaneo.', 'error');
      }
    } catch (err: any) {
      showToast('Error de red al activar el código.', 'error');
    }
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`/api/customers/${merchantPhoneLookup}/status?business_id=${selectedBusinessId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cliente no encontrado o sin puntos');
      }

      setLookupResult(data);

      const allTiers = buildActiveTiers(data.tiers, data.target_points, data.prize_description);
      const curPts = data.current_points || 0;
      let highestUnlockedIdx = 0;
      allTiers.forEach((t, i) => {
        if (curPts >= t.target_points) highestUnlockedIdx = i;
      });
      setSelectedTierIndex(highestUnlockedIdx);
    } catch (err: any) {
      setLookupError(err.message);
      setLookupResult(null);
    }
  };

  const handleRedeemPrize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupResult) return;

    const expectedPin = lookupResult.pin;
    if (expectedPin && redeemPinInput.trim() !== expectedPin.trim()) {
      showToast(`PIN de seguridad incorrecto. El PIN asignado al cliente es ${expectedPin}.`, 'error');
      return;
    }

    const allTiers = buildActiveTiers(
      lookupResult.tiers,
      lookupResult.target_points,
      lookupResult.prize_description
    );
    const selectedTier = allTiers[selectedTierIndex] || allTiers[0];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/businesses/redeem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          customer_phone: lookupResult.customer_phone,
          business_id: selectedBusinessId,
          points_to_redeem: selectedTier.target_points,
          pin: redeemPinInput.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al canjear premio');
      }

      showToast(`¡Premio "${selectedTier.prize_description}" canjeado con éxito! Se redimieron ${data.redeemed_points || data.redeemed_stamps} puntos.`);
      setRedeemPinInput('');
      
      setLookupResult(prev => prev ? {
        ...prev,
        current_points: data.remaining_points ?? data.remaining_stamps ?? 0,
        current_stamps: data.remaining_stamps ?? data.remaining_points ?? 0
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
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#153e35] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
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
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-[#153e35] hover:bg-[#f2ece1] transition-all cursor-pointer flex items-center gap-1.5"
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
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#153e35]">Panel de Administración</span>
            <h2 className="text-2xl font-black text-[#232d2a] flex items-center gap-2 mt-1">
              <BusinessIcon className="text-[#153e35]" />
              <span>{businesses.find(b => b.id === selectedBusinessId)?.name || 'Cargando comercio...'}</span>
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
            <RefreshIcon fontSize="small" />
            <span>{isLoading ? 'Actualizando...' : 'Actualizar Panel'}</span>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column: Active Campaign & Code Generation */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Campaign Specs card */}
            <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
              <h3 className="text-sm font-bold text-[#232d2a] border-b border-[#e8e1d5] pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 font-extrabold">
                  <CampaignIcon className="text-[#153e35]" fontSize="small" />
                  <span>Campaña de Fidelidad Activa</span>
                </span>
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
                        <CardGiftcardIcon fontSize="small" />
                        <span>{campaignStats.prize}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Code Generator Form */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-[#6b7773] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FlashOnIcon fontSize="small" className="text-[#c49340]" />
                        <span>Generar Código de Compra:</span>
                      </p>
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
                        <FlashOnIcon fontSize="small" />
                        <span>{isGenerating ? 'Generando...' : 'Generar Código'}</span>
                      </button>
                      <Link
                        href={`/campaigns?edit=${campaignStats.id}`}
                        className="py-3 px-4 bg-[#faf8f5] hover:bg-[#f2ece1] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                      >
                        <EditIcon fontSize="small" />
                        <span>Editar</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#faf8f5] flex items-center justify-center text-[#6b7773] border border-[#e8e1d5]">
                    <CampaignIcon fontSize="medium" />
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
                    <span>➕ Crear Nueva Campaña</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Recent codes list card */}
            {generatedCodes.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
                <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-[#232d2a] flex items-center gap-1.5">
                    <ConfirmationNumberIcon fontSize="small" className="text-[#153e35]" />
                    <span>Últimos Códigos Generados</span>
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
                              <CampaignIcon fontSize="inherit" /> <span className="truncate">{c.campaign.title}</span>
                            </div>
                          )}
                          <div className="text-[#6b7773] flex justify-between">
                            <span>Monto: <strong className="text-[#232d2a]">${c.purchase_amount?.toFixed(2) || '0.00'}</strong></span>
                            {c.invoice_number && <span>Factura: <strong className="text-[#232d2a]">{c.invoice_number}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#e8e1d5] pt-2 mt-1">
                          {status.text === 'Activo' && !c.is_associated && !c.is_ready_for_scan ? (
                            <button
                              onClick={() => handleSetReadyForScan(c.code)}
                              className="text-[9px] font-black text-[#153e35] bg-[#f0f7f4] hover:bg-[#b2dbcd] border border-[#b2dbcd] px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Hacer este código escaneable en el QR de caja"
                            >
                              <FlashOnIcon fontSize="inherit" />
                              <span>Hacer Escaneable</span>
                            </button>
                          ) : c.is_ready_for_scan && status.text === 'Activo' ? (
                            <span className="text-[9px] font-black text-[#153e35] bg-[#e7f3f0] border border-[#bfe2d9] px-2 py-0.5 rounded-lg animate-pulse">
                              📱 Escaneable en Caja
                            </span>
                          ) : (
                            <span className="text-[9px] text-[#9c9384] font-medium">
                              {new Date(c.created_at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(c.code);
                              showToast('¡Código copiado!');
                            }}
                            className="text-[9px] text-[#153e35] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ContentCopyIcon fontSize="inherit" />
                            <span>Copiar</span>
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
                <CardGiftcardIcon fontSize="small" className="text-[#153e35]" />
                <span>Terminal de Canjeo (Caja)</span>
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
                  className="w-full py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <SearchIcon fontSize="small" />
                  <span>Verificar Puntos</span>
                </button>
              </form>

              {/* Lookup results with intermediate tier milestone redemption */}
              {lookupResult && (() => {
                const allTiers = buildActiveTiers(
                  lookupResult.tiers,
                  lookupResult.target_points,
                  lookupResult.prize_description
                );
                const currentPts = lookupResult.current_points || 0;
                const unlockedTiers = allTiers.filter(t => currentPts >= t.target_points);
                const hasUnlockedMilestone = unlockedTiers.length > 0;

                const selectedIndex = Math.min(selectedTierIndex, allTiers.length - 1);
                const selectedTier = allTiers[selectedIndex] || allTiers[0];
                const nextLockedTier = allTiers.find(t => currentPts < t.target_points);

                return (
                  <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e1d5] space-y-4">
                    {/* Customer Header Info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-[#6b7773] font-bold">Celular Cliente:</p>
                        <p className="text-xs font-extrabold text-[#232d2a]">
                          {lookupResult.customer_phone.startsWith('+505') && lookupResult.customer_phone.length === 12
                            ? `+505 ${lookupResult.customer_phone.slice(4, 8)}-${lookupResult.customer_phone.slice(8)}`
                            : lookupResult.customer_phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          hasUnlockedMilestone 
                            ? 'bg-[#f0f7f4] text-[#153e35] border-[#b2dbcd]' 
                            : 'bg-[#f7f3eb] text-[#8c6b2d] border-[#e2d5bd]'
                        }`}>
                          {currentPts} Puntos Acumulados
                        </span>
                      </div>
                    </div>

                    {/* Milestones / Prizes Selection List */}
                    <div className="space-y-2 pt-1 border-t border-[#e8e1d5]">
                      <label className="text-[10px] font-extrabold text-[#232d2a] uppercase tracking-wider block">
                        Seleccionar Premio a Redimir:
                      </label>
                      
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {allTiers.map((tier, idx) => {
                          const isUnlocked = currentPts >= tier.target_points;
                          const isSelected = idx === selectedIndex;

                          return (
                            <div
                              key={tier.id || idx}
                              onClick={() => {
                                if (isUnlocked) setSelectedTierIndex(idx);
                              }}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                                isSelected && isUnlocked
                                  ? 'bg-[#f0f7f4] border-[#153e35] shadow-xs'
                                  : isUnlocked
                                  ? 'bg-white border-[#b2dbcd] hover:border-[#153e35]'
                                  : 'bg-[#faf8f5] border-[#e8e1d5] opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="redeemTier"
                                  checked={isSelected}
                                  disabled={!isUnlocked}
                                  onChange={() => setSelectedTierIndex(idx)}
                                  className="w-3.5 h-3.5 text-[#153e35] focus:ring-[#153e35]"
                                />
                                <div>
                                  <span className="font-extrabold text-[#232d2a] block">{tier.title}</span>
                                  <span className="text-[10px] text-[#6b7773] font-medium">{tier.prize_description}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`text-[10px] font-black block ${isUnlocked ? 'text-[#153e35]' : 'text-[#8a7f6e]'}`}>
                                  {tier.target_points} pts
                                </span>
                                {isUnlocked ? (
                                  <span className="text-[9px] text-[#153e35] font-extrabold bg-[#e7f3f0] px-1.5 py-0.5 rounded border border-[#bfe2d9]">
                                    ✓ Desbloqueado
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-[#8a7f6e]">
                                    Faltan {tier.target_points - currentPts} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Redemption Form or Status Notice */}
                    {hasUnlockedMilestone ? (
                      <form onSubmit={handleRedeemPrize} className="space-y-3 pt-2 border-t border-[#e8e1d5]">
                        <div className="bg-[#f0f7f4] p-2.5 rounded-xl border border-[#b2dbcd] text-xs">
                          <p className="text-[11px] text-[#153e35] font-extrabold flex items-center gap-1">
                            <CheckCircleIcon fontSize="small" />
                            <span>Premio Seleccionado: {selectedTier.title} ({selectedTier.target_points} pts)</span>
                          </p>
                          <p className="text-[10px] text-[#153e35] mt-0.5">
                            Premio: <strong>{selectedTier.prize_description}</strong> • Balance restante: {currentPts - selectedTier.target_points} pts
                          </p>
                        </div>
                        
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-[#6b7773] mb-1 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <LockIcon fontSize="inherit" />
                              <span>PIN de Seguridad del Cliente *</span>
                            </span>
                            {lookupResult.pin && (
                              <span className="text-[9px] text-[#153e35] font-extrabold bg-[#e7f3f0] px-2 py-0.5 rounded-md border border-[#bfe2d9]">
                                PIN Cliente: {lookupResult.pin}
                              </span>
                            )}
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder={`Ingrese PIN (${lookupResult.pin || '4 dígitos'})`}
                            value={redeemPinInput}
                            onChange={(e) => setRedeemPinInput(e.target.value.replace(/\D/g, ''))}
                            required
                            className="bg-white border border-[#e2d8c7] focus:border-[#153e35] rounded-xl px-3 py-2 text-xs text-[#232d2a] focus:outline-none transition-all w-full font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-2xl text-xs font-extrabold shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CardGiftcardIcon fontSize="small" />
                          <span>Redimir {selectedTier.prize_description} ({selectedTier.target_points} Pts)</span>
                        </button>
                      </form>
                    ) : (
                      <div className="pt-2 border-t border-[#e8e1d5] text-center">
                        <p className="text-[11px] text-[#9b1c1c] font-bold">
                          No califica para canjear ningún premio.
                        </p>
                        {nextLockedTier && (
                          <p className="text-[10px] text-[#6b7773] mt-1 font-medium">
                            Requiere <strong>{nextLockedTier.target_points - currentPts} puntos más</strong> para desbloquear <strong>{nextLockedTier.title} ({nextLockedTier.prize_description})</strong>.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* AI Audit Log Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col">
              <div className="border-b border-[#e8e1d5] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#232d2a] flex items-center gap-1.5">
                    <SearchIcon fontSize="small" className="text-[#153e35]" />
                    <span>Registro & Auditoría AI</span>
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
                                  className="text-[8px] bg-[#9b1c1c] text-white px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                                >
                                  <VisibilityIcon fontSize="inherit" />
                                  <span>Revelar</span>
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
        <p>© 2026 Portal de Fidelización. Diseñado para pequeños comercios y restaurantes.</p>
      </footer>

      {/* Code Modal */}
      {showCodeModal && modalCode && (
        <div className="fixed inset-0 bg-[#153e35]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#e8e1d5] rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#153e35] flex items-center justify-center text-white text-xl shadow-md shadow-[#153e35]/15">
              <CheckCircleIcon fontSize="large" />
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
                className="flex-1 py-3 bg-[#153e35] hover:bg-[#0f2e27] active:scale-95 text-white rounded-2xl text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <ContentCopyIcon fontSize="small" />
                <span>Copiar Código</span>
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#232d2a]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-[#e8e1d5] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
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
                      <span>{isUploadingLogo ? 'Subiendo a Storage...' : 'Cambiar Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingLogo}
                        className="hidden"
                        onChange={handleLogoFileUpload}
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
