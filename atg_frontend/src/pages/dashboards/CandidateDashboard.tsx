import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Briefcase, GraduationCap, FileText, User, ChevronLeft, ChevronRight, Trophy, Shield, Star, Headphones, Search, Link2, Send
} from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useApprovalQueue } from '../../hooks/useApprovalQueue';
import { jobApi } from '../../api/jobApi';
import { applicationApi } from '../../api/applicationApi';
import FitBadge from '../../components/ui/FitBadge';
import BackButton from '../../components/ui/BackButton';
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
        <span className="font-bold text-[#1D1D1F]">Nestlé</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#6E6E73] flex items-center justify-center font-bold text-xs uppercase shadow-sm">
      {companyName.slice(0, 2)}
    </div>
  );
};

// There is deliberately no demo-card fallback here. This carousel used to fall
// back to invented Roche / ABB / Nestlé postings whenever the API returned
// nothing, so an empty account looked like it had real matches from named
// companies that had never posted to this platform. An empty state is shown
// instead.

// The five entry points, as data. Previously these were five separately
// hand-written card blocks with duplicated markup, five accent colours and
// their English labels inline — which is why they stayed English when the
// language selector changed.
const QUICK_LINKS = [
  {
    to: '/candidate/jobs',
    icon: Briefcase,
    titleKey: 'dashboard.quickJobs',
    titleDefault: 'Find jobs',
    captionKey: 'dashboard.quickJobsCaption',
    captionDefault: 'Discover roles',
  },
  {
    to: '/candidate/job-links',
    icon: Link2,
    titleKey: 'dashboard.quickJobLink',
    titleDefault: 'Send job link',
    captionKey: 'dashboard.quickJobLinkCaption',
    captionDefault: 'Operator desk & chat',
  },
  {
    to: '/candidate/scholarships',
    icon: GraduationCap,
    titleKey: 'dashboard.quickScholarships',
    titleDefault: 'Scholarships',
    captionKey: 'dashboard.quickScholarshipsCaption',
    captionDefault: 'Grants & funding',
  },
  {
    to: '/candidate/applications',
    icon: FileText,
    titleKey: 'dashboard.quickApplications',
    titleDefault: 'Applications',
    captionKey: 'dashboard.quickApplicationsCaption',
    captionDefault: 'Track & review',
  },
  {
    to: '/candidate/profile',
    icon: User,
    titleKey: 'dashboard.quickProfile',
    titleDefault: 'My profile',
    captionKey: 'dashboard.quickProfileCaption',
    captionDefault: 'Preferences',
  },
] as const;

