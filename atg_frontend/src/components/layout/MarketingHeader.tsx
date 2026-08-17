import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import atgLogo from '../../assets/atg_apply.png';
import LanguageSelector from '../ui/LanguageSelector';
import MaintenanceBanner from './MaintenanceBanner';

const NAV_LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/how-it-works', key: 'nav.howItWorks' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/contact', key: 'nav.contact' },
  { to: '/privacy', key: 'nav.privacy' },
  { to: '/terms', key: 'nav.terms' },
];

export default function MarketingHeader() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <>
    {/* Site-wide notice, raised from Site Settings. Renders nothing when empty. */}
    <MaintenanceBanner />
    <header className="flex justify-between items-center py-6 px-8 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3 font-extrabold text-2xl md:text-3xl text-white group">
          <img src={atgLogo} alt="ATG Apply Logo" className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-110" />
          <span className="tracking-tight text-white transition-all duration-300 group-hover:opacity-90">ATG Apply</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-slate-300 font-medium ml-12">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                pathname === link.to
                  ? 'text-white font-semibold border-b-2 border-blue-500 pb-1'
                  : 'hover:text-white transition-colors pb-1'
              }
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium">
        <LanguageSelector />
        <Link to="/login" className="px-5 py-2 border border-slate-700 rounded text-slate-200 hover:bg-slate-800 transition-colors">{t('nav.signIn')}</Link>
        <Link to="/register" className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors hidden md:block hover:shadow-md">
          {t('nav.startFree')}
        </Link>
      </div>
    </header>
    </>
  );
}
