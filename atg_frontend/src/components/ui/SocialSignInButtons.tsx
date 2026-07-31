import { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import GoogleIcon from './GoogleIcon';
import MicrosoftIcon from './MicrosoftIcon';

// Vite inlines these at build time. A provider whose client id is absent cannot
// work, so its button is not rendered at all rather than failing on click.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim();
const microsoftTenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID?.trim();

export const hasSocialSignIn = Boolean(googleClientId || microsoftClientId);

const BUTTON_CLASS =
  'w-full flex items-center justify-center gap-3 border border-white/15 rounded-2xl py-3.5 text-sm font-bold text-slate-200 bg-white/5 backdrop-blur-md hover:bg-white/10 active:bg-white/5 transition-colors shadow-sm cursor-pointer disabled:opacity-50';

interface Props {
  /** Called with a human-readable message when sign-in fails. */
  onError: (message: string) => void;
  /** Lets the host page disable the buttons while its own request is in flight. */
  disabled?: boolean;
}

/**
 * Google and Microsoft sign-in buttons. Both providers hand us an OIDC ID token
 * which the backend verifies (signature, audience, and issuer) before trusting
 * anything in it — nothing here is security-relevant on its own.
 */
export default function SocialSignInButtons({ onError, disabled }: Props) {
  const { googleLogin, microsoftLogin } = useSession();
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    if (!googleClientId) return;

    if (typeof window !== 'undefined' && !(window as any).google) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    if (!(window as any).google) {
      onError('Could not reach Google sign-in. Check your connection and try again.');
      return;
    }

    (window as any).google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: any) => {
        try {
          setBusy(true);
          await googleLogin(response.credential);
        } catch (err: any) {
          onError(err.message || 'Google login failed');
        } finally {
          setBusy(false);
        }
      },
    });
    (window as any).google.accounts.id.prompt();
  };

  const handleMicrosoft = async () => {
    if (!microsoftClientId) return;

    try {
      setBusy(true);
      // Loaded on demand so MSAL stays out of the initial bundle — most
      // sign-ins never touch it.
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const msal = new PublicClientApplication({
        auth: {
          clientId: microsoftClientId,
          // "common" accepts both work/school and personal Microsoft accounts.
          authority: `https://login.microsoftonline.com/${microsoftTenantId || 'common'}`,
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await msal.initialize();

      const result = await msal.loginPopup({ scopes: ['openid', 'profile', 'email'] });
      if (!result.idToken) throw new Error('Microsoft did not return an ID token');
      await microsoftLogin(result.idToken);
    } catch (err: any) {
      // Dismissing the popup is a normal user action, not an error to surface.
      if (err?.errorCode === 'user_cancelled' || err?.errorCode === 'popup_window_error') return;
      onError(err.message || 'Microsoft login failed');
    } finally {
      setBusy(false);
    }
  };

  if (!hasSocialSignIn) return null;

  return (
    <div className="space-y-3">
      {googleClientId && (
        <button type="button" onClick={handleGoogle} disabled={disabled || busy} className={BUTTON_CLASS}>
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
      )}
      {microsoftClientId && (
        <button type="button" onClick={handleMicrosoft} disabled={disabled || busy} className={BUTTON_CLASS}>
          <MicrosoftIcon className="h-5 w-5" />
          Continue with Microsoft
        </button>
      )}
    </div>
  );
}
