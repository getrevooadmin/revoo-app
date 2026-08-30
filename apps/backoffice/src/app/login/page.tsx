"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales inválidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, businessName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar comercio');

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar comercio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg('Te hemos enviado un correo de recuperación.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al solicitar recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="text-center max-w-sm mb-6">
        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
          <StorefrontIcon fontSize="medium" />
        </div>
        <h1 className="text-2xl font-black text-primary tracking-tight">Portal de Comercio</h1>
        <p className="text-xs text-[#6b7773] mt-1 font-medium">Plataforma de Fidelización & Recompensas</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#e8e1d5] shadow-xs p-6 sm:p-8">
        
        {/* Nav Tabs */}
        <div className="flex bg-[#faf8f5] p-1 rounded-2xl border border-[#e8e1d5] mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'login' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'register' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
            }`}
          >
            Registrarse
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* Form Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@comercio.com"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setActiveTab('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? 'Iniciando Sesión...' : 'Entrar al Panel'}
            </button>
          </form>
        )}

        {/* Form Register */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Panadería San José"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Tu Nombre Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@comercio.com"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
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
              {isLoading ? 'Creando Cuenta...' : 'Crear Cuenta de Comercio'}
            </button>
          </form>
        )}

        {/* Form Forgot */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              Ingresa tu correo para recibir un enlace de recuperación de contraseña.
            </p>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@comercio.com"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
