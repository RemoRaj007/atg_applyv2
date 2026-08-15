import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Briefcase, Globe, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from '../hooks/useSession';
import { validateEmail, validatePasswordStrength } from '../utils/validation';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import PhoneInput from '../components/ui/PhoneInput';
import SocialSignInButtons, { hasSocialSignIn } from '../components/ui/SocialSignInButtons';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useSession();
  
  // Basic states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Company specific states
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Front-end Email Validation
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setError(emailRes.message);
      toast.error(emailRes.message);
      return;
    }

    // Front-end Password Strength Validation
    const pwdRes = validatePasswordStrength(password);
    if (!pwdRes.isValid) {
      setError(pwdRes.message);
      toast.error(pwdRes.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name, email, password, phone };
      if (isCompany) {
        payload.isCompany = true;
        payload.companyName = companyName;
        payload.companyWebsite = companyWebsite;
        payload.companyDescription = companyDescription;
      }
      await register(payload);
      toast.success('Account created successfully!');
    } catch (err: any) {
      const msg = err.message || 'Failed to create account';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white relative overflow-hidden font-sans text-[#1D1D1F]">
      {/* The full-bleed background photograph, its dark scrim, 48 rising
        * particles, the sweeping chevron and the glow orb are gone, along with
        * the boxed-"A" mark. What remains is the form and one line of copy.
        */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors border border-[#D2D2D7] bg-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('common.back', { defaultValue: 'Back' })}</span>
      </Link>

      {/* Left: one quiet line of copy, no imagery */}
      <div className={`hidden lg:flex w-full ${isCompany ? 'lg:w-[50%]' : 'lg:w-[40%]'} flex-col p-8 lg:p-16 xl:p-20 relative z-10 justify-center transition-all duration-300`}>
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F05A28] mb-6">
            {t('auth.eyebrow', { defaultValue: 'One profile. Every opportunity.' })}
          </p>
          <h2 className="text-4xl font-semibold text-[#1D1D1F] leading-tight mb-4 tracking-tight">
            {t('auth.registerHeadline', { defaultValue: 'Start where you are.' })}
          </h2>
          <p className="text-base text-[#6E6E73] leading-relaxed">
            {t('auth.registerSupport', {
              defaultValue:
                'Create your profile, then add as much or as little of your career as you have today.',
            })}
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className={`w-full ${isCompany ? 'lg:w-[50%]' : 'lg:w-[60%] lg:max-w-[560px]'} flex items-start justify-center p-6 lg:p-12 z-20 relative min-h-screen overflow-y-auto transition-all duration-300`}>
        <div className={`w-full ${isCompany ? 'max-w-[760px]' : 'max-w-[440px]'} py-12 transition-all duration-300`}>

          <div className="mb-8 w-full">
            <div className="text-left flex-1">
              <h2 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight leading-tight">
                {t('auth.createAccountHeading', { defaultValue: 'Create your account' })}
              </h2>
            </div>
          </div>

          {/* Toggle Choice — Recruiters tab hidden */}
          <div className="p-1.5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setIsCompany(false)}
              className="w-full min-h-11 py-2.5 px-3 text-base font-medium rounded-lg transition-colors cursor-pointer bg-[#0066CC] text-white"
            >
              For Job Seekers
            </button>
          </div>



          <form noValidate onSubmit={handleSubmit} className={`space-y-4 ${isCompany ? 'lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-4 lg:space-y-0' : ''}`}>
            
            {/* User details */}
            <div>
              <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">
                {isCompany ? 'Contact Person Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isCompany ? 'Enter main contact name' : 'Enter your full name'}
                  className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
              </div>
            </div>

            <div className={isCompany ? 'lg:col-span-2' : ''}>
              <PhoneInput
                value={phone}
                onChange={(val) => setPhone(val)}
                label="Phone Number (Optional)"
                placeholder="e.g. 771234567"
                darkBg={true}
              />
            </div>

            {/* Company Specific Fields */}
            {isCompany && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Company Name</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                    <input
                      type="text"
                      required={isCompany}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://acme.com"
                      className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3 h-5 w-5 text-[#6E6E73]" />
                    <textarea
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Tell us about your company and recruitment goals..."
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium resize-none hover:bg-white/10 hover:border-white/25"
                    />
                  </div>
                </div>
              </>
            )}

            <div className={isCompany ? 'lg:col-span-2' : ''}>
              <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters with upper, lower, number, special char"
                  className="w-full pl-12 pr-12 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <PasswordStrengthMeter password={password} darkBg={true} />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6E6E73] mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6E6E73]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm bg-white/5 backdrop-blur-md text-[#1D1D1F] placeholder-slate-400 font-medium hover:bg-white/10 hover:border-white/25"
                />
              </div>
            </div>

            {error && (
              <p className={`text-sm font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl px-4 py-3 ${isCompany ? 'lg:col-span-2' : ''}`}>
                {error}
              </p>
            )}

            <div className={isCompany ? 'lg:col-span-2' : ''}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0066CC] hover:bg-[#0055AA] active:bg-blue-700 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:pointer-events-none mt-2 cursor-pointer"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </button>
            </div>
          </form>

          {hasSocialSignIn && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <SocialSignInButtons onError={setError} disabled={loading} />
            </>
          )}

          <p className="text-center text-sm text-[#6E6E73] mt-6 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0066CC] hover:text-blue-300 font-bold ml-1">
              Sign In
            </Link>
          </p>

          <div className="flex items-center justify-center gap-2 text-[11px] text-[#6E6E73] mt-8">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">Your data is secure with enterprise-grade encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
