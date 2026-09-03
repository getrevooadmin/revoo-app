"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
}

export const countriesList: Country[] = [
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮', placeholder: '88888888' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '2025550123' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', placeholder: '5512345678' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', placeholder: '88888888' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹', placeholder: '55555555' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳', placeholder: '99999999' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻', placeholder: '70000000' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦', placeholder: '60000000' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', placeholder: '3001234567' }
];

export const defaultCountry = countriesList[0]; // NI default

export function parseE164Phone(fullPhone: string): { country: Country; nationalNumber: string } {
  if (!fullPhone) return { country: defaultCountry, nationalNumber: '' };
  
  // Clean characters except plus sign
  const cleaned = fullPhone.trim();
  
  // Sort countries by dialCode length descending to match longest code first (+505 before +50)
  const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (cleaned.startsWith(country.dialCode)) {
      const nationalNumber = cleaned.slice(country.dialCode.length).replace(/\D/g, '');
      return { country, nationalNumber };
    }
  }
  
  // Fallback: if no plus sign or unrecognised dialcode, return defaultCountry and digits only
  return { country: defaultCountry, nationalNumber: cleaned.replace(/\D/g, '') };
}

export function detectBrowserCountry(): Country {
  if (typeof window === 'undefined') return defaultCountry;
  
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toUpperCase();

    if (timeZone.includes('Managua') || lang.includes('NI')) {
      return countriesList.find(c => c.code === 'NI') || defaultCountry;
    }
    if (
      timeZone.includes('New_York') ||
      timeZone.includes('Chicago') ||
      timeZone.includes('Denver') ||
      timeZone.includes('Los_Angeles') ||
      timeZone.includes('Phoenix') ||
      timeZone.includes('Anchorage') ||
      timeZone.includes('Honolulu') ||
      lang.includes('US')
    ) {
      return countriesList.find(c => c.code === 'US') || defaultCountry;
    }
    if (timeZone.includes('Mexico') || timeZone.includes('Cancun') || timeZone.includes('Monterrey') || lang.includes('MX')) {
      return countriesList.find(c => c.code === 'MX') || defaultCountry;
    }
    if (timeZone.includes('Costa_Rica') || lang.includes('CR')) {
      return countriesList.find(c => c.code === 'CR') || defaultCountry;
    }
    if (timeZone.includes('Guatemala') || lang.includes('GT')) {
      return countriesList.find(c => c.code === 'GT') || defaultCountry;
    }
    if (timeZone.includes('Tegucigalpa') || lang.includes('HN')) {
      return countriesList.find(c => c.code === 'HN') || defaultCountry;
    }
    if (timeZone.includes('El_Salvador') || lang.includes('SV')) {
      return countriesList.find(c => c.code === 'SV') || defaultCountry;
    }
    if (timeZone.includes('Panama') || lang.includes('PA')) {
      return countriesList.find(c => c.code === 'PA') || defaultCountry;
    }
    if (timeZone.includes('Bogota') || lang.includes('CO')) {
      return countriesList.find(c => c.code === 'CO') || defaultCountry;
    }
  } catch (e) {
    console.warn('Error detecting browser country:', e);
  }
  
  return defaultCountry;
}

export function cleanPhoneInput(value: string): string {
  return value.replace(/\D/g, '');
}

