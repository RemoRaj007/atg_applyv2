import React, { useState } from 'react';
import { CreditCard, Globe, AlertTriangle } from 'lucide-react';
import { validateNIC, COUNTRY_CODES } from '../../utils/validation';

interface NicInputProps {
  nicValue: string;
  countryValue: string;
  onNicChange: (nic: string) => void;
  onCountryChange: (country: string) => void;
  label?: string;
  required?: boolean;
  darkBg?: boolean;
  className?: string;
}

export default function NicInput({
  nicValue = '',
  countryValue = '',
  onNicChange,
  onCountryChange,
  label = 'National Identity Card (NIC) / Identity No.',
  required = false,
  darkBg = true,
  className = '',
}: NicInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    onCountryChange(selectedCountry);
    const result = validateNIC(nicValue, selectedCountry);
    setError(result.isValid ? null : result.message);
  };

  const handleNicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onNicChange(val);
    const result = validateNIC(val, countryValue);
    setError(result.isValid ? null : result.message);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Label */}
      {label && (
        <label className={`block text-xs font-bold mb-1 ${darkBg ? 'text-slate-300' : 'text-gray-700'}`}>
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mandatory Country Selector */}
        <div>
          <label className={`block text-[11px] font-semibold mb-1 uppercase tracking-wider ${darkBg ? 'text-slate-400' : 'text-gray-500'}`}>
            Country <span className="text-rose-400 font-bold">(Required for NIC)</span>
          </label>
          <div className="relative">
            <Globe className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${darkBg ? 'text-slate-400' : 'text-gray-400'}`} />
            <select
              required={required || !!nicValue.trim()}
              value={countryValue}
              onChange={handleCountryChange}
              className={`w-full pl-10 pr-8 py-2.5 border rounded-2xl outline-none transition-all text-sm font-medium appearance-none cursor-pointer ${
                darkBg
                  ? 'bg-slate-950/80 border-white/15 text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 hover:bg-slate-900'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } ${!countryValue.trim() && nicValue.trim() ? 'border-amber-500/80 ring-2 ring-amber-500/20' : ''}`}
            >
              <option value="" className="bg-slate-900 text-slate-400">-- Select Country --</option>
              <option value="Sri Lanka" className="bg-slate-900 text-white">🇱🇰 Sri Lanka</option>
              <option value="United States" className="bg-slate-900 text-white">🇺🇸 United States</option>
              <option value="United Kingdom" className="bg-slate-900 text-white">🇬🇧 United Kingdom</option>
              <option value="India" className="bg-slate-900 text-white">🇮🇳 India</option>
              <option value="Australia" className="bg-slate-900 text-white">🇦🇺 Australia</option>
              <option value="Canada" className="bg-slate-900 text-white">🇨🇦 Canada</option>
              <option value="Germany" className="bg-slate-900 text-white">🇩🇪 Germany</option>
              <option value="France" className="bg-slate-900 text-white">🇫🇷 France</option>
              <option value="Japan" className="bg-slate-900 text-white">🇯🇵 Japan</option>
              <option value="United Arab Emirates" className="bg-slate-900 text-white">🇦🇪 United Arab Emirates</option>
              <option value="Singapore" className="bg-slate-900 text-white">🇸🇬 Singapore</option>
              {COUNTRY_CODES.filter(c => !['LK', 'US', 'GB', 'IN', 'AU', 'CA', 'DE', 'FR', 'JP', 'AE', 'SG'].includes(c.code)).map((c) => (
                <option key={c.code} value={c.country} className="bg-slate-900 text-white">
                  {c.flag} {c.country}
                </option>
              ))}
              <option value="Other" className="bg-slate-900 text-white">🌐 Other Country</option>
            </select>
          </div>
        </div>

        {/* NIC Input */}
        <div>
          <label className={`block text-[11px] font-semibold mb-1 uppercase tracking-wider ${darkBg ? 'text-slate-400' : 'text-gray-500'}`}>
            NIC / Identity Number
          </label>
          <div className="relative">
            <CreditCard className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${darkBg ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              required={required}
              value={nicValue}
              onChange={handleNicChange}
              placeholder={
                countryValue.toLowerCase().includes('sri lanka')
                  ? 'e.g. 951234567V or 199512345678'
                  : 'Enter NIC / Identity number'
              }
              className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl outline-none transition-all text-sm font-medium ${
                darkBg
                  ? 'bg-white/5 border-white/15 text-white placeholder-slate-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 hover:bg-white/10'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } ${error ? 'border-rose-500/80 focus:border-rose-400' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Warning / Error Message */}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs font-semibold text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!countryValue.trim() && nicValue.trim() && !error && (
        <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
          ⚠️ Country selection is mandatory to validate NIC.
        </p>
      )}
    </div>
  );
}
