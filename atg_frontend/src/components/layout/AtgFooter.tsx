import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicSettings } from '../../hooks/useSiteContent';

// Networks an admin can fill in under Site Settings → Social. A blank value
// hides the link, so the footer only ever shows networks that actually exist.
// Rendered as text rather than brand icons: lucide-react dropped those, and the
// labels stay legible for screen readers either way.
const SOCIALS = [
  { key: 'social.linkedin', label: 'LinkedIn' },
  { key: 'social.facebook', label: 'Facebook' },
  { key: 'social.instagram', label: 'Instagram' },
  { key: 'social.x', label: 'X' },
];

export default function Footer() {
  const { t } = useTranslation();
  const settings = usePublicSettings();

  // The bundled values are the fallback: the footer renders correctly before
  // the settings request lands, and if it never does.
  const siteName = String(settings['site.name'] ?? 'ATG Apply');
  const supportEmail = String(settings['contact.email'] ?? 'support@atgconcordia.com');

  const socialLinks = SOCIALS.map((s) => ({ ...s, href: String(settings[s.key] ?? '').trim() })).filter(
    // Only http(s) is stored — the API rejects other schemes — but re-check
    // here so a stale or hand-edited value can never become a javascript: link.
    (s) => /^https?:\/\//i.test(s.href)
  );

  return (
    <footer className="w-full py-4 px-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-3 bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm text-white">{siteName}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          &copy; {new Date().getFullYear()} {siteName} Inc. {t('footer.rightsReserved')}
        </span>
      </div>

      <div className="flex items-center gap-5 font-medium text-slate-400">
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-3">
            {socialLinks.map(({ key, label, href }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150 hover:text-white"
              >
                {label}
              </a>
            ))}
            <span className="text-slate-700">|</span>
          </div>
        )}

        <Link to="/privacy" className="transition-colors duration-150 hover:text-white">
          {t('footer.privacyPolicy')}
        </Link>
        <Link to="/terms" className="transition-colors duration-150 hover:text-white">
          {t('footer.termsOfService')}
        </Link>
        <a href={`mailto:${supportEmail}`} className="transition-colors duration-150 hover:text-white">
          {t('footer.supportCenter')}
        </a>
      </div>
    </footer>
  );
}
