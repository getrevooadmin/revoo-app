"use client";

import React, { useState, useEffect } from 'react';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface BusinessInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: { id: string; name: string; slug?: string | null; logo_url?: string | null; currency_symbol?: string | null } | null;
  onSave: (name: string, logoUrl: string, currencySymbol: string, slug: string) => Promise<void>;
  onUploadLogo: (base64Data: string) => Promise<string>;
}

export default function BusinessInfoModal({
  isOpen,
  onClose,
  business,
  onSave,
  onUploadLogo
}: BusinessInfoModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && business) {
      setName(business.name || '');
      setSlug(business.slug || '');
      setLogoUrl(business.logo_url || '');
      setCurrencySymbol(business.currency_symbol || '$');
      setError(null);
    }
  }, [isOpen, business]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setLogoUrl(base64Data);
      setIsUploading(true);
      setError(null);

      try {
        const publicUrl = await onUploadLogo(base64Data);
        setLogoUrl(publicUrl);
      } catch (err: any) {
        setError(err.message || 'Error al subir el logo');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del comercio es obligatorio.');
      return;
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanSlug) {
      setError('El identificador del comercio es obligatorio (solo letras minúsculas, números, guiones y guiones bajos).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), logoUrl.trim(), currencySymbol.trim() || '$', cleanSlug);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#e8e1d5] p-6 max-w-md w-full shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[#e8e1d5] pb-3 mb-4">
          <div className="flex items-center gap-2 text-primary">
            <BusinessIcon fontSize="medium" />
            <h3 className="text-base font-extrabold text-dark">Información del Comercio</h3>
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
          {/* Logo upload */}
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-2">Logo del Comercio</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Preview"
                  className="w-16 h-16 rounded-2xl object-cover border border-[#e8e1d5] shadow-xs bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary-light border-2 border-dashed border-primary-border flex items-center justify-center text-primary font-black text-xl">
                  {name[0]?.toUpperCase() || 'C'}
                </div>
              )}

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#faf8f5] hover:bg-[#f2ece1] border border-[#e8e1d5] rounded-xl text-xs font-extrabold text-dark cursor-pointer transition-all shadow-xs">
                  <PhotoCameraIcon fontSize="small" className="text-primary" />
                  <span>{isUploading ? 'Subiendo...' : 'Cambiar Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <p className="text-[10px] text-gray-500">JPG, PNG o WebP. Tamaño recomendado 400x400.</p>
              </div>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Nombre Comercial</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Panadería San José"
              required
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Business Slug / Identifier */}
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">
              Identificador Único del Comercio (Usuario / Slug)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-sm select-none">@</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="ej: panaderia"
                required
                className="w-full pl-8 pr-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Tus colaboradores usarán este identificador corto para iniciar sesión rápidamente sin escribir el nombre largo.
            </p>
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-xs font-bold text-dark uppercase tracking-wider mb-1">Símbolo de Moneda</label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="Ej: C$, $, USD, EUR, MXN"
              required
              className="w-full px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-sm font-bold text-dark focus:outline-none focus:border-primary transition-all font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">Símbolo monetario usado en tickets y acumulaciones (ej: C$, $, USD).</p>
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
              disabled={isSaving || isUploading}
              className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <SaveIcon fontSize="small" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
