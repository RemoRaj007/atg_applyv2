import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Briefcase, GraduationCap, FileText, User, ChevronLeft, ChevronRight, Trophy, Shield, Star, Headphones, Search, Link2, Send, Sparkles
} from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useApprovalQueue } from '../../hooks/useApprovalQueue';
import { jobApi } from '../../api/jobApi';
import { applicationApi } from '../../api/applicationApi';
import FitBadge from '../../components/ui/FitBadge';
import BackButton from '../../components/ui/BackButton';
import atgBackPng from '../../assets/atg back.png';
import { SendJobLinkModal } from '../candidate/CandidateApplications';

// Helper to render company logo
const getCompanyLogo = (companyName: string) => {
  const name = companyName.toLowerCase();
  if (name.includes('abb')) {
    return (
      <div className="flex items-center gap-0.5 select-none">
        <span className="text-[#e20613] font-black text-base tracking-tighter">A</span>
        <span className="text-[#e20613] font-black text-base tracking-tighter">B</span>
        <span className="text-[#e20613] font-black text-base tracking-tighter">B</span>
      </div>
    );
  }
  if (name.includes('roche')) {
    return (
      <div className="border border-[#0066cc] text-[#0066cc] px-2 py-0.5 rounded font-bold text-[10px] tracking-tight uppercase flex items-center justify-center select-none">
        Roche
      </div>
    );
  }
  if (name.includes('nestle') || name.includes('nestlé')) {
    return (
      <div className="flex items-center gap-1 text-[#666666] font-semibold text-xs tracking-tight select-none">
        <svg className="w-5 h-5 text-[#666666]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="font-bold text-slate-700">Nestlé</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
      {companyName.slice(0, 2)}
    </div>
  );
};

// Demo cards fallback for recommendation carousel matching reference image
const fallbackRecommendations = [
  {
    id: 'rec-roche',
    company: 'Roche',
    title: 'Data Scientist',
    location: 'Basel, Switzerland',
    tag: 'Full-time'
  },
  {
    id: 'rec-abb',
    company: 'ABB',
    title: 'Automation Engineer',
    location: 'Zürich, Switzerland',
    tag: 'Full-time'
  },
  {
    id: 'rec-nestle',
    company: 'Nestlé',
    title: 'Supply Chain Specialist',
    location: 'Vevey, Switzerland',
    tag: 'Full-time'
  }
];

const RISING_GREEN_PARTICLES = Array.from({ length: 48 }).map((_, i) => ({
  id: i,
  left: `${(i * 2.1 + (i % 9) * 3.7) % 100}%`,
  size: `${(i % 3) * 2.5 + 3}px`,
  duration: `${6.5 + (i % 7) * 1.8}s`,
  delay: `${(i % 12) * 0.5}s`,
  opacity: 0.2 + (i % 5) * 0.04,
}));

export default function CandidateDashboard() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { applications, refetch } = useApprovalQueue();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [quickJobUrl, setQuickJobUrl] = useState('');
  const [isSubmittingQuickLink, setIsSubmittingQuickLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [requestingJobId, setRequestingJobId] = useState<number | null>(null);

  const handleQuickLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJobUrl.trim()) {
      toast.error('Please paste a job URL first.');
      return;
    }
    setIsSubmittingQuickLink(true);
    try {
      await applicationApi.submitLinkRequest(quickJobUrl.trim());
      toast.success('Job link sent to operator successfully!');
      setQuickJobUrl('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit job link');
    } finally {
      setIsSubmittingQuickLink(false);
    }
  };

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const res = await jobApi.getRecommendations();
        if (res.jobs && res.jobs.length > 0) {
          setRecommendedJobs(res.jobs);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      }
    }
    loadRecommendations();
  }, []);

  if (!user) return null;

  const activeApplications = applications.filter((app) => app.status === 'requested' || app.status === 'processing' || app.status === 'completed');
  
  const displayItems = recommendedJobs.length > 0
    ? recommendedJobs.map((j) => {
        const existingApp = applications.find((app) => app.jobId === j.id);
        return {
          id: j.id,
          company: j.company || 'Company',
          title: j.title,
          location: j.location || 'Remote',
          tag: j.employmentType || j.workplaceType || 'Full-time',
          fitScore: j.fitScore,
          isReal: true,
          applied: !!existingApp,
          appStatus: existingApp?.status
        };
      })
    : activeApplications.length > 0
    ? activeApplications.map((app) => ({
        id: app.id,
        company: app.job ? app.job.company : app.scholarship?.provider || 'Company',
        title: app.job ? app.job.title : app.scholarship?.title || 'Opportunity',
        location: app.job ? app.job.location : 'Remote',
        tag: app.status === 'completed' ? 'Applied & Proved' : 'In Progress',
        fitScore: app.fitScore,
        isReal: true,
        applied: true,
        appStatus: app.status
      }))
    : fallbackRecommendations;

  const handleRequestApply = async (jobId: number) => {
    try {
      setRequestingJobId(jobId);
      await applicationApi.create({ jobId });
      toast.success('Application requested successfully!');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request application');
    } finally {
      setRequestingJobId(null);
    }
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % displayItems.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    navigate(`/candidate/jobs?${params.toString()}`);
  };

  return (
    <div className="flex flex-col w-full min-h-0 bg-[#0f172a] text-slate-100 overflow-x-hidden pb-16">
      {/* ── Hero Banner Section ── */}
      <div className="w-full relative overflow-hidden bg-[#0f172a] pt-12 pb-24 md:pt-16 md:pb-28 flex flex-col justify-center border-b border-slate-800/80">
        {/* Background ATG Image Layer with smooth 360-degree Vignette Mask */}
        <div 
          className="absolute inset-0 pointer-events-none bg-cover bg-right bg-no-repeat opacity-45 z-0"
          style={{
            backgroundImage: `url("${atgBackPng}")`,
            maskImage: 'radial-gradient(ellipse 85% 85% at 70% 45%, black 45%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 70% 45%, black 45%, transparent 95%)'
          }}
        />

        {/* Green Rising Particles (Bottom to Top) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {RISING_GREEN_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-gradient-to-tr from-emerald-400 via-emerald-300 to-white shadow-[0_0_12px_#10b981,0_0_3px_#ffffff] border border-emerald-200/60 animate-particles-rise"
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

        {/* Very Slow Spreadable Arrow Lightning Sweeping Animation (Ash body + Thinner Neon Green edge stroke, low opacity) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 flex items-center opacity-40">
          <div className="animate-arrow-lightning-slow transform transition-transform">
            <svg className="w-[850px] h-[850px] lg:w-[1250px] lg:h-[1250px] filter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="ashBodyGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#0f172a" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="greenGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {/* Ash Chevron Body */}
              <path 
                d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91 L 28 91 L 68 51 Q 73 46 68 41 L 28 5 Z" 
                fill="url(#ashBodyGradGreen)" 
              />

              {/* Glowing Neon Green Stroke Line along inner edge */}
              <path 
                d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91" 
                stroke="url(#greenGlowGrad)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none" 
                className="drop-shadow-[0_0_6px_#10b981]"
              />
            </svg>
          </div>
        </div>

        {/* Broad Spreadable Green Glow Aura */}
        <div className="absolute right-0 bottom-0 w-[650px] h-[650px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-spreadable-pulse z-0" />

        <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 relative z-20">
          <div className="mb-4">
            <BackButton label={t('common.backToHome')} to="/" variant="dark" />
          </div>
          <div className="max-w-2xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">{t('dashboard.welcome')}, {user.name}</p>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black text-white tracking-tight leading-[1.12]">
              Your Next Opportunity <br />
              is with <span className="text-blue-400 font-black inline-flex items-center gap-2 drop-shadow-sm">
                ATG Apply
              </span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg font-normal leading-relaxed max-w-xl">
              We connect ambitious people with top companies and life-changing opportunities.
            </p>

            {/* ── Interactive Job Search ── */}
            <form
              onSubmit={handleSearch}
              className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl md:rounded-full p-2 md:p-2.5 shadow-2xl flex flex-col md:flex-row items-center gap-2 max-w-2xl mt-4 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
            >
              {/* Keyword Input */}
              <div className="flex items-center gap-2.5 px-4 py-2 flex-1 w-full">
                <Search size={18} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm font-medium text-white placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl md:rounded-full shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 flex-shrink-0 text-sm cursor-pointer"
              >
                <span>{t('common.search')}</span>
                <Search size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    
      {/* ── 5 Quick Nav Cards Grid ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-[-40px] z-10 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
          {/* Card 1: Find Jobs */}
          <Link
            to="/candidate/jobs"
            className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-blue-500/60 rounded-3xl p-5 flex items-center justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-500/30 shadow-inner">
                <Briefcase size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm group-hover:text-blue-400 transition-colors">Find Jobs</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Discover roles</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-700 text-slate-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>

          {/* Card 2: Send Job Link to Operator */}
          <Link
            to="/candidate/job-links"
            className="bg-slate-800/90 backdrop-blur-md border border-blue-500/40 hover:border-blue-400 rounded-3xl p-5 flex items-center justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-blue-600/25 text-blue-300 rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-500/40 shadow-inner relative">
                <Link2 size={22} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full animate-ping" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm group-hover:text-blue-300 transition-colors flex items-center gap-1">
                  Send Job Link <Sparkles className="w-3 h-3 text-blue-400 inline" />
                </h3>
                <p className="text-[11px] text-blue-300/80 mt-0.5 font-bold">Operator Desk & Chat</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-blue-500/40 bg-blue-950/60 text-blue-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 3: Scholarships */}
          <Link
            to="/candidate/scholarships"
            className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/60 rounded-3xl p-5 flex items-center justify-between shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-500/30 shadow-inner">
                <GraduationCap size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm group-hover:text-emerald-400 transition-colors">Scholarships</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Grants & funding</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-700 text-slate-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>

          {/* Card 4: My Applications */}
          <Link
            to="/candidate/applications"
            className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-purple-500/60 rounded-3xl p-5 flex items-center justify-between shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-purple-500/15 text-purple-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-purple-500/30 shadow-inner">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm group-hover:text-purple-400 transition-colors">Applications</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Track & review</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-700 text-slate-300 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>

          {/* Card 5: My Profile */}
          <Link
            to="/candidate/profile"
            className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-amber-500/60 rounded-3xl p-5 flex items-center justify-between shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-500/30 shadow-inner">
                <User size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm group-hover:text-amber-400 transition-colors">My Profile</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Preferences</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-700 text-slate-300 flex items-center justify-center group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Instant Send Job Link to Operator Widget Card ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-8">
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 backdrop-blur-md border border-blue-700/50 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 max-w-xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-lg">
              <Link2 size={28} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Custom Operator Request
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1">Send External Job Link to Operator</h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1">
                Found a job on LinkedIn or company site? Paste the link below for a free fit score evaluation by our operators!
              </p>
            </div>
          </div>

          {/* Quick Submit Input Form */}
          <form onSubmit={handleQuickLinkSubmit} className="w-full lg:w-auto flex-1 max-w-xl flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                placeholder="Paste job posting URL (e.g., https://linkedin.com/jobs/...)"
                value={quickJobUrl}
                onChange={(e) => setQuickJobUrl(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-900/90 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingQuickLink}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingQuickLink ? 'Sending...' : 'Send to Operator'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── We Recommend Opportunities Section ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-10">
        <div className="w-full bg-[#1e293b]/90 backdrop-blur-md border border-slate-700/80 rounded-[32px] p-6 md:p-10 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
          {/* Left Side: Text, Job Selector, and CTA */}
          <div className="lg:w-1/3 space-y-5">
            <div className="w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-lg relative">
              <Trophy size={42} className="text-blue-400" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-[10px]">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 005.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">We Recommend Opportunities</h2>
              <p className="text-slate-400 text-sm font-medium">Personalized jobs and scholarships picked for you.</p>
            </div>

            <button
              onClick={() => navigate('/candidate/jobs')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3.5 px-6 rounded-full shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              See Recommendations
            </button>
          </div>

          {/* Right Side: Recommendation Carousel Cards */}
          <div className="w-full lg:w-2/3 relative flex items-center justify-center min-h-[280px] py-4">
            {/* Left Nav Button */}
            <button
              onClick={prevSlide}
              className="absolute left-0 z-20 w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:bg-slate-700 shadow-xl transition-all hover:scale-105 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Carousel Container */}
            <div className="w-full flex items-center justify-center gap-6 px-12 overflow-hidden">
              {displayItems.map((item, index) => {
                const isActive = index === activeIndex;
                const distance = Math.abs(index - activeIndex);
                const isApplied = 'applied' in item && item.applied;

                return (
                  <div
                    key={item.id}
                    className={`w-[260px] md:w-[290px] bg-[#0f172a] rounded-3xl p-6 shadow-2xl flex flex-col justify-between flex-shrink-0 transition-all duration-300 border ${
                      isActive
                        ? 'scale-105 border-blue-500/80 shadow-blue-500/20 opacity-100 z-10'
                        : distance === 1
                        ? 'scale-95 opacity-60 border-slate-700/80 hidden sm:flex cursor-pointer'
                        : 'hidden'
                    }`}
                    onClick={() => {
                      if (!isActive) setActiveIndex(index);
                    }}
                  >
                    <div className="space-y-4">
                      {/* Logo and FitBadge */}
                      <div className="flex items-center justify-between h-8">
                        <div className="text-white font-bold">{getCompanyLogo(item.company)}</div>
                        {'fitScore' in item && item.fitScore != null ? (
                          <FitBadge score={item.fitScore} />
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                            Recommended
                          </span>
                        )}
                      </div>

                      {/* Job Info */}
                      <div>
                        <h4 className="font-extrabold text-white text-sm md:text-base line-clamp-1 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          {item.location}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          isApplied
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.tag}
                        </span>
                      </div>

                      {isActive && (
                        isApplied ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/candidate/applications');
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors text-center cursor-pointer border border-slate-700"
                          >
                            View Application
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof item.id === 'number') {
                                handleRequestApply(item.id);
                              } else {
                                navigate('/candidate/jobs');
                              }
                            }}
                            disabled={requestingJobId === Number(item.id)}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors text-center disabled:opacity-50 cursor-pointer"
                          >
                            {requestingJobId === Number(item.id) ? 'Requesting...' : 'Request Application'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Nav Button */}
            <button
              onClick={nextSlide}
              className="absolute right-0 z-20 w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:bg-slate-700 shadow-xl transition-all hover:scale-105 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SwissJobs Footer Pillars Banner ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-10">
        <div className="w-full bg-[#1e293b] text-white border border-slate-700/80 rounded-2xl md:rounded-3xl p-6 md:py-8 md:px-12 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Pillar 1 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 flex-shrink-0">
                <Shield size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Trusted Platform</h4>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Secure and reliable</p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Briefcase size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Top Companies</h4>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Work with the best</p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/15 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 flex-shrink-0">
                <Star size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Smart Matching</h4>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Jobs that fit you</p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 flex-shrink-0">
                <Headphones size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Human Support</h4>
                <p className="text-xs text-slate-400 font-normal mt-0.5">We're here to help</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLinkModal && (
        <SendJobLinkModal
          onClose={() => setShowLinkModal(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
