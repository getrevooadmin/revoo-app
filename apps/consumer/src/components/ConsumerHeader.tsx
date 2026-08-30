"use client";

import React, { useState, useRef, useEffect } from 'react';
import StorefrontIcon from '@mui/icons-material/Storefront';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface ConsumerHeaderProps {
  businesses: { id: string; name: string; logo_url?: string | null }[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
}

export default function ConsumerHeader({
  businesses,
  selectedBusinessId,
  onSelectBusiness
}: ConsumerHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || businesses[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <header className="border-b border-[#e8e1d5] bg-white sticky top-0 z-40 py-2 sm:py-0 shadow-xs font-sans">
      <div className="max-w-md mx-auto px-4 min-h-[4rem] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {currentBusiness?.logo_url ? (
            <img
              src={currentBusiness.logo_url}
              alt="Logo"
              className="w-9 h-9 rounded-2xl object-cover border border-[#e8e1d5] shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-xs shadow-xs">
              {(currentBusiness?.name || 'C')[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-sm font-extrabold text-primary leading-tight">
              {currentBusiness?.name || 'Comercio'}
            </h1>
            <p className="text-[10px] text-[#6b7773] font-semibold">Club de Recompensas</p>
          </div>
        </div>

        {/* Business Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 bg-[#faf8f5] hover:bg-[#f2ece1] border border-[#e8e1d5] rounded-xl text-xs font-extrabold text-dark flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          >
            <StorefrontIcon fontSize="small" className="text-primary" />
            <span className="max-w-[100px] truncate">{currentBusiness?.name || 'Cambiar'}</span>
            <KeyboardArrowDownIcon fontSize="small" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e8e1d5] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar comercio..."
                className="w-full px-3 py-1.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-xl text-xs font-bold text-dark focus:outline-none focus:border-primary mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBusiness(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      b.id === selectedBusinessId ? 'bg-primary-light text-primary font-black' : 'hover:bg-[#faf8f5] text-dark'
                    }`}
                  >
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
