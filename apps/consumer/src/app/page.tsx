"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StorefrontIcon from '@mui/icons-material/Storefront';

interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
}

export default function ConsumerSearchPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch businesses on load
  useEffect(() => {
    fetch('/api/businesses')
      .then(res => res.json())
      .then((data: Business[]) => {
        setBusinesses(data);
      })
      .catch(err => console.error('Error fetching businesses:', err));
  }, []);

  const handleSelectBusiness = (id: string) => {
    router.push(`/${id}`);
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#232d2a] flex flex-col items-center justify-center p-4 sm:p-6 antialiased font-sans">
      {/* Main Container */}
      <div className="text-center max-w-md mb-6">
        <h2 className="text-3xl font-extrabold text-[#153e35] tracking-tight flex items-center justify-center gap-2">
          <StorefrontIcon className="text-[#153e35]" fontSize="large" />
          <span>Portal de Recompensas</span>
        </h2>
        <p className="text-xs text-[#6b7773] mt-1.5 font-medium">
          Escanee el código QR en caja para acumular puntos o revisar sus recompensas.
        </p>
      </div>

      {/* Search Commerce Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#e8e1d5] shadow-[0_4px_25px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col">
        <h3 className="font-extrabold text-xl text-[#232d2a] text-center mb-1">
          Buscar Comercio
        </h3>
        <p className="text-xs text-[#6b7773] text-center mb-6 leading-relaxed">
          Busque y seleccione el comercio para registrar su visita o consultar sus sellos.
        </p>

        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Escriba el nombre del comercio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#faf8f5] border border-[#e2d8c7] rounded-2xl pl-4 pr-10 py-3.5 text-sm text-[#232d2a] placeholder-[#9c9384] focus:bg-white focus:outline-none focus:border-[#153e35] transition-all shadow-inner font-medium"
          />
          <SearchIcon className="absolute right-3.5 text-[#9c9384]" fontSize="small" />
        </div>

        {/* Results List */}
        <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {filteredBusinesses.length === 0 ? (
            <p className="text-xs text-[#9c9384] text-center py-6">No se encontraron comercios.</p>
          ) : (
            filteredBusinesses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBusiness(b.id)}
                className="w-full text-left p-3.5 rounded-2xl bg-[#faf8f5] border border-[#e8e1d5] hover:border-[#c49340] text-sm font-bold text-[#232d2a] transition-all flex items-center justify-between hover:bg-[#fcfaf5] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  {b.logo_url && (
                    <img
                      src={b.logo_url}
                      alt="Logo"
                      className="w-6 h-6 rounded-lg object-cover border border-[#e8e1d5]"
                    />
                  )}
                  <span>{b.name}</span>
                </div>
                <span className="text-[#c49340] text-xs font-extrabold flex items-center gap-1">
                  <span>Seleccionar</span>
                  <ArrowForwardIcon fontSize="small" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
