import React, { useState, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { COUNTRY_CODES, type CountryCodeOption, validatePhone } from '../../utils/validation';

interface PhoneInputProps {
  value: string; // Full string (e.g. "+94771234567" or "771234567")
  onChange: (fullPhoneNumber: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  darkBg?: boolean;
  error?: string | null;
}

export default function PhoneInput({
  value = '',
  onChange,
  label = 'Phone Number',
  placeholder = 'e.g. 771234567',
  required = false,
  className = '',
  darkBg = true,
  error: customError,
}: PhoneInputProps) {
  // Parse existing dial code if present
  const defaultOption = COUNTRY_CODES.find((c) => value.startsWith(c.dialCode)) || COUNTRY_CODES[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeOption>(defaultOption);
  
  // Extract number part without dialCode
  const initialLocalNumber = value.startsWith(selectedCountry.dialCode)
    ? value.slice(selectedCountry.dialCode.length).trim()
    : value.replace(/^\+\d+\s*/, '').trim();

  const [localNumber, setLocalNumber] = useState(initialLocalNumber);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync internal state if external value changes drastically
  useEffect(() => {
    const matched = COUNTRY_CODES.find((c) => value.startsWith(c.dialCode));
    if (matched) {
      setSelectedCountry(matched);
      setLocalNumber(value.slice(matched.dialCode.length).trim());
    }
  }, [value]);

  const handleCountrySelect = (country: CountryCodeOption) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    const fullNumber = localNumber ? `${country.dialCode} ${localNumber}` : '';
    onChange(fullNumber);

    const vResult = validatePhone(localNumber, country.dialCode);
    setValidationError(vResult.isValid ? null : vResult.message);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalNumber(val);
    const fullNumber = val ? `${selectedCountry.dialCode} ${val}` : '';
    onChange(fullNumber);

    const vResult = validatePhone(val, selectedCountry.dialCode);
    setValidationError(vResult.isValid ? null : vResult.message);
  };

  const displayError = customError || validationError;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={`block text-xs font-bold mb-1.5 ${darkBg ? 'text-slate-300' : 'text-gray-700'}`}>
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Country Code Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-3 rounded-l-2xl border-y border-l transition-all text-xs font-bold shrink-0 cursor-pointer ${
              darkBg
                ? 'bg-slate-800/90 border-white/15 text-slate-200 hover:bg-slate-700/80 hover:border-white/25'
                : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
            }`}
            title="Select Country Dial Code"
          >
            <span className="text-base">{selectedCountry.flag}</span>
            <span>{selectedCountry.dialCode}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Dropdown Options */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-56 overflow-y-auto rounded-2xl shadow-2xl border bg-slate-900 border-slate-700/90 z-50 p-1 text-xs">
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-medium transition-colors ${
                    selectedCountry.code === c.code
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span>{c.country}</span>
                  </span>
                  <span className="font-bold text-slate-400">{c.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="relative flex-1">
          <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${darkBg ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="tel"
            required={required}
            value={localNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            className={`w-full pl-10 pr-4 py-3 border border-r rounded-r-2xl outline-none transition-all text-sm font-medium ${
              darkBg
                ? 'bg-white/5 border-white/15 text-white placeholder-slate-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${displayError ? 'border-rose-500/80 focus:border-rose-400' : ''}`}
          />
        </div>
      </div>

      {displayError && (
        <p className="text-xs text-rose-400 mt-1 font-semibold flex items-center gap-1">
          ⚠️ {displayError}
        </p>
      )}
    </div>
  );
}
