import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { jobApi } from '../../api/jobApi';
import { applicationApi } from '../../api/applicationApi';
import type { Job, FitBreakdown } from '../../types/job.types';
import type { Application } from '../../types/application.types';
import {
  Briefcase, MapPin, Search, SlidersHorizontal,
  CheckCircle, Clock, XCircle, Send, BarChart3, Star, TrendingUp,
  Info, X, Layers, Award, Zap, Eye,
  Building2, Tag, FileText, Globe, Target, Calendar, MessageSquare, GraduationCap,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getFileUrl } from '../../utils/fileUrl';

// ─── Types ────────────────────────────────────────────────────────
export interface JobWithFit extends Job {
  fitScore?: number;
  successRate?: number;
  breakdown?: FitBreakdown | null;
}

// ─── Helpers ──────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { ring: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
  if (score >= 50) return { ring: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
  if (score >= 25) return { ring: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', badge: 'bg-blue-950/60 text-blue-300 border-blue-800/60' };
  return { ring: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', badge: 'bg-slate-800/80 text-slate-400 border-slate-700' };
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Excellent fit';
  if (score >= 50) return 'Good fit';
  if (score >= 25) return 'Partial fit';
  return 'Low fit';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return dateStr; }
}

// ─── Status Styles ────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  recommended:      { icon: Info,        className: 'bg-purple-950/60 text-purple-300 border-purple-800/60',    label: 'Recommended' },
  requested:        { icon: Clock,       className: 'bg-blue-950/60 text-blue-300 border-blue-800/60',          label: 'Requested' },
  processing:       { icon: Clock,       className: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',    label: 'Processing' },
  pending_approval: { icon: Clock,       className: 'bg-amber-950/60 text-amber-300 border-amber-800/60',       label: 'Pending Approval' },
  approved:         { icon: CheckCircle, className: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', label: 'Approved' },
  completed:        { icon: CheckCircle, className: 'bg-emerald-600 text-white border-emerald-700',            label: 'Completed' },
  rejected:         { icon: XCircle,     className: 'bg-rose-950/60 text-rose-300 border-rose-800/60',             label: 'Rejected' },
  skipped:          { icon: XCircle,     className: 'bg-slate-800/80 text-slate-400 border-slate-700',         label: 'Skipped' },
};

// ─── Score Ring ───────────────────────────────────────────────────
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const strokeWidth = size <= 56 ? 4 : 6;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const col = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col.ring} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black" style={{ color: col.ring, lineHeight: 1 }}>{score}%</span>
      </div>
    </div>
  );
}