const TRUST_PILLARS = [
  {
    icon: Shield,
    titleKey: 'dashboard.trustPlatform',
    titleDefault: 'Trusted platform',
    captionKey: 'dashboard.trustPlatformCaption',
    captionDefault: 'Secure and reliable',
  },
  {
    icon: Briefcase,
    titleKey: 'dashboard.trustCompanies',
    titleDefault: 'Top companies',
    captionKey: 'dashboard.trustCompaniesCaption',
    captionDefault: 'Work with the best',
  },
  {
    icon: Star,
    titleKey: 'dashboard.trustMatching',
    titleDefault: 'Considered matching',
    captionKey: 'dashboard.trustMatchingCaption',
    captionDefault: 'Roles that fit your profile',
  },
  {
    icon: Headphones,
    titleKey: 'dashboard.trustSupport',
    titleDefault: 'Human support',
    captionKey: 'dashboard.trustSupportCaption',
    captionDefault: 'A real person on your side',
  },
] as const;

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
    : [];

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

  // Guarded: with nothing to show, `% 0` is NaN and the carousel index breaks.
  const nextSlide = () => {
    if (displayItems.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % displayItems.length);
  };

  const prevSlide = () => {
    if (displayItems.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    navigate(`/candidate/jobs?${params.toString()}`);
  };

  return (
    <div className="flex flex-col w-full min-h-0 bg-white text-[#1D1D1F] overflow-x-hidden pb-16">
      {/* ── Opening ──
        * Was: a full-bleed ATG background image under a radial mask, 40 rising
        * green particles, a 1250px sweeping "lightning" chevron and a blurred
        * glow orb. All removed. What a candidate needs here is their name, one
        * sentence, and a way into the work.
        */}
      <div className="w-full border-b border-[#D2D2D7] pt-10 pb-12">
        <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="mb-6">
            <BackButton label={t('common.backToHome')} to="/" />
          </div>
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F05A28]">
              {t('dashboard.welcome')}, {user.name}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {t('dashboard.heroHeadline', { defaultValue: 'Your next opportunity' })}
            </h1>
            <p className="text-[#6E6E73] text-base leading-relaxed max-w-xl">
              {t('dashboard.heroSupport', {
                defaultValue:
                  'Add what you know today. Your assigned team uses it to prepare accurate applications on your instructions.',
              })}
            </p>

            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row items-stretch gap-2 max-w-xl pt-2"
            >
              <div className="flex items-center gap-2.5 px-4 flex-1 border border-[#D2D2D7] rounded-lg bg-white focus-within:border-[#0066CC] transition-colors">
                <Search size={18} className="text-[#6E6E73] flex-shrink-0" />
                <label htmlFor="dashboard-search" className="sr-only">
                  {t('common.search')}
                </label>
                <input
                  id="dashboard-search"
                  type="text"
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-h-11 text-base text-[#1D1D1F] placeholder-[#86868B] bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 bg-[#0066CC] hover:bg-[#0055AA] text-white font-medium px-6 rounded-lg transition-colors flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
              >
                <span>{t('common.search')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Quick navigation ──
        * One list rather than five near-identical hand-written cards, each of
        * which previously carried its own hardcoded English label and its own
        * accent colour. The labels are keys now, so they follow the language
        * selector like the rest of the interface.
        */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {QUICK_LINKS.map(({ to, icon: Icon, titleKey, titleDefault, captionKey, captionDefault }) => (
            <Link
              key={to}
              to={to}
              className="bg-white border border-[#D2D2D7] hover:border-[#86868B] rounded-xl p-5 flex items-center gap-3.5 transition-colors group"
            >
              <div className="w-11 h-11 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{t(titleKey, { defaultValue: titleDefault })}</h3>
                <p className="text-sm text-[#6E6E73] mt-0.5 truncate">
                  {t(captionKey, { defaultValue: captionDefault })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Instant Send Job Link to Operator Widget Card ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-8">
        <div className="bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 max-w-xl">
            <div className="w-12 h-12 rounded-lg bg-white border border-[#D2D2D7] text-[#1D1D1F] flex items-center justify-center shrink-0">
              <Link2 size={28} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#F05A28]">
                {t('dashboard.operatorRequestEyebrow', { defaultValue: 'Operator request' })}
              </span>
              <h2 className="text-xl md:text-2xl font-semibold text-[#1D1D1F] mt-1">
                {t('dashboard.sendJobLinkHeading', { defaultValue: 'Send an external job link to your operator' })}
              </h2>
              <p className="text-sm text-[#6E6E73] mt-1">
                {t('dashboard.sendJobLinkSupport', {
                  defaultValue:
                    'Found a role elsewhere? Paste the link and an operator will assess how well it fits your profile.',
                })}
              </p>
            </div>
          </div>

          {/* Quick Submit Input Form */}
          <form onSubmit={handleQuickLinkSubmit} className="w-full lg:w-auto flex-1 max-w-xl flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
              <input
                type="url"
                required
                placeholder={t('dashboard.jobLinkPlaceholder', { defaultValue: 'Paste the job posting URL' })}
                value={quickJobUrl}
                onChange={(e) => setQuickJobUrl(e.target.value)}
                className="w-full min-h-11 pl-11 pr-4 py-3 rounded-lg border border-[#D2D2D7] bg-white text-[#1D1D1F] placeholder-[#86868B] focus:border-[#0066CC] outline-none text-base transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingQuickLink}
              className="w-full sm:w-auto min-h-11 bg-[#0066CC] hover:bg-[#0055AA] text-white font-medium px-6 py-3 rounded-lg text-base transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingQuickLink ? t('dashboard.sending', { defaultValue: 'Sending…' }) : t('dashboard.sendToOperator', { defaultValue: 'Send to operator' })}</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── We Recommend Opportunities Section ── */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-10">
        <div className="w-full bg-white border border-[#D2D2D7] rounded-xl p-6 md:p-10 flex flex-col lg:flex-row items-center gap-8">
          {/* Left Side: Text, Job Selector, and CTA */}
          <div className="lg:w-1/3 space-y-5">
            <div className="w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-lg relative">
              <Trophy size={42} className="text-blue-400" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px]">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 005.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] leading-tight">{t('dashboard.recommendedHeading', { defaultValue: 'Opportunities we recommend' })}</h2>
              <p className="text-[#6E6E73] text-sm font-medium">Personalized jobs and scholarships picked for you.</p>
            </div>

            <button
              onClick={() => navigate('/candidate/jobs')}
              className="bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold py-3.5 px-6 rounded-full shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              See Recommendations
            </button>
          </div>

          {/* Right Side: Recommendation Carousel Cards */}
          <div className="w-full lg:w-2/3 relative flex items-center justify-center min-h-[280px] py-4">
            {displayItems.length === 0 ? (
              <div className="text-center px-8 max-w-sm">
                <p className="text-[#1D1D1F] font-medium mb-2">{t('dashboard.noRecommendations', { defaultValue: 'No recommendations yet' })}</p>
                <p className="text-[#6E6E73] text-sm mb-6">
                  Complete your profile so we can match you to openings, or browse everything that's
                  currently listed.
                </p>
                <button
                  onClick={() => navigate('/candidate/jobs')}
                  className="bg-white hover:bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs font-bold py-3 px-6 rounded-full transition-all cursor-pointer"
                >
                  Browse all jobs
                </button>
              </div>
            ) : (
            <>
            {/* Left Nav Button */}
            <button
              onClick={prevSlide}
              className="absolute left-0 z-20 w-11 h-11 rounded-full bg-[#F5F5F7] border border-[#D2D2D7] flex items-center justify-center text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-xl transition-all hover:scale-105 cursor-pointer"
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
                    className={`w-[260px] md:w-[290px] bg-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between flex-shrink-0 transition-all duration-300 border ${
                      isActive
                        ? 'scale-105 border-blue-500/80 shadow-blue-500/20 opacity-100 z-10'
                        : distance === 1
                        ? 'scale-95 opacity-60 border-[#D2D2D7] hidden sm:flex cursor-pointer'
                        : 'hidden'
                    }`}
                    onClick={() => {
                      if (!isActive) setActiveIndex(index);
                    }}
                  >
                    <div className="space-y-4">
                      {/* Logo and FitBadge */}
                      <div className="flex items-center justify-between h-8">
                        <div className="text-[#1D1D1F] font-semibold">{getCompanyLogo(item.company)}</div>
                        {'fitScore' in item && item.fitScore != null ? (
                          <FitBadge score={item.fitScore} />
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F5F5F7] text-[#6E6E73] rounded-md border border-[#D2D2D7]">
                            Recommended
                          </span>
                        )}
                      </div>

                      {/* Job Info */}
                      <div>
                        <h4 className="font-semibold text-[#1D1D1F] text-base line-clamp-1 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#6E6E73] mt-1 font-medium">
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
                            className="w-full bg-white hover:bg-[#F5F5F7] text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors text-center cursor-pointer border border-[#D2D2D7]"
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
                            className="w-full bg-[#0066CC] hover:bg-[#0055AA] text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors text-center disabled:opacity-50 cursor-pointer"
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
              className="absolute right-0 z-20 w-11 h-11 rounded-full bg-[#F5F5F7] border border-[#D2D2D7] flex items-center justify-center text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-xl transition-all hover:scale-105 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
            </>
            )}
          </div>
        </div>
      </div>

      {/* ── SwissJobs Footer Pillars Banner ── */}
      {/* ── Trust strip ──
        * Four pillars as data. Each was a hand-written block with its own
        * accent tint and English copy; the icons stay, the colour does not.
        */}
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 mt-10">
        <div className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl p-6 md:py-8 md:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {TRUST_PILLARS.map(({ icon: Icon, titleKey, titleDefault, captionKey, captionDefault }) => (
              <div key={titleKey} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-[#D2D2D7] rounded-lg flex items-center justify-center text-[#1D1D1F] flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-base text-[#1D1D1F]">
                    {t(titleKey, { defaultValue: titleDefault })}
                  </h4>
                  <p className="text-sm text-[#6E6E73] mt-0.5">
                    {t(captionKey, { defaultValue: captionDefault })}
                  </p>
                </div>
              </div>
            ))}
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
