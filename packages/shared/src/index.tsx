import React, { useState, useEffect } from 'react';

export interface CountryConfig {
  code: string;       // Country Code (e.g. 'US', 'NI')
  dialCode: string;   // Dial code (e.g. '+1', '+505')
  placeholder: string;// Placeholder text (e.g. 'Ej: 8888-8888')
  tzKeywords: string[]; // Timezone keywords (e.g. ['Managua'])
}

export const countriesList: CountryConfig[] = [
  { code: 'NI', dialCode: '+505', placeholder: 'Ej: 8888-8888', tzKeywords: ['Managua', 'Nicaragua'] },
  { code: 'US', dialCode: '+1', placeholder: 'Ej: (555) 000-0000', tzKeywords: ['New_York', 'Chicago', 'Los_Angeles', 'Denver', 'Phoenix', 'Anchorage', 'Honolulu'] },
  { code: 'MX', dialCode: '+52', placeholder: 'Ej: 55 1234 5678', tzKeywords: ['Mexico', 'Cancun', 'Merida', 'Monterrey', 'Tijuana', 'Hermosillo', 'Chihuahua'] },
  { code: 'CR', dialCode: '+506', placeholder: 'Ej: 8888-8888', tzKeywords: ['Costa_Rica', 'San_Jose'] },
  { code: 'GT', dialCode: '+502', placeholder: 'Ej: 5555-5555', tzKeywords: ['Guatemala'] },
  { code: 'HN', dialCode: '+504', placeholder: 'Ej: 9999-9999', tzKeywords: ['Tegucigalpa'] },
  { code: 'SV', dialCode: '+503', placeholder: 'Ej: 7777-7777', tzKeywords: ['El_Salvador', 'San_Salvador'] },
  { code: 'PA', dialCode: '+507', placeholder: 'Ej: 6666-6666', tzKeywords: ['Panama'] },
  { code: 'CO', dialCode: '+57', placeholder: 'Ej: 300 123 4567', tzKeywords: ['Bogota'] },
];

export const defaultCountry = countriesList.find(c => c.code === 'NI')!;

// Detect country code based on browser locale or timezone
export function detectBrowserCountry(): CountryConfig {
  if (typeof window === 'undefined') return defaultCountry;
  
  // 1. Try matching country from timezone (most accurate physical location)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const tzMatch = countriesList.find(c => 
        c.tzKeywords.some(keyword => tz.toLowerCase().includes(keyword.toLowerCase()))
      );
      if (tzMatch) return tzMatch;
    }
  } catch (e) {}

  // 2. Try browser languages (locale)
  const langs = navigator.languages || [navigator.language || ''];
  for (const lang of langs) {
    if (!lang) continue;
    const parts = lang.split('-');
    if (parts.length > 1) {
      const cc = parts[1].toUpperCase();
      const matched = countriesList.find(c => c.code === cc);
      if (matched) return matched;
    }
  }
  
  return defaultCountry;
}

// Parse full phone number to extract country config and national number
export function parseE164Phone(value: string): { country: CountryConfig; nationalNumber: string } {
  if (!value) return { country: defaultCountry, nationalNumber: '' };
  
  // Sort by dialCode length descending to match longest dialCode first
  const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sortedCountries) {
    if (value.startsWith(country.dialCode)) {
      return {
        country,
        nationalNumber: value.slice(country.dialCode.length)
      };
    }
    const codeNoPlus = country.dialCode.replace('+', '');
    if (value.startsWith(codeNoPlus)) {
      return {
        country,
        nationalNumber: value.slice(codeNoPlus.length)
      };
    }
  }
  
  return { country: defaultCountry, nationalNumber: value.replace(/^\+/, '') };
}

// Clean phone input by keeping only digits
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
    <div className="flex gap-2 w-full items-center">
      <select 
        value={selectedCountry.code} 
        onChange={handleCountryChange}
        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shrink-0 cursor-pointer min-w-[95px] h-[38px] text-center"
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
        className={`${className} flex-1 h-[38px]`}
        {...props}
      />
    </div>
  );
}
