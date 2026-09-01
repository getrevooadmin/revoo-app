"use client";

import React from 'react';
import { useCampaignStore } from '../../stores/useCampaignStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useBusinessQuery } from '../../hooks/queries/useBusinessQuery';
import { useCampaignsQuery } from '../../hooks/queries/useCampaignsQuery';
import { useProfileQuery } from '../../hooks/queries/useProfileQuery';

import Header from '../../components/Header';
import ToastNotification from '../../components/ToastNotification';
import BusinessInfoModal from '../../components/BusinessInfoModal';
import AccountSettingsModal from '../../components/AccountSettingsModal';
import CampaignFormModal from '../../components/CampaignFormModal';

import CampaignIcon from '@mui/icons-material/Campaign';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function CampaignsPage() {
  const store = useCampaignStore();
  const dashStore = useDashboardStore();
  const { business, updateBusiness, uploadLogo } = useBusinessQuery();
  const selectedBusinessId = business?.id || null;

  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, isSaving } = useCampaignsQuery(selectedBusinessId);

  const handleEditClick = (campaign: any) => {
    store.setIsEditing(true);
    store.setEditingCampaignId(campaign.id);
    store.setFormTitle(campaign.title || '');
    store.setFormPrize(campaign.prize_description || '');
    store.setFormPoints(campaign.target_points ?? '');
    
    const rate = campaign.points_per_value_unit || 1;
    if (rate < 1 && rate > 0) {
      store.setFormPointsRewarded(1);
      store.setFormPointsBaseAmount(Math.round(1 / rate));
    } else {
      store.setFormPointsRewarded(rate);
      store.setFormPointsBaseAmount(1);
    }

    store.setFormDescription(campaign.description || '');
    store.setFormStatus(campaign.status || 'active');
    store.setFormTiers(campaign.tiers || []);
    store.setFormMultipliers(campaign.multipliers || []);

    if (campaign.end_date) {
      const endDateObj = new Date(campaign.end_date);
      if (endDateObj.getFullYear() >= 2099) {
        store.setFormNeverExpires(true);
        store.setFormExpiration('');
      } else {
        store.setFormNeverExpires(false);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}T${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}`;
        store.setFormExpiration(formatted);
      }
    } else {
      store.setFormNeverExpires(true);
      store.setFormExpiration('');
    }

    store.setShowFormMobile(true);
  };

  const handleToggleStatus = async (campaign: any) => {
    const newStatus = campaign.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCampaign(campaign.id, {
        status: newStatus
      });
      dashStore.showToast(`Campaña ${newStatus === 'active' ? 'activada' : 'desactivada'} correctamente`);
    } catch (err: any) {
      dashStore.showToast(err.message || 'Error al cambiar estado de la campaña', 'error');
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('¿Está seguro de eliminar esta campaña?')) return;
    try {
      await deleteCampaign(campaignId);
      dashStore.showToast('Campaña eliminada correctamente');
    } catch (err: any) {
      dashStore.showToast(err.message || 'Error al eliminar campaña', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.formPoints || Number(store.formPoints) <= 0) {
      dashStore.showToast('Por favor ingrese la Meta de Puntos (Premio Principal)', 'error');
      return;
    }
    if (!store.formPointsRewarded || Number(store.formPointsRewarded) <= 0) {
      dashStore.showToast('Por favor ingrese los Puntos a Otorgar', 'error');
      return;
    }
    if (!store.formPointsBaseAmount || Number(store.formPointsBaseAmount) <= 0) {
      dashStore.showToast('Por favor ingrese el Monto Consumido Base', 'error');
      return;
    }

    const rewarded = Number(store.formPointsRewarded) || 1;
    const base = Number(store.formPointsBaseAmount) || 1;
    const pointsPerValueUnit = rewarded / base;

    const existingCampaign = campaigns.find(c => c.id === store.editingCampaignId);

    const startDate = store.isEditing && existingCampaign?.start_date
      ? existingCampaign.start_date
      : new Date().toISOString();

    let endDate: string;
    if (store.formNeverExpires) {
      endDate = new Date('2099-12-31T23:59:59Z').toISOString();
    } else if (store.formExpiration) {
      const expDate = new Date(store.formExpiration);
      if (isNaN(expDate.getTime()) || expDate <= new Date(startDate)) {
        const fallbackEnd = new Date(startDate);
        fallbackEnd.setFullYear(fallbackEnd.getFullYear() + 1);
        endDate = fallbackEnd.toISOString();
      } else {
        endDate = expDate.toISOString();
      }
    } else {
      const fallbackEnd = new Date(startDate);
      fallbackEnd.setFullYear(fallbackEnd.getFullYear() + 1);
      endDate = fallbackEnd.toISOString();
    }

    const sortedTiers = [...store.formTiers].sort((a, b) => a.target_points - b.target_points);
    const payload = {
      title: store.formTitle.trim(),
      prize_description: store.formPrize.trim(),
      target_points: Number(store.formPoints),
      points_per_value_unit: pointsPerValueUnit,
      description: store.formDescription.trim(),
      status: store.formStatus,
      start_date: startDate,
      end_date: endDate,
      tiers: sortedTiers,
      multipliers: store.formMultipliers
    };

    try {
      if (store.isEditing && store.editingCampaignId) {
        await updateCampaign(store.editingCampaignId, payload);
        dashStore.showToast('Campaña actualizada con éxito');
      } else {
        await createCampaign(payload);
        dashStore.showToast('Campaña creada con éxito');
      }
      store.resetForm();
      store.setShowFormMobile(false);
    } catch (err: any) {
      dashStore.showToast(err.message || 'Error al guardar campaña', 'error');
    }
  };

  const displayedCampaigns = campaigns.filter(c => {
    if (store.filter === 'active') return c.status === 'active';
    if (store.filter === 'inactive') return c.status === 'inactive';
    return true;
  });

  const { hasPermission, isLoading: isCheckingPerms } = useProfileQuery();
  const hasAccess = hasPermission('manage_campaigns');

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col antialiased font-sans">
      <ToastNotification notification={dashStore.notification} />

      <Header
        business={business}
        onOpenBusinessInfo={() => dashStore.setIsBusinessInfoOpen(true)}
        onOpenSettings={() => dashStore.setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {isCheckingPerms ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            Verificando permisos de acceso...
          </div>
        ) : !hasAccess ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
            Acceso Denegado: No tienes permisos para administrar campañas.
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">Administración de Campañas</span>
                <h2 className="text-2xl font-black text-dark flex items-center gap-2 mt-1">
                  <CampaignIcon className="text-primary" fontSize="large" />
                  <span>{business?.name || 'Comercio'}</span>
                </h2>
                <p className="text-sm text-[#6b7773] mt-1 font-medium">
                  Crea, edita y gestiona tus campañas de fidelización, niveles de premios y multiplicadores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  store.resetForm();
                  store.setShowFormMobile(true);
                }}
                className="px-5 py-3 bg-primary hover:bg-primary-hover active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <AddIcon fontSize="small" />
                <span>Crear Nueva Campaña</span>
              </button>
            </div>

        {/* Campaign List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCampaigns.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      c.status === 'active'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-extrabold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 font-semibold'
                    }`}
                    title={`Cambiar a ${c.status === 'active' ? 'Inactiva' : 'Activa'}`}
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {c.status === 'active' ? 'Activa' : 'Inactiva'}
                    </span>

                    {/* Switch Track */}
                    <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                      c.status === 'active' ? 'bg-[#153e35]' : 'bg-gray-300'
                    }`}>
                      {/* Switch Knob */}
                      <div className={`bg-white w-3 h-3 rounded-full shadow-xs transform transition-transform duration-200 ease-in-out ${
                        c.status === 'active' ? 'translate-x-3' : 'translate-x-0'
                      }`} />
                    </div>
                  </button>
                  <span className="text-xs font-black font-mono text-primary">{c.target_points} Pts</span>
                </div>
                <h3 className="text-base font-extrabold text-dark">{c.title || 'Campaña de Lealtad'}</h3>
                <p className="text-xs text-[#6b7773] mt-1 font-medium">{c.prize_description}</p>
                {c.tiers && c.tiers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#e8e1d5] flex flex-wrap gap-1">
                    {c.tiers.map((t: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-lg text-[10px] font-bold text-dark">
                        {t.icon || '⭐️'} {t.target_points} Pts
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#e8e1d5]">
                <button
                  type="button"
                  onClick={() => handleEditClick(c)}
                  className="flex-1 py-2 bg-primary-light hover:bg-[#e2f2ec] text-primary font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <EditIcon fontSize="small" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all cursor-pointer"
                  title="Eliminar"
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </main>

      <CampaignFormModal
        isOpen={store.showFormMobile}
        onClose={() => store.setShowFormMobile(false)}
        isEditing={store.isEditing}
        formTitle={store.formTitle}
        setFormTitle={store.setFormTitle}
        formPrize={store.formPrize}
        setFormPrize={store.setFormPrize}
        formPoints={store.formPoints}
        setFormPoints={store.setFormPoints}
        formPointsRewarded={store.formPointsRewarded}
        setFormPointsRewarded={store.setFormPointsRewarded}
        formPointsBaseAmount={store.formPointsBaseAmount}
        setFormPointsBaseAmount={store.setFormPointsBaseAmount}
        formExpiration={store.formExpiration}
        setFormExpiration={store.setFormExpiration}
        formNeverExpires={store.formNeverExpires}
        setFormNeverExpires={store.setFormNeverExpires}
        formDescription={store.formDescription}
        setFormDescription={store.setFormDescription}
        formStatus={store.formStatus}
        setFormStatus={store.setFormStatus}
        formTiers={store.formTiers}
        setFormTiers={store.setFormTiers}
        formMultipliers={store.formMultipliers}
        setFormMultipliers={store.setFormMultipliers}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        currencySymbol={business?.currency_symbol || '$'}
      />

      <BusinessInfoModal
        isOpen={dashStore.isBusinessInfoOpen}
        onClose={() => dashStore.setIsBusinessInfoOpen(false)}
        business={business}
        onSave={async (name, logoUrl, currencySymbol) => {
          if (selectedBusinessId) await updateBusiness({ businessId: selectedBusinessId, name, logoUrl, currencySymbol });
        }}
        onUploadLogo={async (base64) => {
          return selectedBusinessId ? await uploadLogo({ businessId: selectedBusinessId, base64Image: base64 }) : '';
        }}
      />

      <AccountSettingsModal
        isOpen={dashStore.isSettingsOpen}
        onClose={() => dashStore.setIsSettingsOpen(false)}
        onToast={dashStore.showToast}
      />
    </div>
  );
}
