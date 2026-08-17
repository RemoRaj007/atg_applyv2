import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AtgWordmark from '../ui/AtgWordmark';
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
    <header className="flex justify-between items-center py-5 px-8 border-b border-[#D2D2D7] bg-white text-[#1D1D1F] sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center">
          <AtgWordmark size="md" />
        </Link>
        <nav className="hidden md:flex gap-6 text-base text-[#6E6E73] ml-12">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                pathname === link.to
                  ? 'text-[#1D1D1F] font-semibold border-b-2 border-[#F05A28] pb-1'
                  : 'hover:text-[#1D1D1F] transition-colors pb-1'
              }
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-base">
        <LanguageSelector />
        <Link to="/login" className="px-5 py-2 border border-[#D2D2D7] rounded-lg text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">{t('nav.signIn')}</Link>
        <Link to="/register" className="px-5 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0055AA] transition-colors hidden md:block">
          {t('nav.startFree')}
        </Link>
      </div>
    </header>
    </>
  );
}
