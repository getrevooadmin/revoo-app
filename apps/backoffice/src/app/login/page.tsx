"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  
  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
        setIsLoading(false);
        return;
      }

      setMessage({ text: '¡Sesión iniciada con éxito! Redirigiendo...', type: 'success' });
      
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err: any) {
      setMessage({ text: 'Error inesperado al iniciar sesión.', type: 'error' });
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      // 1. Call our custom API endpoint to handle transaction (Business + Auth User + Profile)
      const response = await fetch('/api/auth/register-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          fullName: regName,
          businessName: regBusinessName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.error || 'Error al registrar el comercio.', type: 'error' });
        setIsLoading(false);
        return;
      }

      // 2. Automically login the newly created user
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: regEmail,
        password: regPassword,
      });

      if (loginError) {
        setMessage({ text: 'Comercio creado. Por favor inicia sesión manualmente.', type: 'success' });
        setActiveTab('login');
        setIsLoading(false);
        return;
      }

      setMessage({ text: '¡Comercio registrado e inicio de sesión exitoso! Redirigiendo...', type: 'success' });
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err: any) {
      setMessage({ text: 'Error de red o servidor al intentar registrar.', type: 'error' });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
        setIsLoading(false);
        return;
      }

      setMessage({
        text: 'Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada.',
        type: 'success'
      });
      setForgotEmail('');
      setIsLoading(false);
    } catch (err: any) {
      setMessage({ text: 'Error de conexión al solicitar recuperación de contraseña.', type: 'error' });
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
          <h1 className="text-2xl font-black text-[#232d2a] tracking-tight">Revoo Merchant</h1>
          <p className="text-xs text-[#6b7773] mt-1 font-medium">B2B Loyalty & Consumer Feedback Insights</p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        {activeTab !== 'forgot' ? (
          <div className="flex bg-[#faf8f5] p-1 rounded-2xl border border-[#e8dfce] mb-6">
            <button
              onClick={() => { setActiveTab('login'); setMessage(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-[#153e35] text-white shadow-sm'
                  : 'text-[#6b7773] hover:text-[#232d2a]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setActiveTab('register'); setMessage(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-[#153e35] text-white shadow-sm'
                  : 'text-[#6b7773] hover:text-[#232d2a]'
              }`}
            >
              Registrar Comercio
            </button>
          </div>
        ) : (
          <div className="text-center mb-6 bg-[#faf8f5] p-3 rounded-2xl border border-[#e8dfce]">
            <h2 className="text-xs font-black text-[#232d2a] uppercase tracking-wider">Recuperar Contraseña</h2>
            <p className="text-[11px] text-[#6b7773] mt-1 font-medium">Restablece tu contraseña de acceso mediante correo electrónico.</p>
          </div>
        )}

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

        {/* Forms Switch */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@comercio.com"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setActiveTab('forgot'); setMessage(null); }}
                className="text-[10px] font-bold text-[#c49340] hover:underline hover:text-[#b08132] transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
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
                  <span>Iniciando Sesión...</span>
                </span>
              ) : 'Ingresar al Dashboard'}
            </button>
          </form>
        ) : activeTab === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Nombre Completo</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Nombre del Comercio</label>
              <input
                type="text"
                required
                value={regBusinessName}
                onChange={(e) => setRegBusinessName(e.target.value)}
                placeholder="La Pampa Steakhouse"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="propietario@comercio.com"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#faf8f5] border border-[#e8dfce] focus:border-[#153e35] rounded-xl px-4 py-3 text-xs text-[#232d2a] focus:outline-none transition-all duration-200 placeholder:text-[#a3b1ad]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#153e35] hover:bg-[#0f2e27] disabled:bg-[#a6b8b4] text-white rounded-2xl text-xs font-black shadow-md transition-all duration-200 cursor-pointer active:scale-98 mt-2 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Registrando e Iniciando...</span>
                </span>
              ) : 'Registrar Comercio'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#6b7773] mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="ejemplo@comercio.com"
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
                  <span>Enviando Instrucciones...</span>
                </span>
              ) : 'Enviar Instrucciones de Recuperación'}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('login'); setMessage(null); }}
              className="w-full text-center text-xs font-bold text-[#6b7773] hover:text-[#232d2a] transition-all cursor-pointer mt-4 border-none bg-none outline-none"
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
