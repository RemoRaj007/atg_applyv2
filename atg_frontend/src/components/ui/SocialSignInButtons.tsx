import { useRef, useState } from 'react';
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
  // Set when One Tap declines to appear, which swaps our own button for
  // Google's rendered one. See handleGoogle.
  const [googleFallback, setGoogleFallback] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitialised = useRef(false);

  const loadGoogleScript = async () => {
    if (typeof window === 'undefined') return null;
    if (!(window as any).google) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        // Without this an ad blocker or a blocked network left the promise
        // pending forever, so the click did nothing at all — no spinner, no
        // error, no sign-in.
        script.onerror = () => reject(new Error('blocked'));
        document.body.appendChild(script);
      }).catch(() => null);
    }
    return (window as any).google ?? null;
  };

  const initGoogle = (google: any) => {
    if (googleInitialised.current) return;
    google.accounts.id.initialize({
      client_id: googleClientId,
      // Chrome's third-party cookie phase-out breaks the legacy One Tap
      // transport; FedCM is the supported path and is required for the prompt
      // to appear at all in current Chrome.
      use_fedcm_for_prompt: true,
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
    googleInitialised.current = true;
  };

  // Renders Google's own sign-in button into the container below. One Tap is
  // suppressed in a long list of ordinary situations — the user dismissed it
  // earlier ("exponential cooldown"), the browser blocks third-party state,
  // Safari/Firefox private mode, an ad blocker, or no Google session at all —
  // and in every one of them `prompt()` returns silently. That is the reported
  // symptom: the Google button appears to do nothing. The rendered button has
  // none of those constraints, so it becomes the visible fallback.
  const renderGoogleButton = (google: any) => {
    setGoogleFallback(true);
    // After the state flip, so the container exists.
    requestAnimationFrame(() => {
      if (!googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: googleButtonRef.current.offsetWidth || 320,
      });
    });
  };

  const handleGoogle = async () => {
    if (!googleClientId) return;

    const google = await loadGoogleScript();
    if (!google) {
      onError('Could not reach Google sign-in — an ad blocker or your network may be blocking it.');
      return;
    }

    initGoogle(google);

    try {
      google.accounts.id.prompt((notification: any) => {
        // These predicates are deprecated under FedCM and may be absent, so
        // anything other than a clear "it displayed" falls back rather than
        // leaving the user staring at a button that did nothing.
        const skipped =
          typeof notification?.isNotDisplayed === 'function'
            ? notification.isNotDisplayed() || notification.isSkippedMoment?.()
            : !notification?.isDisplayed?.();
        if (skipped) renderGoogleButton(google);
      });
    } catch {
      renderGoogleButton(google);
    }
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
        <>
          {!googleFallback && (
            <button type="button" onClick={handleGoogle} disabled={disabled || busy} className={BUTTON_CLASS}>
              <GoogleIcon className="h-5 w-5" />
              Continue with Google
            </button>
          )}
          {/* Google renders its own button in here when One Tap is suppressed. */}
          <div ref={googleButtonRef} className={googleFallback ? 'flex justify-center' : 'hidden'} />
        </>
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
