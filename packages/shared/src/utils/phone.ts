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
