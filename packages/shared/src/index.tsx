import React, { useState, useEffect } from 'react';

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
  
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const lang = navigator.language || '';

  if (timeZone.includes('Managua') || lang.includes('NI')) {
    return countriesList.find(c => c.code === 'NI') || defaultCountry;
  }
  if (timeZone.includes('America/New_York') || timeZone.includes('America/Los_Angeles') || lang.includes('en-US')) {
    return countriesList.find(c => c.code === 'US') || defaultCountry;
  }
  if (timeZone.includes('Mexico') || lang.includes('MX')) {
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
