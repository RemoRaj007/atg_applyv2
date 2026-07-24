import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { anonymousDiscoveryApi } from '../../api/anonymousDiscoveryApi';
import type { AnonymousDiscoveryProfile, AIOperator, AnonymousJobMatch } from '../../api/anonymousDiscoveryApi';
import ConfirmModal from '../../components/ui/ConfirmModal';
import {
  ShieldAlert, Settings, Briefcase, MapPin, Key, Cpu, RotateCw, Play, Bookmark, BookmarkCheck,
  Building, Info, ExternalLink, RefreshCw, PlusCircle, Trash, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function AnonymousJobDiscovery() {
  const [profile, setProfile] = useState<AnonymousDiscoveryProfile | null>(null);
  const [operators, setOperators] = useState<AIOperator[]>([]);
  const [matches, setMatches] = useState<AnonymousJobMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Profile Form State
  const [industry, setIndustry] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [remotePreference, setRemotePreference] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [skillsKeywords, setSkillsKeywords] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');

  // Operator Form State
  const [newOpName, setNewOpName] = useState('');
  const [newOpFreq, setNewOpFreq] = useState<'hourly' | 'daily' | 'weekly' | 'manual'>('daily');
  const [isAddingOperator, setIsAddingOperator] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const prof = await anonymousDiscoveryApi.getProfile();
      setProfile(prof);
      setIndustry(prof.industry || '');
      setTargetRole(prof.targetRole || '');
      setRemotePreference(prof.remotePreference || 'any');
      setSalaryMin(prof.salaryMin || '');
      setSalaryMax(prof.salaryMax || '');
      setSkillsKeywords(prof.skillsKeywords || '');
      setExperienceYears(prof.experienceYears || '');

      const ops = await anonymousDiscoveryApi.getOperators();
      setOperators(ops);

      const mtch = await anonymousDiscoveryApi.getMatches();
      setMatches(mtch);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await anonymousDiscoveryApi.updateProfile({
        industry,
        targetRole,
        remotePreference,
        salaryMin: salaryMin === '' ? null : Number(salaryMin),
        salaryMax: salaryMax === '' ? null : Number(salaryMax),
        skillsKeywords,
        experienceYears: experienceYears === '' ? null : Number(experienceYears),
      });
      setProfile(updated);
      setMessage({ type: 'success', text: 'Anonymized Discovery Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName.trim()) return;
    setMessage(null);
    try {
      const newOp = await anonymousDiscoveryApi.createOperator({
        name: newOpName,
        runFrequency: newOpFreq,
        isActive: true,
      });
      setOperators([...operators, newOp]);
      setNewOpName('');
      setIsAddingOperator(false);
      setMessage({ type: 'success', text: `AI Operator "${newOp.name}" deployed successfully!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to deploy operator.' });
    }
  };

  const handleToggleOperator = async (opId: number, currentActive: boolean) => {
    try {
      const updated = await anonymousDiscoveryApi.toggleOperator(opId, !currentActive);
      setOperators(operators.map(op => op.id === opId ? updated : op));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update operator state.' });
    }
  };

  const [opToDelete, setOpToDelete] = useState<AIOperator | null>(null);

  const handleDeleteOperator = async () => {
    if (!opToDelete) return;
    try {
      await anonymousDiscoveryApi.deleteOperator(opToDelete.id);
      setOperators(operators.filter(op => op.id !== opToDelete.id));
      toast.success('AI Operator removed.');
      setOpToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete operator.');
    }
  };

  const handleRunDiscovery = async () => {
    setIsRunning(true);
    setMessage(null);
    try {
      const newMatches = await anonymousDiscoveryApi.runDiscovery();
      setMatches(newMatches);
      setMessage({ type: 'success', text: `Scraping & AI Matching Completed! Found ${newMatches.length} matches.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error running discovery scraper.' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleBookmark = async (matchId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'bookmarked' ? 'new' : 'bookmarked';
    try {
      const updated = await anonymousDiscoveryApi.updateMatchStatus(matchId, nextStatus);
      setMatches(matches.map(m => m.id === matchId ? updated : m));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update bookmark status.' });
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-300 bg-emerald-950/60 border-emerald-800/60';
    if (score >= 50) return 'text-amber-300 bg-amber-950/60 border-amber-800/60';
    return 'text-rose-300 bg-rose-950/60 border-rose-800/60';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400">
              <ShieldAlert size={24} />
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Anonymous AI Job Discovery</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Deploy AI Search Operators to scrape global markets matching your preferences while keeping your identity 100% private.
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border text-sm font-medium transition-all ${
          message.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
        }`}>
          {message.text}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Anonymous Search Profile & AI Operators */}
        <div className="lg:col-span-1 space-y-8">
          {/* Profile Card */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl p-6 space-y-6 backdrop-blur-sm text-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-4">
              <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">1. Anonymous Search Profile</h2>
                <p className="text-xs text-slate-400">Define search bounds (No personal data) {profile && `• Saved: ${new Date(profile.updatedAt).toLocaleDateString()}`}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Industry</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="e.g. Technology, Finance"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Target Job Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="e.g. Frontend React Developer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Min Salary ($)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="Min"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Max Salary ($)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="Max"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Remote Option</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white outline-none text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    value={remotePreference}
                    onChange={(e: any) => setRemotePreference(e.target.value)}
                  >
                    <option value="any">Any</option>
                    <option value="remote">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-Site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Exp. Years</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="e.g. 2"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Keywords & Tech Stack</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                  <textarea
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none"
                    placeholder="e.g. React, Node.js, GraphQL, AWS"
                    value={skillsKeywords}
                    onChange={(e) => setSkillsKeywords(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="animate-spin w-4 h-4" /> Saving Profile...
                  </>
                ) : (
                  'Save Profile Bounds'
                )}
              </button>
            </form>
          </div>

          {/* AI Operators Card */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl p-6 space-y-6 backdrop-blur-sm text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
                  <Cpu size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">2. Deployed AI Operators</h2>
                  <p className="text-xs text-slate-400">Autonomous search agents</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingOperator(!isAddingOperator)}
                className="p-1.5 text-blue-400 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
              >
                <PlusCircle size={22} />
              </button>
            </div>

            {isAddingOperator && (
              <form onSubmit={handleCreateOperator} className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3">
                <p className="text-xs font-bold text-white">Deploy New Market Searcher</p>
                <input
                  type="text"
                  placeholder="Operator Name (e.g. LinkedIn Finder)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 text-sm font-medium bg-slate-800 text-white outline-none"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  required
                />
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 text-sm font-medium bg-slate-800 text-white outline-none"
                  value={newOpFreq}
                  onChange={(e: any) => setNewOpFreq(e.target.value)}
                >
                  <option value="manual">Manual Trigger Only</option>
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Daily Run (Auto)</option>
                  <option value="weekly">Weekly Run (Auto)</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg cursor-pointer"
                  >
                    Deploy
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingOperator(false)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {operators.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No AI Operators deployed.</p>
              ) : (
                operators.map(op => (
                  <div key={op.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-700/60 hover:bg-slate-700/50 bg-slate-900/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">{op.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded-full capitalize">{op.runFrequency}</span>
                        <span className="text-[10px] text-slate-400">
                          Last run: {op.lastRunAt ? new Date(op.lastRunAt).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleOperator(op.id, op.isActive)}
                        className={`p-1 rounded-full transition-colors ${op.isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {op.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                      </button>
                      <button
                        onClick={() => setOpToDelete(op)}
                        className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleRunDiscovery}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="animate-spin w-4.5 h-4.5" /> Scraping & Matching...
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current" /> Trigger Operator Scrape Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Fit Matches display */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">AI Profile-Fit Matches</h2>
              <p className="text-sm text-slate-400">Externally scraped market jobs matched to your anonymous preferences</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <RotateCw size={18} />
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/80 border border-slate-700/60 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 space-y-4 text-slate-100">
              <div className="p-4 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-400">
                <Briefcase size={36} />
              </div>
              <h3 className="text-lg font-bold text-white">No Job Matches Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Ensure you have saved your search bounds, then click "Trigger Operator Scrape Now" to fetch live matching jobs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map(job => (
                <div
                  key={job.id}
                  className="bg-slate-800/80 rounded-3xl border border-slate-700/60 p-6 shadow-xl hover:border-slate-600/80 transition-all relative overflow-hidden text-slate-100 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{job.jobTitle}</h3>
                        {job.status === 'bookmarked' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
                            Bookmarked
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Building size={14} className="text-slate-500" /> {job.companyName || 'Confidential'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-500" /> {job.location || 'Remote'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Fit Score Badge */}
                      <div className={`flex flex-col items-center border px-3 py-1.5 rounded-2xl ${scoreColor(job.fitScore)}`}>
                        <span className="text-xs font-bold uppercase tracking-widest leading-none">Fit</span>
                        <span className="text-lg font-black leading-none mt-1">{job.fitScore}%</span>
                      </div>

                      {/* Bookmark Icon */}
                      <button
                        onClick={() => handleToggleBookmark(job.id, job.status)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          job.status === 'bookmarked' 
                            ? 'bg-amber-950/80 border-amber-800/60 text-amber-400' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700/80'
                        }`}
                      >
                        {job.status === 'bookmarked' ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-3">
                    <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">{job.description}</p>
                    
                    <div className="p-3 bg-blue-950/60 rounded-2xl border border-blue-800/60 flex items-start gap-2.5">
                      <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">AI Reasoning</p>
                        <p className="text-xs text-blue-200 leading-normal">{job.fitReason}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60">
                    <span>Scraped from: Market via Apify</span>
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:underline font-semibold"
                      >
                        View Original Posting <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!opToDelete}
        title="Delete AI Operator"
        message={`Are you sure you want to stop and delete "${opToDelete?.name}"?`}
        confirmText="Delete Operator"
        confirmVariant="danger"
        onConfirm={handleDeleteOperator}
        onCancel={() => setOpToDelete(null)}
      />
    </div>
  );
}
