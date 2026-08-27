"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Verify recovery session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        setMessage({ 
          text: 'Sesión de recuperación no encontrada o expirada. Por favor solicita un nuevo enlace desde la página de inicio de sesión.', 
          type: 'error' 
        });
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
        setIsLoading(false);
        return;
      }

      setMessage({ 
        text: '¡Tu contraseña ha sido restablecida con éxito! Redirigiendo a la pantalla de inicio de sesión...', 
        type: 'success' 
      });
      
      // Sign out the recovery session
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setMessage({ text: 'Error inesperado al intentar restablecer la contraseña.', type: 'error' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 font-sans selection:bg-[#c49340] selection:text-white">
      {/* Background soft blur shapes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#e8dfce]/40 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#c49340]/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-white rounded-[32px] border border-[#e8e1d5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 relative overflow-hidden transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-[#153e35] rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <span className="text-white font-extrabold text-xl tracking-tight">R</span>
          </div>
          <h1 className="text-2xl font-black text-[#232d2a] tracking-tight">Restablecer Contraseña</h1>
          <p className="text-xs text-[#6b7773] mt-1 font-medium font-sans">Establece tu nueva contraseña de acceso para Revoo Merchant</p>
        </div>

        {/* Global Notifications Panel */}
        {message && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-bold border transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-[#e7f3f0] text-[#153e35] border-[#bfe2d9]'
              : 'bg-[#fdf3f2] text-[#b32b1e] border-[#f9d7d5]'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form Container */}
        {hasSession ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Confirmar Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#c49340] hover:bg-[#b08132] disabled:bg-[#d8c29e] text-white rounded-2xl text-xs font-black shadow-md transition-all duration-200 cursor-pointer active:scale-98 mt-2 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando Contraseña...</span>
                </span>
              ) : 'Establecer Contraseña'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] text-white rounded-2xl text-xs font-black shadow-md transition-all duration-200 cursor-pointer text-center"
          >
            Ir al Inicio de Sesión
          </button>
        )}
      </div>
    </div>
  );
}