// ─── Fit Breakdown Panel ──────────────────────────────────────────
function FitBreakdownPanel({ job, onClose }: { job: JobWithFit; onClose: () => void }) {
  const score = job.fitScore ?? 0;
  const col = scoreColor(score);
  const bd = job.breakdown;
  const CATS = [
    { key: 'jobRole',        icon: Briefcase, color: '#818cf8' },
    { key: 'skills',         icon: Award,     color: '#60a5fa' },
    { key: 'location',       icon: MapPin,    color: '#34d399' },
    { key: 'experience',     icon: TrendingUp,color: '#fbbf24' },
    { key: 'education',      icon: Layers,    color: '#a78bfa' },
    { key: 'employmentType', icon: Zap,       color: '#f472b6' },
  ] as const;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 pt-6 pb-4" style={{ background: `linear-gradient(135deg, ${col.ring}20, rgba(15, 23, 42, 0.95))` }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Match Fit Score</p>
              <p className="text-xl font-black text-white">{scoreLabel(score)}</p>
              <p className="text-sm font-semibold" style={{ color: col.ring }}>{job.title} @ {job.company}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/60" style={{ backgroundColor: col.bg }}>
            <Star className="w-4 h-4" style={{ color: col.ring }} />
            <span className="text-xs font-bold" style={{ color: col.text }}>
              Estimated success rate: <strong>{job.successRate ?? 0}%</strong>
            </span>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Score Breakdown
          </p>
          <div className="space-y-3">
            {bd ? CATS.map(({ key, icon: Icon, color }) => {
              const item = bd[key as keyof FitBreakdown];
              const pct = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Icon className="w-3.5 h-3.5" style={{ color }} />{item.label}
                    </span>
                    <span className="text-xs font-black text-white">{item.score}/{item.max}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            }) : <p className="text-xs text-slate-400 italic">Complete your profile to see a detailed breakdown.</p>}
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-xl p-3 bg-blue-950/60 border border-blue-800/60">
            <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Improve your score</p>
            <p className="text-xs text-blue-400 mt-1">Add more skills, experiences, and job roles in your profile to boost match accuracy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Details Modal ────────────────────────────────────────────
export function JobDetailsModal({ job, scholarship, onClose, onRequestApply, application, isRequesting, onUpdateApplication }: {
  job?: JobWithFit | null;
  scholarship?: any | null;
  onClose: () => void;
  onRequestApply?: (jobId: number, comment?: string) => Promise<void>;
  application?: Application;
  isRequesting?: boolean;
  onUpdateApplication: () => void;
}) {
  const isScholarship = !!scholarship;
  const score = isScholarship ? 100 : (job?.fitScore ?? 0);
  const successRate = isScholarship ? 100 : (job?.successRate ?? 0);
  const col = scoreColor(score);

  // Workflow states
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const handleSendComment = async () => {
    if (!application || !newComment.trim()) return;
    setSendingComment(true);
    try {
      await applicationApi.addComment(application.id, newComment.trim(), 'public');
      setNewComment('');
      toast.success('Message sent');
      onUpdateApplication();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl max-h-[85vh] min-h-0 overflow-hidden flex flex-col text-slate-100" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-slate-800 shrink-0" style={{ background: `linear-gradient(135deg, ${col.ring}20, rgba(15, 23, 42, 0.95))` }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>
          {isScholarship ? (
            <div className="flex items-start gap-4 pr-8">
              <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-lg font-black shadow-sm bg-purple-950/80 border border-purple-800/60 text-purple-400">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-white leading-tight">{scholarship.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-sm text-slate-300 font-medium"><Award className="w-3.5 h-3.5 text-purple-400" /> {scholarship.provider}</span>
                </div>
              </div>
            </div>
          ) : job ? (
            <div className="flex items-start gap-4 pr-8">
              <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-lg font-black shadow-sm border border-slate-700/60" style={{ backgroundColor: col.bg, color: col.ring }}>
                {job.company.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-white leading-tight">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-sm text-slate-300 font-medium"><Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company}</span>
                  {job.location && <span className="flex items-center gap-1 text-sm text-slate-400"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                  {job.jobRole && (
                    <span className="flex items-center gap-1 text-xs font-semibold bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/60">
                      <Tag className="w-3 h-3" /> {job.jobRole.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60 flex flex-col items-center">
              <ScoreRing score={score} size={56} />
              <p className="text-xs font-bold text-slate-400 mt-1">Match Score</p>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60 flex flex-col items-center justify-center">
              <p className="text-2xl font-black" style={{ color: col.ring }}>{successRate}%</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Success Rate</p>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60 flex flex-col items-center justify-center gap-1">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${col.badge}`}>{scoreLabel(score)}</span>
              <p className="text-xs font-bold text-slate-400">Fit Level</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Job / Scholarship Info */}
          {isScholarship ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Scholarship Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Provider',   value: scholarship.provider || '—', icon: Award },
                  { label: 'Amount',     value: scholarship.amount != null ? `$${scholarship.amount.toLocaleString()}` : '—', icon: Zap },
                  { label: 'Deadline',   value: formatDate(scholarship.deadline), icon: Calendar },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-white truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {scholarship.description && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
                  <p className="text-sm text-slate-300 leading-relaxed p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">{scholarship.description}</p>
                </div>
              )}
            </div>
          ) : job ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Job Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Location',   value: job.location || '—',      icon: MapPin },
                  { label: 'Work Type',  value: job.locationType || '—',  icon: Globe },
                  { label: 'Experience', value: job.experience || '—',    icon: TrendingUp },
                  { label: 'Deadline',   value: formatDate(job.deadline), icon: Calendar },
                  { label: 'Job Role',   value: job.jobRole?.name || '—', icon: Target },
                  { label: 'Source',     value: job.source || '—',        icon: Building2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-white truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Operator Submission Evidence / Materials */}
          {application && (application.proof || application.operatorDocNotes) && (
            <div className="bg-indigo-950/60 border border-indigo-800/60 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">Operator Application Evidence & Proof</span>
              {application.operatorDocNotes && (
                <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-900 p-3 rounded-lg border border-indigo-900/60">
                  {application.operatorDocNotes}
                </p>
              )}
              {application.proof && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Documents & Screenshots:</span>
                  {application.proof.split(',').map((filePath, idx) => {
                    const refs = application.proofRef ? application.proofRef.split(',') : [];
                    const fileName = refs[idx] || `Document ${idx + 1}`;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <a href={getFileUrl(filePath)}
                          target="_blank" rel="noreferrer" className="text-blue-400 font-bold underline hover:text-blue-300">
                          {fileName}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Loop Comments log / thread */}
          {application && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comments Loop Log
              </h3>
              
              <div className="space-y-3 max-h-40 overflow-y-auto p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                {(application as any).comments && (application as any).comments.length > 0 ? (
                  (application as any).comments.map((c: any) => (
                    <div key={c.id} className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
                        <span className="flex items-center gap-1">
                          <span className="text-blue-400 font-bold">{c.sender?.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded uppercase">{c.sender?.role}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No comments in history yet.</p>
                )}
              </div>

              {application.status !== 'completed' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask operator questions or reply..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    disabled={sendingComment}
                    className="flex-1 text-xs border border-slate-700 rounded-xl px-3 py-2 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={sendingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition">
            Close
          </button>
          {!application && job && onRequestApply && (
            <button
              onClick={() => onRequestApply(job.id)}
              disabled={isRequesting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isRequesting ? 'Requesting...' : 'Request Operator Apply'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function CandidateJobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobWithFit[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minMatch, setMinMatch] = useState(0);
  const [locationFilter, setLocationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestingJobId, setRequestingJobId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithFit | null>(null);
  const [viewJob, setViewJob] = useState<JobWithFit | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, minMatch, locationFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsList, appsList] = await Promise.all([jobApi.list(), applicationApi.list()]);
      setJobs(jobsList as JobWithFit[]);
      setApplications(appsList);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRequestApply = async (jobId: number, comment?: string) => {
    setRequestingJobId(jobId);
    try {
      await applicationApi.create({ jobId, comment });
      toast.success('Application requested successfully!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request application');
    } finally {
      setRequestingJobId(null);
    }
  };

  const getAppForJob = (jobId: number): Application | undefined => applications.find(app => app.jobId === jobId);

  const openViewJob = async (job: JobWithFit) => {
    setViewJob(job);
    try {
      const fullJob = await jobApi.getById(job.id);
      setViewJob({ ...fullJob, fitScore: job.fitScore, successRate: job.successRate, breakdown: job.breakdown } as JobWithFit);
    } catch {
      // keep existing
    }
  };

  const filteredJobs = jobs
    .filter(job => {
      const score = job.fitScore ?? 0;
      if (score < minMatch) return false;
      if (locationFilter.trim() && !(job.location || '').toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
      }
      const hasApplied = applications.some(app => app.jobId === job.id);
      if (hasApplied) return false;
      return true;
    })
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

  const totalItems = filteredJobs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIdx = totalItems > 0 ? (currentPage - 1) * pageSize : 0;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedJobs = filteredJobs.slice(startIdx, endIdx);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const avgScore = jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.fitScore ?? 0), 0) / jobs.length) : 0;
  const highFitCount = jobs.filter(j => (j.fitScore ?? 0) >= 75).length;

  return (
    <>
      {selectedJob && <FitBreakdownPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
      {viewJob && (
        <JobDetailsModal
          job={viewJob}
          onClose={() => setViewJob(null)}
          onRequestApply={handleRequestApply}
          application={getAppForJob(viewJob.id)}
          isRequesting={requestingJobId === viewJob.id}
          onUpdateApplication={loadData}
        />
      )}

      <div className="space-y-6 animate-fadeIn">

        {/* Summary Stats */}
        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('jobs.title', { defaultValue: 'Jobs Listed' }),   value: jobs.length,         icon: Briefcase,  color: '#818cf8' },
              { label: 'Avg Match',     value: `${avgScore}%`,      icon: TrendingUp, color: '#60a5fa' },
              { label: 'High Fit 75%+', value: highFitCount,        icon: Star,       color: '#34d399' },
              { label: 'Applied',       value: applications.length, icon: Send,       color: '#fbbf24' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-xl p-4 flex items-center gap-3 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-700/60" style={{ backgroundColor: stat.color + '20' }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white">Recommended Jobs</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Jobs ranked by your profile match score. Click <strong>View Details</strong> to see full job info & your match breakdown.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/60">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" /> Sorted by Fit Score
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search job title or company..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-700/80 rounded-xl bg-slate-800/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>MIN FIT SCORE</span>
                <span className="text-blue-400">{minMatch}% +</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={minMatch} onChange={e => setMinMatch(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{ background: `linear-gradient(to right, #3b82f6 ${minMatch}%, #334155 ${minMatch}%)` }} />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                placeholder="Filter by location..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-700/80 rounded-xl bg-slate-800/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>
          </div>

          {/* States */}
          {loading && (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Calculating your fit scores...</p>
            </div>
          )}
          {error && (
            <div className="m-6 flex items-center gap-3 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300">
              <XCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && filteredJobs.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Briefcase className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No matching jobs found</p>
              <p className="text-xs text-slate-400 max-w-xs text-center">Try adjusting your filters or complete more profile sections to raise your fit scores.</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filteredJobs.length > 0 && (
            <div>
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-700/60 bg-slate-900/80">
                <div className="col-span-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Job Details</div>
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Match Score</div>
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Success Rate</div>
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {paginatedJobs.map(job => {
                  const score = job.fitScore ?? 0;
                  const successRate = job.successRate ?? 0;
                  const col = scoreColor(score);
                  const app = getAppForJob(job.id);

                  return (
                    <div key={job.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-700/50 bg-slate-900/30 transition-colors group">
                      {/* Job Details */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-sm font-black shadow-sm border border-slate-700/60" style={{ backgroundColor: col.bg, color: col.ring }}>
                          {job.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{job.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Briefcase className="w-3 h-3 shrink-0" />{job.company}
                            {job.location && <><span className="text-slate-600">·</span><MapPin className="w-3 h-3 shrink-0" />{job.location}</>}
                          </p>
                          {job.jobRole && (
                            <span className="mt-1 inline-flex text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.5 rounded-full">{job.jobRole.name}</span>
                          )}
                        </div>
                      </div>

                      {/* Match Score */}
                      <div className="col-span-2 flex items-center gap-3">
                        <ScoreRing score={score} size={48} />
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${col.badge}`}>{scoreLabel(score)}</span>
                          <button className="mt-1 flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                            onClick={e => { e.stopPropagation(); setSelectedJob(job); }}>
                            <Info className="w-2.5 h-2.5" /> breakdown
                          </button>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="col-span-2">
                        <p className="text-sm font-black" style={{ color: col.ring }}>{successRate}%</p>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 w-16">
                          <div className="h-full rounded-full" style={{ width: `${successRate}%`, backgroundColor: col.ring }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Est. success</p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        {app ? (
                          STATUS_STYLES[app.status] ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${STATUS_STYLES[app.status].className}`}>
                              {(() => {
                                const Icon = STATUS_STYLES[app.status].icon;
                                return <Icon className="w-3 h-3" />;
                              })()}{STATUS_STYLES[app.status].label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border bg-slate-800 text-slate-300 border-slate-700">
                              <Clock className="w-3 h-3" />{app.status.toUpperCase().replace(/_/g, ' ')}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border bg-purple-950/60 text-purple-300 border-purple-800/60">
                            <Info className="w-3 h-3" />Recommended
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="col-span-2">
                        <button onClick={() => openViewJob(job)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all w-fit cursor-pointer">
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-slate-400">
                    Showing <strong className="text-slate-200">{totalItems > 0 ? startIdx + 1 : 0}</strong> to <strong className="text-slate-200">{endIdx}</strong> of <strong className="text-slate-200">{totalItems}</strong> jobs
                    {jobs.length !== totalItems && <span className="text-slate-400 ml-1">(filtered from {jobs.length} total)</span>}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {getPageNumbers().map(p => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/30'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 flex items-center gap-1 border-l border-slate-800 pl-3">
                    <Eye className="w-3 h-3 text-blue-400" /> Click <strong className="text-slate-200 mx-0.5">View Details</strong> for actions & comments log
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Low score tip */}
        {!loading && jobs.length > 0 && avgScore < 30 && (
          <div className="bg-amber-950/60 border border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-900/80 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-200">Your average match is low ({avgScore}%)</p>
              <p className="text-xs text-amber-400 mt-0.5">
                Complete your profile — add <strong>job roles</strong>, <strong>IT skills</strong>, <strong>addresses</strong>, and <strong>work experience</strong> — to improve your match scores.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
