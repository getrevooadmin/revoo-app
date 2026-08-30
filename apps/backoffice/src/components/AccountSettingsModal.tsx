"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AccountSettingsModal({ isOpen, onClose, onToast }: AccountSettingsModalProps) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword('');
      setConfirmPassword('');
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setFullName(user.user_metadata?.full_name || '');
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const updates: any = {};
      if (fullName.trim()) {
        updates.data = { full_name: fullName.trim() };
      }

      if (password) {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          setIsSaving(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setIsSaving(false);
          return;
        }
        updates.password = password;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        setIsSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }

      onToast('Ajustes de cuenta actualizados con éxito');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar cuenta');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-md w-full shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-3 mb-4">
          <div className="flex items-center gap-2 text-primary">
            <SettingsIcon fontSize="medium" />
            <h3 className="text-base font-extrabold text-dark">Ajustes de Cuenta</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="border-t border-[#e8e1d5] pt-3">
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nueva Contraseña (Opcional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all mb-2"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nueva contraseña"
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e1d5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <SaveIcon fontSize="small" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
