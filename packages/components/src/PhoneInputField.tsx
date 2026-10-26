"use client";

import React, { useState, useEffect } from 'react';
import {
  countriesList,
  defaultCountry,
  parseE164Phone,
  detectBrowserCountry,
  cleanPhoneInput
} from '@feebli/shared';

export interface PhoneInputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
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
