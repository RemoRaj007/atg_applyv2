import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from '../hooks/useSession';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/ui/LanguageSelector';
import SocialSignInButtons from '../components/ui/SocialSignInButtons';
import AtgWordmark from '../components/ui/AtgWordmark';
import { useErrorMessage } from '../hooks/useErrorMessage';
import { validateEmail } from '../utils/validation';

const REMEMBERED_EMAIL_KEY = 'atg_remembered_email';

/**
 * The opening composition: one quiet, centered column.
 *
 * What this replaces: a full-bleed background photograph, a 48-particle rising
 * field, a sweeping orange "lightning" arrow, a pulsing amber glow orb, and a
 * glassmorphic card floating over all of it. None of that survived — the
 * product is meant to read as considered and trustworthy, and a candidate
 * handing over their career history should not arrive at a light show.
 */
export default function Login() {
  const { t } = useTranslation();
  const { login } = useSession();
  const toMessage = useErrorMessage();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.message);
      toast.error(emailCheck.message);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      if (remember) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      toast.success(t('auth.welcomeToast', { defaultValue: 'Welcome back.' }));
    } catch (err: unknown) {
      const msg = toMessage(err, 'Failed to log in');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full px-4 py-3 border border-[#D2D2D7] rounded-lg outline-none transition-colors text-base bg-white text-[#1D1D1F] placeholder-[#86868B] focus:border-[#0066CC]';

  return (
    <div className="min-h-screen w-full bg-white text-[#1D1D1F]">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <AtgWordmark size="md" />
        <LanguageSelector />
      </header>

      <main className="mx-auto w-full max-w-[440px] px-6 pb-20 pt-6 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F05A28]">
          {t('auth.eyebrow', { defaultValue: 'One profile. Every opportunity.' })}
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          {t('auth.openingHeadline', { defaultValue: 'Let’s build yours.' })}
        </h1>
        <p className="mt-4 text-base text-[#6E6E73]">
          {t('auth.openingSupport', {
            defaultValue:
              'Start with what you know today. Come back and add more whenever your career grows.',
          })}
        </p>

        <form noValidate onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-[#1D1D1F] mb-2">
              {t('auth.emailLabel', { defaultValue: 'Email address' })}
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[#1D1D1F] mb-2">
              {t('auth.passwordLabel', { defaultValue: 'Password' })}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors p-1"
                aria-label={
                  showPassword
                    ? t('auth.hidePassword', { defaultValue: 'Hide password' })
                    : t('auth.showPassword', { defaultValue: 'Show password' })
                }
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#6E6E73] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[#D2D2D7] accent-[#0066CC]"
              />
              {t('auth.rememberMe', { defaultValue: 'Remember me' })}
            </label>
            <Link to="/forgot-password" className="text-[#0066CC] hover:underline">
              {t('auth.forgotPassword', { defaultValue: 'Forgot password?' })}
            </Link>
          </div>

          {error && (
            // role=alert so the failure is announced, not just recoloured.
            <p role="alert" className="text-sm text-[#D70015] bg-[#FFF5F5] border border-[#F5C2C2] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 bg-[#0066CC] hover:bg-[#0055AA] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? t('auth.signingIn', { defaultValue: 'Signing in…' })
              : t('auth.signIn', { defaultValue: 'Sign in' })}
          </button>
        </form>

        <div className="flex items-center gap-4 my-8">
          <div className="h-px bg-[#D2D2D7] flex-1" />
          <span className="text-sm text-[#6E6E73]">{t('auth.orContinueWith', { defaultValue: 'or' })}</span>
          <div className="h-px bg-[#D2D2D7] flex-1" />
        </div>

        <SocialSignInButtons onError={setError} disabled={loading} />

        <p className="text-center text-sm text-[#6E6E73] mt-8">
          {t('auth.noAccount', { defaultValue: 'Don’t have an account?' })}{' '}
          <Link to="/register" className="text-[#0066CC] hover:underline">
            {t('auth.createAccount', { defaultValue: 'Create one' })}
          </Link>
        </p>

        {/* One short privacy/help link, per the approved opening composition. */}
        <p className="text-center text-sm mt-6">
          <Link to="/privacy-policy" className="text-[#6E6E73] hover:text-[#1D1D1F] hover:underline">
            {t('auth.privacyLink', { defaultValue: 'How ATG Apply handles your information' })}
          </Link>
        </p>
      </main>
    </div>
  );
}
