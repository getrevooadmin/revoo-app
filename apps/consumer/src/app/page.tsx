"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Business {
  id: string;
  name: string;
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      {/* Main Container */}
      <div className="text-center max-w-md mb-6">
        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400">
          Feebli Portal
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Escanee el código QR en caja para acumular puntos o revisar sus recompensas.
        </p>
      </div>

      {/* Search Commerce Card */}
      <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.4)] p-6 sm:p-8 flex flex-col">
        <h3 className="font-black text-xl text-slate-100 text-center mb-2">
          Buscar Comercio
        </h3>
        <p className="text-xs text-slate-450 text-center mb-6 leading-relaxed">
          Busque y seleccione el comercio para registrar su visita o consultar sus sellos.
        </p>

        <div className="relative">
          <input
            type="text"
            placeholder="Escriba el nombre del comercio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <span className="absolute right-3.5 top-3.5 text-slate-600">🔍</span>
        </div>

        {/* Results List */}
        <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {filteredBusinesses.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-6">No se encontraron comercios.</p>
          ) : (
            filteredBusinesses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBusiness(b.id)}
                className="w-full text-left p-3.5 rounded-xl bg-slate-955 border border-slate-850 hover:border-slate-750 text-sm font-semibold text-slate-200 transition-all flex items-center justify-between hover:bg-slate-950 active:scale-[0.98] cursor-pointer"
              >
                <span>{b.name}</span>
                <span className="text-indigo-400 text-xs font-bold">Seleccionar →</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
