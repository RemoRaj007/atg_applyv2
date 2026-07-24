import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="w-full py-4 px-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-3 bg-slate-900 text-slate-400 border-t border-slate-800"
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm text-white">ATG Apply</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">&copy; {new Date().getFullYear()} ATG Apply Inc. {t('footer.rightsReserved')}</span>
      </div>
      <div className="flex items-center gap-5 font-medium text-slate-400">
        <Link
          to="/privacy"
          className="transition-colors duration-150 hover:text-white"
        >
          {t('footer.privacyPolicy')}
        </Link>
        <Link
          to="/terms"
          className="transition-colors duration-150 hover:text-white"
        >
          {t('footer.termsOfService')}
        </Link>
        <a
          href="mailto:support@atgconcordia.com"
          className="transition-colors duration-150 hover:text-white"
        >
          {t('footer.supportCenter')}
        </a>
      </div>
    </footer>
  );
}
