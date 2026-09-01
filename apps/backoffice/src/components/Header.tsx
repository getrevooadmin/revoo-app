"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ShieldIcon from '@mui/icons-material/Shield';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { useQueryClient } from '@tanstack/react-query';
import { useProfileQuery } from '../hooks/queries/useProfileQuery';

interface HeaderProps {
  business: { id: string; name: string; logo_url?: string | null } | null;
  onOpenBusinessInfo: () => void;
  onOpenSettings: () => void;
}

export default function Header({ business, onOpenBusinessInfo, onOpenSettings }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const { profile, hasPermission } = useProfileQuery();

  const userHandle = profile?.username ? `@${profile.username}` : profile?.email || '';
  const userName = profile?.alias || profile?.full_name || profile?.username || 'Usuario';
  const userRoleName = profile?.custom_role?.name || (profile?.custom_role?.is_system ? 'Administrador Global' : 'Colaborador');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    queryClient.clear();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="border-b border-[#e8e1d5] bg-white sticky top-0 z-40 py-2 sm:py-0 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4rem] sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
        
        {/* Left Branding & Navigation */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt="Logo"
                className="w-10 h-10 rounded-2xl object-cover border border-[#e8e1d5] shadow-xs bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-sm shadow-xs">
                {(business?.name || 'C')[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-extrabold text-primary leading-none">
                {business?.name || 'Cargando comercio...'}
              </h1>
              <p className="text-[10px] text-[#6b7773] font-semibold mt-0.5">Panel del Comercio</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 flex-wrap">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                pathname === '/'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-primary hover:bg-[#f2ece1]'
              }`}
            >
              <HomeIcon fontSize="inherit" />
              <span>Panel General</span>
            </Link>

            {hasPermission('manage_campaigns') && (
              <Link
                href="/campaigns"
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pathname === '/campaigns'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-primary hover:bg-[#f2ece1]'
                }`}
              >
                <CampaignIcon fontSize="inherit" />
                <span>Campañas</span>
              </Link>
            )}

            {hasPermission('generate_codes') && (
              <Link
                href="/codes"
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pathname === '/codes'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-primary hover:bg-[#f2ece1]'
                }`}
              >
                <ConfirmationNumberIcon fontSize="inherit" />
                <span>Códigos</span>
              </Link>
            )}

            {(hasPermission('manage_roles') || hasPermission('manage_users')) && (
              <Link
                href="/roles"
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pathname === '/roles'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-[#faf8f5] text-[#333d39] border border-[#e8e1d5] hover:text-primary hover:bg-[#f2ece1]'
                }`}
              >
                <ShieldIcon fontSize="inherit" />
                <span>Perfiles y Roles</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Action Menu */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="w-10 h-10 rounded-2xl bg-[#faf8f5] border border-[#e8e1d5] hover:border-primary flex items-center justify-center text-[#232d2a] cursor-pointer transition-all shadow-xs"
              title="Menú de Acciones"
            >
              <SettingsIcon fontSize="small" />
            </button>

            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-2 flex flex-col z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#e8e1d5] mb-1">
                  <p className="text-xs font-black text-dark">{userName || 'Usuario'}</p>
                  <p className="text-[11px] font-bold text-primary">{userRoleName || 'Colaborador'}</p>
                  <p className="text-[10px] text-[#6b7773] font-mono mt-0.5 truncate">{userHandle}</p>
                </div>

                {hasPermission('manage_settings') && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBusinessInfo();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#333d39] hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <BusinessIcon fontSize="small" />
                    <span>Información del Comercio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
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
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-red-700 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-2"
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
  );
}
