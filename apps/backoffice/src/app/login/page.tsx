"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'login' | 'staff' | 'register' | 'forgot'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [rememberBusiness, setRememberBusiness] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const savedBusiness = localStorage.getItem('revoo_remembered_business');
    if (savedBusiness) {
      setBusinessName(savedBusiness);
      setRememberBusiness(true);
    }
  }, []);

  const getErrorMessage = (err: any, fallback: string): string => {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    const msg = err.message || err.error_description || err.error;
    if (typeof msg === 'string' && msg !== '[object Object]') {
      if (msg.includes('Invalid login credentials')) {
        return 'El correo o la contraseña ingresados son incorrectos.';
      }
      if (
        msg.includes('Database error querying schema') ||
        msg.includes('unexpected_failure') ||
        msg.includes('Unable to process request') ||
        msg.includes('User not found')
      ) {
        return 'Esta cuenta no está registrada o las credenciales son incorrectas.';
      }
      return msg;
    }
    return fallback;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    queryClient.clear();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'El correo o la contraseña ingresados son incorrectos.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    queryClient.clear();

    if (rememberBusiness && businessName.trim()) {
      localStorage.setItem('revoo_remembered_business', businessName.trim());
    } else {
      localStorage.removeItem('revoo_remembered_business');
    }

    try {
      const res = await fetch('/api/auth/login-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, username: staffUsername, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales de colaborador inválidas.');

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password
      });
      if (loginError) throw loginError;

      router.push('/');
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Error al iniciar sesión como colaborador.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    queryClient.clear();

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
      setErrorMsg(getErrorMessage(err, 'Error al registrar comercio.'));
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
      setErrorMsg(getErrorMessage(err, 'Error al solicitar recuperación.'));
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
        <div className="flex bg-[#faf8f5] p-1 rounded-2xl border border-[#e8e1d5] mb-6 gap-0.5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'login' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'register' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
            }`}
          >
            Registrar Comercio
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'staff' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-dark'
            }`}
          >
            Colaboradores
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

        {/* Form Login Admin Global */}
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
              {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}

        {/* Form Login Staff / Colaboradores */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre o ID del Comercio</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Panadería San José"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="rememberBusiness"
                  checked={rememberBusiness}
                  onChange={(e) => setRememberBusiness(e.target.checked)}
                  className="w-4 h-4 text-primary accent-primary border-[#e8e1d5] rounded cursor-pointer"
                />
                <label htmlFor="rememberBusiness" className="text-xs font-bold text-[#6b7773] cursor-pointer select-none">
                  Recordar negocio
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Usuario / Alias de Colaborador</label>
              <input
                type="text"
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value)}
                placeholder="cajero1"
                required
                className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-dark focus:outline-none focus:border-primary font-mono"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? 'Iniciando Sesión...' : 'Entrar como Colaborador'}
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
