"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import LockIcon from '@mui/icons-material/Lock';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push('/login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="text-center max-w-sm mb-6">
        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
          <LockIcon fontSize="medium" />
        </div>
        <h1 className="text-2xl font-black text-primary tracking-tight">Nueva Contraseña</h1>
        <p className="text-xs text-[#6b7773] mt-1 font-medium">Ingresa tu nueva clave de acceso</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#e8e1d5] shadow-xs p-6 sm:p-8">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? 'Actualizando...' : 'Restablecer Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
