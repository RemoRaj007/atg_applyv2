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
}

// The `variant` prop and its dark branch are gone: every surface that renders
// this is light now, no call site ever passed the prop, and a second unused
// palette is a second thing to keep in sync.
export default function LanguageSelector({ onChange }: LanguageSelectorProps) {
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

  return (
    <div className="relative inline-block text-left z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 min-h-11 px-3 py-1.5 rounded-lg border border-[#D2D2D7] bg-white text-[#1D1D1F] text-sm hover:bg-[#F5F5F7] transition-colors cursor-pointer"
      >
        <Globe className="w-4 h-4 text-[#6E6E73]" />
        <div className="flex flex-col items-start leading-tight text-left">
          <span className="font-medium">{currentLang.native}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6E6E73] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border border-[#D2D2D7] bg-white text-[#1D1D1F] overflow-hidden z-50 animate-fadeIn"
        >
          <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full text-left min-h-11 px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#F5F5F7] font-semibold' : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-base leading-tight">{lang.native}</span>
                    <span className="text-xs leading-tight text-[#6E6E73]">{lang.english}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#F05A28] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