// Reusable component extending HTML input props
interface PhoneInputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneInputField({ 
  value, 
  onChange, 
  className, 
  ...props 
}: PhoneInputFieldProps) {
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);

  useEffect(() => {
    if (!value) {
      const detected = detectBrowserCountry();
      setSelectedCountry(detected);
    } else {
      const { country } = parseE164Phone(value);
      setSelectedCountry(country);
    }
  }, []);

  useEffect(() => {
    if (value) {
      const { country } = parseE164Phone(value);
      setSelectedCountry(country);
    }
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const country = countriesList.find(c => c.code === code) || defaultCountry;
    setSelectedCountry(country);
    
    const { nationalNumber } = parseE164Phone(value);
    if (nationalNumber) {
      onChange(country.dialCode + nationalNumber);
    } else {
      onChange('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let cleaned = cleanPhoneInput(e.target.value);
    
    // Auto-switch country if user types/pastes country dial code
    const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sortedCountries) {
      const dialDigits = c.dialCode.replace(/\D/g, '');
      if (cleaned.startsWith(dialDigits) && cleaned.length > dialDigits.length) {
        cleaned = cleaned.slice(dialDigits.length);
        setSelectedCountry(c);
        break;
      }
    }
    
    // Limit national phone number digits to 12 max
    cleaned = cleaned.slice(0, 12);
    
    if (cleaned === '') {
      onChange('');
    } else {
      onChange(selectedCountry.dialCode + cleaned);
    }
  };

  const { nationalNumber } = parseE164Phone(value);

  return (
    <div className="flex gap-2 w-full items-center font-sans">
      <select 
        value={selectedCountry.code} 
        onChange={handleCountryChange}
        className="px-3 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] focus:outline-none focus:border-[#153e35] transition-all shrink-0 cursor-pointer min-w-[95px] h-[42px] text-center shadow-xs"
      >
        {countriesList.map(c => (
          <option key={c.code} value={c.code}>
            {c.code === 'NI' ? '🇳🇮' : 
             c.code === 'US' ? '🇺🇸' : 
             c.code === 'MX' ? '🇲🇽' : 
             c.code === 'CR' ? '🇨🇷' : 
             c.code === 'GT' ? '🇬🇹' : 
             c.code === 'HN' ? '🇭🇳' : 
             c.code === 'SV' ? '🇸🇻' : 
             c.code === 'PA' ? '🇵🇦' : 
             c.code === 'CO' ? '🇨🇴' : '🏳️'} {c.dialCode}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder={selectedCountry.placeholder}
        value={nationalNumber}
        onChange={handleChange}
        className={`flex-1 px-3.5 py-2.5 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs font-bold text-[#232d2a] font-mono focus:outline-none focus:border-[#153e35] transition-all h-[42px] shadow-xs ${className || ''}`}
        {...props}
      />
    </div>
  );
}

export function useMockTime(apiEndpoint: string = '/api/dev/mock-time') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mock-time'],
    queryFn: async () => {
      const res = await fetch(apiEndpoint);
      return res.json();
    },
    refetchInterval: 10000
  });

  const setMockTimeMutation = useMutation({
    mutationFn: async (mockDate: string) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockDate })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  const advanceMockTimeMutation = useMutation({
    mutationFn: async (hours: number = 24) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  const resetMockTimeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiEndpoint, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  return {
    mockTime: query.data?.mockDate || null,
    isOverridden: !!query.data?.isOverridden,
    isLoading: query.isLoading,
    isError: query.isError,
    setMockTime: setMockTimeMutation.mutateAsync,
    advanceMockTime: advanceMockTimeMutation.mutateAsync,
    resetMockTime: resetMockTimeMutation.mutateAsync
  };
}

export function DevClockWidget({ apiEndpoint = '/api/dev/mock-time' }: { apiEndpoint?: string }) {
  const { mockTime, isOverridden, setMockTime, advanceMockTime, resetMockTime } = useMockTime(apiEndpoint);
  const [localPickerDate, setLocalPickerDate] = useState<string>('2026-06-14T15:41:53');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (mockTime) {
      const date = new Date(mockTime);
      const offsetMs = date.getTimezoneOffset() * 60000;
      const localISO = new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
      setLocalPickerDate(localISO);
    }
  }, [mockTime]);

  const handleSetTime = async (newDateTimeISO: string) => {
    try {
      await setMockTime(newDateTimeISO);
      window.location.reload();
    } catch (err) {
      console.error('Error updating mock time:', err);
    }
  };

  const handleAdvance24h = async () => {
    try {
      await advanceMockTime(24);
      window.location.reload();
    } catch (err) {
      console.error('Error advancing mock time:', err);
    }
  };

  const handleReset = async () => {
    try {
      await resetMockTime();
      window.location.reload();
    } catch (err) {
      console.error('Error resetting mock time:', err);
    }
  };

  const formattedMockDate = mockTime ? new Date(mockTime).toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Cargando...';

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
                  value={localPickerDate}
                  onChange={(e) => setLocalPickerDate(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 font-bold focus:outline-none focus:border-indigo-500 transition-colors w-full cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSetTime(new Date(localPickerDate).toISOString())}
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

