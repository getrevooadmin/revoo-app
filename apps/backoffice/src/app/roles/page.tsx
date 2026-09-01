"use client";

import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useBusinessQuery } from '../../hooks/queries/useBusinessQuery';
import { SupabaseService, StaffAccount } from '../../lib/supabaseService';
import Header from '../../components/Header';
import ToastNotification from '../../components/ToastNotification';
import BusinessInfoModal from '../../components/BusinessInfoModal';
import AccountSettingsModal from '../../components/AccountSettingsModal';
import RolesManagementModule from '../../components/RolesManagementModule';
import { useProfileQuery } from '../../hooks/queries/useProfileQuery';

export default function RolesPage() {
  const store = useDashboardStore();
  const { business, updateBusiness, uploadLogo } = useBusinessQuery();
  const selectedBusinessId = business?.id || null;

  const { profile: myProfile, hasPermission, isLoading: isLoadingProfile } = useProfileQuery();
  const hasAccess = hasPermission('manage_roles') || hasPermission('manage_users');

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      <ToastNotification notification={store.notification} />

      <Header
        business={business}
        onOpenBusinessInfo={() => store.setIsBusinessInfoOpen(true)}
        onOpenSettings={() => store.setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {!selectedBusinessId || isLoadingProfile ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            Cargando configuración de perfiles y roles...
          </div>
        ) : !hasAccess ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            Acceso Denegado: No tienes permisos para administrar perfiles o usuarios.
          </div>
        ) : (
          <RolesManagementModule
            businessId={selectedBusinessId}
            myProfile={myProfile}
            onShowToast={store.showToast}
          />
        )}
      </main>

      <BusinessInfoModal
        isOpen={store.isBusinessInfoOpen}
        onClose={() => store.setIsBusinessInfoOpen(false)}
        business={business}
        onSave={async (name, logoUrl, currencySymbol) => {
          if (selectedBusinessId) await updateBusiness({ businessId: selectedBusinessId, name, logoUrl, currencySymbol });
        }}
        onUploadLogo={async (base64) => {
          return selectedBusinessId ? await uploadLogo({ businessId: selectedBusinessId, base64Image: base64 }) : '';
        }}
      />

      <AccountSettingsModal
        isOpen={store.isSettingsOpen}
        onClose={() => store.setIsSettingsOpen(false)}
        onToast={store.showToast}
      />
    </div>
  );
}
