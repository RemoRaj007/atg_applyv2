import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useApprovalQueue } from '../../hooks/useApprovalQueue';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import FitBadge from '../../components/ui/FitBadge';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import type { Application } from '../../types/application.types';
import getIconComponent from '../../components/ui/AtgIconMapper';
import { JobDetailsModal } from './CandidateJobs';
import { jobApi } from '../../api/jobApi';
import { applicationApi } from '../../api/applicationApi';
import { useSession } from '../../hooks/useSession';
import {
  Link2, Send, CheckCircle2, AlertTriangle, Zap, X,
  ExternalLink, Star, TrendingUp, Inbox, ArrowRight, Shield
} from 'lucide-react';

// ─── Free Trial Banner ────────────────────────────────────────────
function FreeTrialBanner({ appsUsed, appsTotal }: { appsUsed: number; appsTotal: number }) {
  const isTrial = appsTotal <= 2;
  const remaining = appsTotal - appsUsed;
  const pct = Math.min((appsUsed / appsTotal) * 100, 100);

  // color scheme
  let barColor = '#10b981'; // green
  let bgClass = 'bg-emerald-950/60 border-emerald-800/60';
  let textColor = 'text-emerald-300';
  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;

  if (remaining === 1) {
    barColor = '#f59e0b';
    bgClass = 'bg-amber-950/60 border-amber-800/60';
    textColor = 'text-amber-300';
    icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
  } else if (remaining <= 0) {
    barColor = '#ef4444';
    bgClass = 'bg-rose-950/60 border-rose-800/60';
    textColor = 'text-rose-300';
    icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
  }

  return (
    <div className={`mb-5 rounded-2xl border p-4 ${bgClass} flex flex-col md:flex-row md:items-center gap-4 animate-fadeIn`}>
      <div className="flex items-center gap-3 flex-1">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-sm font-bold ${textColor}`}>
              {isTrial ? '🎁 Free Trial' : '📦 Application Quota'} —&nbsp;
              <span className="font-black">{appsUsed} / {appsTotal}</span> used
            </p>
            <span className={`text-xs font-bold ${textColor} opacity-70`}>{remaining > 0 ? `${remaining} remaining` : 'Limit reached'}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          {isTrial && remaining > 0 && (
            <p className="text-xs text-slate-400 mt-1.5">
              Your first <strong className="text-slate-200">2 applications</strong> are free. Upgrade anytime for more.
            </p>
          )}
          {remaining <= 0 && (
            <p className={`text-xs mt-1.5 font-semibold ${textColor}`}>
              You've used all your application slots. Please upgrade to continue applying.
            </p>
          )}
        </div>
      </div>
      {remaining <= 0 && (
        <Link to="/candidate/upgrade">
          <button className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-all shadow-md shadow-rose-900/40">
            <Zap className="w-3.5 h-3.5" /> Upgrade Now
          </button>
        </Link>
      )}
      {remaining > 0 && remaining <= 1 && (
        <Link to="/candidate/upgrade">
          <button className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-700 transition-all">
            <ArrowRight className="w-3.5 h-3.5" /> See Plans
          </button>
        </Link>
      )}
    </div>
  );
}

// ─── Send Job Link Modal ──────────────────────────────────────────
export function SendJobLinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setError('Please enter a job URL.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await applicationApi.submitLinkRequest(url.trim(), comment.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit job link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-fadeIn text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-800 bg-gradient-to-br from-blue-950/60 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-700/60 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Send Job Link to Operator</h2>
              <p className="text-xs text-slate-400 mt-0.5">Submit an external job link for a free fit review — no quota used</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300 leading-relaxed">
              <strong>How it works:</strong> Paste the job URL below. Our operator team will review it against your profile and send you a fit score. You'll then decide whether to apply — which counts towards your quota.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Job Posting URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="url"
                id="job-link-url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/jobs/software-engineer"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Message to Operator <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="e.g. I'm very interested in this role and think I'd be a good fit. Please review my qualifications..."
              className="w-full px-4 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-job-link"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send to Operator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Fit Review Action Card ───────────────────────────────────────
function FitReviewCard({ app, onApply, appsUsed, appsTotal, onClose }: {
  app: Application;
  onApply: (id: number) => Promise<void>;
  appsUsed: number;
  appsTotal: number;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const remaining = appsTotal - appsUsed;
  const score = app.fitScore ?? 0;

  let scoreColor = '#10b981';
  let scoreBg = 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300';
  let scoreLabel = 'Excellent Fit';
  if (score < 75) { scoreColor = '#f59e0b'; scoreBg = 'bg-amber-950/60 border-amber-700/60 text-amber-300'; scoreLabel = 'Good Fit'; }
  if (score < 50) { scoreColor = '#3b82f6'; scoreBg = 'bg-blue-950/60 border-blue-700/60 text-blue-300'; scoreLabel = 'Partial Fit'; }
  if (score < 25) { scoreColor = '#94a3b8'; scoreBg = 'bg-slate-800/80 border-slate-700 text-slate-400'; scoreLabel = 'Low Fit'; }

  const handleApply = async () => {
    setApplying(true);
    try { await onApply(app.id); toast.success('Applied successfully!'); onClose(); }
    catch (err: any) { toast.error(err.message || 'Failed to apply. Please try again.'); }
    finally { setApplying(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-fadeIn text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 bg-gradient-to-br from-indigo-950/60 to-slate-900 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-black text-white">Fit Assessment Ready!</h2>
            </div>
            <p className="text-xs text-slate-400">Your operator has reviewed your job link</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Job link */}
          {app.jobLinkRequest && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
              <a href={app.jobLinkRequest} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline truncate">
                {app.jobLinkRequest}
              </a>
            </div>
          )}

          {/* Fit Score */}
          <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: `${scoreColor}15`, border: `1px solid ${scoreColor}40` }}>
            <div className="text-center">
              <p className="text-4xl font-black" style={{ color: scoreColor }}>{score}%</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Fit Score</p>
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${scoreBg}`}>
                <TrendingUp className="w-3.5 h-3.5" /> {scoreLabel}
              </span>
              <p className="text-xs text-slate-400 mt-1.5">
                Reviewed by operator <strong className="text-slate-300">{app.staff?.name || 'Operator'}</strong>
              </p>
            </div>
          </div>

          {/* Operator notes */}
          {app.operatorFitNote && (
            <div className="bg-indigo-950/50 border border-indigo-800/60 rounded-xl p-4">
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Operator Assessment</p>
              <p className="text-sm text-slate-300 leading-relaxed">{app.operatorFitNote}</p>
            </div>
          )}

          {/* Quota info */}
          <div className={`rounded-xl p-3 border flex items-center gap-2 text-xs ${remaining <= 0 ? 'bg-rose-950/60 border-rose-800/60 text-rose-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'}`}>
            <Shield className="w-4 h-4 shrink-0" />
            {remaining > 0
              ? <span>Applying will use <strong className="text-slate-200">1 of your {remaining} remaining</strong> application slot{remaining !== 1 ? 's' : ''}.</span>
              : <span>You've <strong>reached your limit</strong>. Please upgrade to apply.</span>
            }
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
            >
              Maybe Later
            </button>
            {remaining > 0 ? (
              <button
                id="confirm-apply-btn"
                onClick={handleApply}
                disabled={applying}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {applying ? 'Applying...' : 'Apply Now'}
              </button>
            ) : (
              <Link to="/candidate/upgrade" className="flex-1">
                <button className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 transition flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Upgrade
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function CandidateApplications() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { applications, loading, error, refetch } = useApprovalQueue();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [requestingJobId, setRequestingJobId] = useState<number | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [fitReviewApp, setFitReviewApp] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'link_requests' | 'fit_reviewed' | 'applied'>('all');

  // Count fully-applied: candidate_applied, approved, processing, completed
  const fullyAppliedStatuses = ['candidate_applied', 'approved', 'processing', 'completed'];
  const fullyAppliedCount = applications.filter(a => fullyAppliedStatuses.includes(a.status)).length;
  const fitReviewPendingCount = applications.filter(a => a.status === 'fit_reviewed').length;

  const openDetails = async (app: Application) => {
    setSelectedApp(app);
    if (app.jobId) {
      try {
        const fullJob = await jobApi.getById(app.jobId);
        setSelectedApp(prev => prev && prev.id === app.id ? {
          ...prev,
          job: { ...prev.job, ...fullJob, }
        } : prev);
      } catch (err) {
        console.error('Failed to load full job details', err);
      }
    }
  };

  const handleRequestApply = async (jobId: number, comment?: string) => {
    setRequestingJobId(jobId);
    try {
      await applicationApi.create({ jobId, comment });
      toast.success('Application requested successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request application');
    } finally {
      setRequestingJobId(null);
    }
  };

  const handleConfirmApply = async (id: number) => {
    try {
      await applicationApi.confirmApply(id);
      refetch();
    } catch (err: any) {
      throw err; // let FitReviewCard handle the error display
    }
  };

  const columns = [
    {
      key: 'job.title',
      label: 'Job / Details',
      render: (app: Application) => {
        if (app.jobLinkRequest) {
          return (
            <div>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Job Link Request
              </p>
              <a href={app.jobLinkRequest} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline truncate block max-w-[200px]">
                {app.jobLinkRequest}
              </a>
            </div>
          );
        }
        if (app.job) {
          return (
            <div>
              <p className="font-semibold text-gray-800">{app.job.title}</p>
              <p className="text-sm text-gray-500">
                {app.job.company} • {app.job.location || 'Remote'}
              </p>
            </div>
          );
        } else if (app.scholarship) {
          return (
            <div>
              <p className="font-semibold text-gray-800">{app.scholarship.title}</p>
              <p className="text-sm text-purple-600 font-semibold">
                Scholarship by {app.scholarship.provider}
              </p>
            </div>
          );
        }
        return <span className="text-gray-400">—</span>;
      },
    },
    {
      key: 'fitScore',
      label: 'Fit Score',
      render: (app: Application) => (
        app.fitScore != null
          ? <div className="flex items-center space-x-1.5"><FitBadge score={app.fitScore} /><span className="text-xs font-bold text-gray-500">({app.fitScore}%)</span></div>
          : <span className="text-sm text-gray-400">—</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (app: Application) => {
        if (app.status === 'link_request') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-blue-950/60 text-blue-300 border-blue-800/60">
              <Inbox className="w-3 h-3" /> Awaiting Review
            </span>
          );
        }
        if (app.status === 'fit_reviewed') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border bg-yellow-500/20 text-yellow-300 border-yellow-600/60 animate-pulse">
              <Star className="w-3 h-3" /> Fit Score Ready!
            </span>
          );
        }
        if (app.status === 'candidate_applied') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-emerald-950/60 text-emerald-300 border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3" /> Applied
            </span>
          );
        }
        return <StatusBadge status={app.status} />;
      },
    },
    {
      key: 'actions',
      label: 'Action',
      render: (app: Application) => (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary detail button — for standard apps */}
          {!app.jobLinkRequest && (
            <button
              onClick={() => openDetails(app)}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg transition shadow-sm flex items-center space-x-1"
            >
              <span>View Details</span>
            </button>
          )}

          {/* For link_request — no action needed (waiting on operator) */}
          {app.status === 'link_request' && (
            <span className="text-xs text-slate-500 italic">Awaiting operator...</span>
          )}

          {/* For fit_reviewed — show Apply Now button */}
          {app.status === 'fit_reviewed' && (
            <button
              id={`apply-btn-${app.id}`}
              onClick={() => setFitReviewApp(app)}
              className="px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Review & Apply
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl overflow-hidden animate-fadeIn relative backdrop-blur-sm text-slate-100">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-700/60 bg-slate-900/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-white">{t('applications.title')}</h1>
              <p className="text-sm text-slate-400 mt-1">
                {t('applications.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Send Job Link button */}
              <button
                id="send-job-link-btn"
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-blue-300 border border-blue-700/60 bg-blue-950/40 hover:bg-blue-900/60 transition-all"
              >
                <Link2 className="w-4 h-4" /> Send Job Link
              </button>
              <Link to="/candidate/jobs">
                <Button variant="outline" className="py-2 px-4 rounded-xl text-sm font-semibold border-slate-700 hover:bg-slate-700 hover:text-white text-slate-200">
                  {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#60a5fa' })}
                  Find More Jobs
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong className="text-white">{fullyAppliedCount}</strong> Fully Applied</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
              <Inbox className="w-3.5 h-3.5 text-blue-400" />
              <span><strong className="text-white">{applications.filter(a => a.status === 'link_request').length}</strong> Awaiting Review</span>
            </div>
            {fitReviewPendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-600/40 rounded-xl px-3 py-2 animate-pulse">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-bold">{fitReviewPendingCount} Fit Review{fitReviewPendingCount !== 1 ? 's' : ''} Waiting for You!</span>
              </div>
            )}
          </div>
        </div>

        {/* Free Trial Banner (inside card, below header) */}
        <div className="px-8 pt-5 pb-0">
          <FreeTrialBanner
            appsUsed={user?.appsUsed ?? 0}
            appsTotal={user?.appsTotal ?? 2}
          />
        </div>

        {/* Fit Review Alert Banner */}
        {fitReviewPendingCount > 0 && (
          <div className="mx-8 mb-4 p-4 rounded-2xl bg-gradient-to-r from-yellow-950/60 to-amber-950/60 border border-yellow-800/60 flex items-center gap-3 animate-fadeIn">
            <Star className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-200">
                You have {fitReviewPendingCount} operator fit assessment{fitReviewPendingCount !== 1 ? 's' : ''} waiting!
              </p>
              <p className="text-xs text-yellow-400 mt-0.5">
                Review the fit scores below and click <strong>"Review & Apply"</strong> if you'd like to proceed.
              </p>
            </div>
          </div>
        )}
        {/* Category Tabs */}
        <div className="px-8 border-b border-slate-700/60 bg-slate-900/40 flex flex-wrap items-center gap-2 pt-2 pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('link_requests')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'link_requests'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-400" /> Custom Job Link Requests ({applications.filter(a => !!a.jobLinkRequest || a.status === 'link_request').length})
          </button>
          <button
            onClick={() => setActiveTab('fit_reviewed')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fit_reviewed'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" /> Fit Score Ready ({fitReviewPendingCount})
          </button>
          <button
            onClick={() => setActiveTab('applied')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'applied'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Applied & Completed ({fullyAppliedCount})
          </button>
        </div>

        {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading applications...</p>}
        {error && <p className="p-8 text-sm text-rose-400 bg-rose-950/60 border border-rose-800/60">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={applications.filter(app => {
              if (activeTab === 'link_requests') return !!app.jobLinkRequest || app.status === 'link_request';
              if (activeTab === 'fit_reviewed') return app.status === 'fit_reviewed';
              if (activeTab === 'applied') return fullyAppliedStatuses.includes(app.status);
              return true;
            })}
            searchPlaceholder="Search applications by title, company, location, or status..."
            searchKeys={['job.title', 'job.company', 'job.location', 'scholarship.title', 'scholarship.provider', 'status', 'jobLinkRequest']}
            itemsPerPage={8}
            emptyMessage={
              activeTab === 'link_requests'
                ? "No job link requests submitted yet. Click 'Send Job Link' above to submit one to an operator!"
                : "No applications found."
            }
          />
        )}
      </div>

      {/* Send Job Link Modal */}
      {showLinkModal && (
        <SendJobLinkModal
          onClose={() => setShowLinkModal(false)}
          onSuccess={refetch}
        />
      )}

      {/* Fit Review Modal */}
      {fitReviewApp && (
        <FitReviewCard
          app={fitReviewApp}
          onApply={handleConfirmApply}
          appsUsed={user?.appsUsed ?? 0}
          appsTotal={user?.appsTotal ?? 2}
          onClose={() => { setFitReviewApp(null); refetch(); }}
        />
      )}

      {/* Details Modal */}
      {selectedApp && (
        <JobDetailsModal
          job={selectedApp.job ? {
            ...selectedApp.job,
            fitScore: selectedApp.fitScore ?? 0,
            successRate: selectedApp.successRate ?? 0,
          } as any : null}
          scholarship={selectedApp.scholarship}
          onClose={() => setSelectedApp(null)}
          onRequestApply={handleRequestApply}
          application={selectedApp}
          isRequesting={selectedApp.jobId ? requestingJobId === selectedApp.jobId : false}
          onUpdateApplication={refetch}
        />
      )}
    </>
  );
}
