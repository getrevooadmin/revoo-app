"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevClockWidget() {
  const [mockDate, setMockDate] = useState<string>('2026-06-14T15:41:53');
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    fetchMockTime();
  }, []);

  const fetchMockTime = async () => {
    try {
      const res = await fetch('/api/dev/mock-time');
      if (res.ok) {
        const data = await res.json();
        // Convert ISO string back to local datetime-local format YYYY-MM-DDTHH:MM
        if (data.mockDate) {
          const date = new Date(data.mockDate);
          // Format as YYYY-MM-DDTHH:MM
          const offsetMs = date.getTimezoneOffset() * 60000;
          const localISO = new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
          setMockDate(localISO);
          setIsOverridden(data.isOverridden);
        }
      }
    } catch (err) {
      console.error('Error fetching mock time:', err);
    }
  };

  const handleSetTime = async (newDateTimeISO: string) => {
    try {
      const res = await fetch('/api/dev/mock-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockDate: newDateTimeISO }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsOverridden(data.isOverridden);
        // Refresh page so all tables and cards reload their state from the new backend time
        window.location.reload();
      }
    } catch (err) {
      console.error('Error updating mock time:', err);
    }
  };

  const handleAdvance24h = async () => {
    try {
      const res = await fetch('/api/dev/mock-time/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 24 }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsOverridden(data.isOverridden);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error advancing mock time:', err);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/dev/mock-time/reset', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsOverridden(data.isOverridden);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error resetting mock time:', err);
    }
  };

  const formattedMockDate = new Date(mockDate).toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans">
      {/* Closed Mini Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            isOverridden
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300 hover:border-indigo-500/60'
          }`}
          title="Reloj de Simulación (Dev-Only)"
        >
          <span>⏰</span>
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {isOverridden ? 'Time Overridden' : 'Simulated Time'}
          </span>
        </button>
      )}

      {/* Expanded Panel */}
      {isOpen && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 w-72 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span>⏰</span>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Simulador de Reloj (Dev)</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-xs p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Display Current Time */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fecha de Referencia</span>
              <span className="text-sm font-black font-mono text-indigo-400 mt-1 select-all">{formattedMockDate}</span>
              {isOverridden && (
                <span className="text-[8px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-900 mt-1.5 font-bold uppercase tracking-wider">
                  Override Activo
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAdvance24h}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow transition-all flex items-center justify-center gap-1"
              >
                ⏩ +24 Horas
              </button>
              <button
                type="button"
                disabled={!isOverridden}
                onClick={handleReset}
                className="py-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-350 disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                🔄 Restaurar
              </button>
            </div>

            {/* Manual Date Picker */}
            <div className="flex flex-col gap-1 border-t border-slate-800/60 pt-2.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ajuste Manual</label>
              <div className="flex gap-1.5 mt-1">
                <input
                  type="datetime-local"
                  value={mockDate}
                  onChange={(e) => setMockDate(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 font-bold focus:outline-none focus:border-indigo-500 transition-colors w-full cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSetTime(new Date(mockDate).toISOString())}
                  className="px-2.5 bg-indigo-650 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-[10px] cursor-pointer shadow transition-all flex items-center justify-center"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
