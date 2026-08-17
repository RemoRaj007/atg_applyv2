import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface LanguageOption {
  code: string;
  native: string;
  english: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'zh', native: '中文', english: 'Chinese (Mandarin)' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'si', native: 'සිංහල', english: 'Sinhala' },
];

interface LanguageSelectorProps {
  onChange?: (language: LanguageOption) => void;
  variant?: 'light' | 'dark';
}

export default function LanguageSelector({
  onChange,
  variant = 'dark',
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCode = i18n.language?.substring(0, 2) || 'en';
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === activeCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: LanguageOption) => {
    i18n.changeLanguage(lang.code);
    setIsOpen(false);
    if (onChange) {
      onChange(lang);
    }
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative inline-block text-left z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <div className="flex flex-col items-start leading-tight text-left">
          <span className="font-bold">{currentLang.native}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fadeIn ${
            isDark
              ? 'bg-slate-900/95 border-slate-700 text-slate-100 backdrop-blur-xl'
              : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/20 text-blue-400 font-bold'
                        : 'bg-blue-50 text-blue-600 font-bold'
                      : isDark
                      ? 'hover:bg-slate-800/80 text-slate-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold leading-tight">{lang.native}</span>
                    <span
                      className={`text-[11px] leading-tight ${
                        isDark ? 'text-slate-400' : 'text-gray-400'
                      }`}
                    >
                      {lang.english}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
