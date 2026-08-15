import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import atgLogo from '../assets/atg_apply.png';

type Status = 'verifying' | 'success' | 'error';

// No token in the URL is not a distinct state here: it fails the same call
// with the same "invalid or expired" message the backend already returns,
// which keeps this component from duplicating that copy.
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<Status>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  // Effects run twice under StrictMode in development; the token is single-use
  // server-side, so a duplicate call would surface as a spurious failure.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    try {
      await authApi.resendVerification(resendEmail);
      setResendSent(true);
      toast.success('If that account needs verifying, a new link is on its way.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <img src={atgLogo} alt="ATG Apply" className="h-10 mx-auto mb-8" />

        {status === 'verifying' && (
          <>
            <Loader2 className="w-14 h-14 text-action-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-[#1D1D1F] mb-2">Verifying your email…</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1D1D1F] mb-3">Email verified</h1>
            <p className="text-[#6E6E73] mb-8">Your address is confirmed. You're all set.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-xl bg-action-500 text-[#1D1D1F] font-semibold hover:bg-action-600 transition"
            >
              Continue to sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1D1D1F] mb-3">Link invalid or expired</h1>
            <p className="text-[#6E6E73] mb-8">
              This verification link no longer works. Request a new one below.
            </p>

            {resendSent ? (
              <p className="text-[#6E6E73]">
                Check your inbox for a new link. It expires in 24 hours.
              </p>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#D2D2D7] text-[#1D1D1F] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-action-500"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full px-6 py-3 rounded-xl bg-action-500 text-[#1D1D1F] font-semibold hover:bg-action-600 transition disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend verification link'}
                </button>
              </form>
            )}

            <Link to="/login" className="block mt-6 text-sm text-[#6E6E73] hover:text-[#1D1D1F]">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
