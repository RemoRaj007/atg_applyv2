import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from '../hooks/useSession';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/ui/LanguageSelector';
import SocialSignInButtons from '../components/ui/SocialSignInButtons';
import atgLogo from '../assets/atg_apply.png';
import logfImg from '../assets/logf.png';
import { validateEmail } from '../utils/validation';

const REMEMBERED_EMAIL_KEY = 'atg_remembered_email';

const RISING_PARTICLES = Array.from({ length: 48 }).map((_, i) => ({
  id: i,
  left: `${(i * 2.1 + (i % 9) * 3.7) % 100}%`,
  size: `${(i % 3) * 2.5 + 3}px`,
  duration: `${6.5 + (i % 7) * 1.8}s`,
  delay: `${(i % 12) * 0.5}s`,
  opacity: 0.2 + (i % 5) * 0.04,
}));

export default function Login() {
  const { t } = useTranslation();
  const { login } = useSession();
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
      toast.success('Welcome back!');
    } catch (err: any) {
      const msg = err.message || 'Failed to log in';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#090d16] relative overflow-hidden font-sans text-slate-100">
      {/* Full Screen Background Image */}
      <img 
        src={logfImg} 
        alt="ATG Apply Background" 
        className="absolute inset-0 w-full h-full object-cover z-0" 
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#090d16]/75 via-[#090d16]/20 to-[#090d16]/60 z-0 pointer-events-none" />

      {/* Orange Rising Particles (Bottom to Top) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {RISING_PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-white shadow-[0_0_12px_#ff9900,0_0_3px_#ffffff] border border-amber-200/60 animate-particles-rise"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Very Slow Spreadable Arrow Lightning Sweeping Animation (Ash body + Thinner Neon Orange edge stroke, low opacity) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 flex items-center opacity-35">
        <div className="animate-arrow-lightning-slow transform transition-transform">
          <svg className="w-[850px] h-[850px] lg:w-[1250px] lg:h-[1250px] filter drop-shadow-[0_0_15px_rgba(255,140,0,0.5)]" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="ashBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#1e293b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="orangeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb700" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ff6600" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ff3300" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Ash Chevron Body */}
            <path 
              d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91 L 28 91 L 68 51 Q 73 46 68 41 L 28 5 Z" 
              fill="url(#ashBodyGrad)" 
            />

            {/* Glowing Neon Orange Stroke Line along inner edge */}
            <path 
              d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91" 
              stroke="url(#orangeGlowGrad)" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              fill="none" 
              className="drop-shadow-[0_0_6px_#ff8c00]"
            />
          </svg>
        </div>
      </div>

      {/* Broad Spreadable Orange Glow Aura */}
      <div className="absolute right-0 bottom-0 w-[650px] h-[650px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-spreadable-pulse z-0" />

      <Link 
        to="/" 
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-700/80 transition-all font-semibold text-sm border border-slate-700/80 shadow-md bg-slate-800/80 backdrop-blur-md"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('common.backToHome')}</span>
      </Link>

      <div className="absolute top-6 right-6 z-50">
        <LanguageSelector />
      </div>

      {/* Left Side: Hero Section (Positioned higher up) */}
      <div className="w-full lg:w-[60%] flex flex-col p-8 lg:p-16 xl:p-20 relative z-10 min-h-[500px] lg:min-h-screen justify-start pt-20 lg:pt-28 xl:pt-32 overflow-hidden">
        {/* Hero Text */}
        <div className="relative z-10 max-w-xl animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-md">
            Find Your Next <br />
            <span className="text-blue-400 font-black">Career Opportunity</span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed font-medium">
            Connect with top employers, discover meaningful roles, and accelerate your career growth with AI-powered matching.
          </p>
        </div>
      </div>

      {/* Right Side: Form Container (Positioned back on the right side) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 lg:p-12 z-20 relative">
        <div className="w-full max-w-[440px] bg-slate-900/65 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/15 p-8 lg:p-10 animate-fadeIn relative z-20" style={{ animationDelay: '0.3s' }}>
          
          {/* Logo and Welcome Back side by side */}
          <div className="flex items-center gap-4 mb-8 w-full">
            <img src={atgLogo} alt="ATG Apply Logo" className="h-16 w-16 object-contain rounded-2xl shadow-lg border border-white/15 bg-slate-950/60 p-2 shrink-0 animate-fadeIn backdrop-blur-md" />
            <div className="text-left flex-1">
              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{t('auth.welcomeBack')}</h2>
              <p className="text-xs text-slate-300 mt-1 font-medium">{t('auth.loginSubtitle')}</p>
            </div>
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3.5 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-white placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-white placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                Remember Me
              </label>
              <Link to="/forgot-password" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
                Forgot Password?
              </Link>
            </div>

            {error && (
              <p className="text-sm font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2 disabled:opacity-60 mt-4 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">or continue with</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <SocialSignInButtons onError={setError} disabled={loading} />

          <p className="text-center text-sm text-slate-400 mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold ml-1">
              Create Account
            </Link>
          </p>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-10">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">Your data is secure with enterprise-grade encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
