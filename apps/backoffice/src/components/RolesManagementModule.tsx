"use client";

import React, { useState, useEffect } from 'react';
import { SupabaseService, Role, StaffAccount, Permission } from '../lib/supabaseService';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface RolesManagementModuleProps {
  businessId: string;
  myProfile: StaffAccount | null;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

const ALL_PERMISSIONS: { id: Permission; label: string; description: string }[] = [
  { id: 'manage_roles', label: 'Configurar Roles y Permisos', description: 'Crear, editar y administrar permisos del sistema' },
  { id: 'manage_users', label: 'Crear y Asignar Cuentas', description: 'Crear cuentas de colaboradores con usuario y contraseña' },
  { id: 'manage_campaigns', label: 'Administrar Campañas', description: 'Crear, activar y pausar campañas de fidelización' },
  { id: 'generate_codes', label: 'Generar Códigos / QR', description: 'Generar códigos de compra para acumulación de puntos' },
  { id: 'redeem_prizes', label: 'Canje Directo de Premios', description: 'Consultar saldo y validar PIN de 4 dígitos para canjes' },
  { id: 'view_analytics', label: 'Ver Métricas e Histórico', description: 'Visualizar tabla de interacciones y reportes de uso' },
  { id: 'manage_settings', label: 'Perfil del Comercio', description: 'Modificar nombre comercial, logo y ajustes del negocio' }
];

export default function RolesManagementModule({
  businessId,
  myProfile,
  onShowToast
}: RolesManagementModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'roles'>('accounts');
  const [roles, setRoles] = useState<Role[]>([]);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Form states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);

  // Account Form
  const [username, setUsername] = useState('');
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // Role Form
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rData, aData] = await Promise.all([
        SupabaseService.getRoles(businessId),
        SupabaseService.getStaffAccounts(businessId)
      ]);
      setRoles(rData);
      setAccounts(aData);
      if (rData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rData[0].id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error al cargar roles y perfiles', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Create Account Modal
  const handleOpenCreateAccount = () => {
    setEditingAccount(null);
    setUsername('');
    setAlias('');
    setPassword('');
    if (roles.length > 0) setSelectedRoleId(roles[0].id);
    setShowAccountModal(true);
  };

  // Open Edit Account Modal
  const handleOpenEditAccount = (account: StaffAccount) => {
    setEditingAccount(account);
    setUsername(account.username || '');
    setAlias(account.alias || account.full_name || '');
    setPassword('');
    setSelectedRoleId(account.custom_role_id || (roles.length > 0 ? roles[0].id : ''));
    setShowAccountModal(true);
  };

  // Submit Create or Edit Staff Account
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAccount(true);
    try {
      if (editingAccount) {
        await SupabaseService.updateStaffAccount(
          editingAccount.id,
          username,
          alias,
          password,
          selectedRoleId
        );
        onShowToast(`Cuenta de ${alias || username} actualizada exitosamente.`);
      } else {
        const res = await fetch('/api/auth/manage-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            username,
            alias,
            password,
            roleId: selectedRoleId
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear colaborador');

        onShowToast(`Cuenta @${username} creada exitosamente.`);
      }

      setShowAccountModal(false);
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Error al guardar cuenta', 'error');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Delete Staff Account
  const handleDeleteAccount = async (account: StaffAccount) => {
    if (account.custom_role?.is_system) {
      onShowToast('El Administrador Global principal no puede ser eliminado.', 'error');
      return;
    }
    if (!confirm(`¿Eliminar la cuenta de @${account.username || account.alias}?`)) return;

    try {
      const res = await fetch(`/api/auth/manage-staff?id=${account.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar cuenta');

      onShowToast('Cuenta de colaborador eliminada.');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Error al eliminar cuenta', 'error');
    }
  };

  // Open Create Role Modal
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions(['generate_codes', 'redeem_prizes']);
    setShowRoleModal(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions || []);
    setShowRoleModal(true);
  };

  // Toggle Permission Checkbox
  const handleTogglePermission = (permId: Permission) => {
    // Safety Rule: Global admin role cannot uncheck 'manage_roles'
    if (editingRole?.is_system && permId === 'manage_roles') {
      onShowToast('El permiso de Configurar Roles es inmutable para el Administrador Global.', 'error');
      return;
    }

    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // Submit Role Create / Update
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRole(true);
    try {
      if (editingRole) {
        await SupabaseService.updateRole(
          editingRole.id,
          roleName,
          roleDescription,
          selectedPermissions,
          editingRole.is_system
        );
        onShowToast(`Rol "${roleName}" actualizado.`);
      } else {
        await SupabaseService.createRole(
          businessId,
          roleName,
          roleDescription,
          selectedPermissions
        );
        onShowToast(`Rol "${roleName}" creado.`);
      }
      setShowRoleModal(false);
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Error al guardar rol', 'error');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      onShowToast('No se pueden eliminar los roles del sistema.', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return;

    try {
      await SupabaseService.deleteRole(role.id);
      onShowToast(`Rol "${role.name}" eliminado.`);
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Error al eliminar rol', 'error');
    }
  };

  const myPerms = myProfile?.custom_role?.permissions;
  const canManageUsers = !myPerms || myPerms.includes('global_admin') || myPerms.includes('manage_users');
  const canManageRoles = !myPerms || myPerms.includes('global_admin') || myPerms.includes('manage_roles');

  return (
    <div className="space-y-6 font-sans antialiased">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-dark flex items-center gap-2">
            <ShieldIcon className="text-primary" />
            <span>Gestión de Perfiles, Cuentas y Roles</span>
          </h2>
          <p className="text-xs text-[#6b7773] mt-1 font-medium">
            Administra perfiles de colaboradores, crea cuentas de acceso y configura permisos granulares.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex bg-[#faf8f5] p-1 rounded-2xl border border-[#e8e1d5] shrink-0">
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveSubTab('accounts')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeSubTab === 'accounts' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
              }`}
            >
              Cuentas ({accounts.length})
            </button>
          )}
          {canManageRoles && (
            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeSubTab === (canManageUsers ? 'roles' : 'roles') ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
              }`}
            >
              Catálogo de Roles ({roles.length})
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#e8e1d5] text-center text-xs font-bold text-gray-500">
          Cargando perfiles y roles...
        </div>
      ) : activeSubTab === 'accounts' ? (
        
        /* ACCOUNTS SUBTAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-dark uppercase tracking-wider">Cuentas de Colaboradores</h3>
            <button
              type="button"
              onClick={handleOpenCreateAccount}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <PersonAddIcon fontSize="small" />
              <span>Crear Cuenta de Colaborador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => {
              const isSystemAdmin = acc.custom_role?.is_system;

              return (
                <div key={acc.id} className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isSystemAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-primary-light text-primary border border-primary-border'
                      }`}>
                        {acc.alias ? acc.alias.charAt(0).toUpperCase() : acc.username ? acc.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-dark flex items-center gap-1.5">
                          <span>{acc.alias || acc.full_name || 'Sin Alias'}</span>
                        </h4>
                        <p className="text-xs text-gray-500 font-mono">@{acc.username || acc.email.split('@')[0]}</p>
                      </div>
                    </div>

                    {isSystemAdmin ? (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-xl border border-amber-300 flex items-center gap-1">
                        <LockIcon className="text-[12px]" />
                        <span>Admin Global</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light rounded-xl transition-all cursor-pointer"
                          title="Editar Cuenta"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Eliminar Cuenta"
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#e8e1d5] flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold">Rol Asignado:</span>
                    <span className="font-extrabold text-primary bg-primary-light px-2.5 py-0.5 rounded-lg border border-primary-border">
                      {acc.custom_role?.name || (isSystemAdmin ? 'Administrador Global' : 'Colaborador')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        
        /* ROLES SUBTAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-dark uppercase tracking-wider">Catálogo de Roles y Permisos</h3>
            <button
              type="button"
              onClick={handleOpenCreateRole}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <AddModeratorIcon fontSize="small" />
              <span>Crear Nuevo Rol</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="bg-white p-5 rounded-3xl border border-[#e8e1d5] shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-dark flex items-center gap-2">
                      <span>{role.name}</span>
                      {role.is_system && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-300">
                          Sistema
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">{role.description || 'Sin descripción'}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(role)}
                      className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light rounded-xl transition-all cursor-pointer"
                      title="Editar Permisos"
                    >
                      <EditIcon fontSize="small" />
                    </button>
                    {!role.is_system && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Rol"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Permisos Habilitados ({role.permissions?.length || 0}):</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_PERMISSIONS.map(p => {
                      const hasPerm = role.permissions?.includes('global_admin') || role.permissions?.includes(p.id);
                      return (
                        <span
                          key={p.id}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                            hasPerm
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60'
                          }`}
                        >
                          {hasPerm ? '✓' : '✗'} {p.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl border border-[#e8e1d5] shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-dark flex items-center gap-2">
              <BadgeIcon className="text-primary" />
              <span>{editingAccount ? `Editar Cuenta: @${editingAccount.username || editingAccount.alias}` : 'Crear Cuenta de Colaborador'}</span>
            </h3>

            <form onSubmit={handleAccountSubmit} autoComplete="off" className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  name="new-staff-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cajero1"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Alias / Nombre del Colaborador</label>
                <input
                  type="text"
                  name="new-staff-alias"
                  autoComplete="off"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Carlos Pérez - Cajero Turno Mañana"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">
                  {editingAccount ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
                </label>
                <input
                  type="password"
                  name="new-staff-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingAccount ? 'Dejar en blanco para mantener contraseña actual' : 'Mínimo 6 caracteres'}
                  required={!editingAccount}
                  minLength={password ? 6 : undefined}
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Rol Asignado</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-3 border border-[#e8e1d5] font-bold text-gray-600 rounded-2xl text-xs hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  {isSubmittingAccount ? 'Guardando...' : editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-[#e8e1d5] shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-dark flex items-center gap-2">
              <AddModeratorIcon className="text-primary" />
              <span>{editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol Personalizado'}</span>
            </h3>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre del Rol</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Ej: Gerente de Tienda, Cajero, Supervisor"
                  required
                  disabled={editingRole?.is_system}
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Descripción</label>
                <input
                  type="text"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Breve explicación de las funciones de este rol"
                  className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-2">Permisos Granulares</label>
                
                {editingRole?.is_system && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <LockIcon fontSize="small" className="text-amber-700" />
                    <span>El permiso de Configurar Roles permanece bloqueado e inmutable para el Administrador Global (protección antibucle).</span>
                  </div>
                )}

                <div className="space-y-2 border border-[#e8e1d5] p-3 rounded-2xl bg-[#faf8f5]">
                  {ALL_PERMISSIONS.map(p => {
                    const isChecked = selectedPermissions.includes(p.id);
                    const isLocked = editingRole?.is_system && p.id === 'manage_roles';

                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                          isChecked ? 'bg-white border border-primary-border shadow-xs' : 'hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => handleTogglePermission(p.id)}
                          className="mt-0.5 accent-emerald-600 rounded cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-extrabold text-dark flex items-center gap-1">
                            <span>{p.label}</span>
                            {isLocked && <span className="text-[10px] text-amber-800 font-bold">(Inmutable)</span>}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium">{p.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-3 border border-[#e8e1d5] font-bold text-gray-600 rounded-2xl text-xs hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  {isSubmittingRole ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
