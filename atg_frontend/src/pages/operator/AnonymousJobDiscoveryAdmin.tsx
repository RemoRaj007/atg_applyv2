import { useEffect, useState } from 'react';
import { anonymousDiscoveryApi } from '../../api/anonymousDiscoveryApi';
import type { AdminDiscoveryProfileDetails } from '../../api/anonymousDiscoveryApi';
import {
  Cpu, Users, Briefcase, TrendingUp, RefreshCw, ShieldAlert, Play, Building, MapPin, Info, ExternalLink
} from 'lucide-react';

export default function AnonymousJobDiscoveryAdmin() {
  const [profiles, setProfiles] = useState<AdminDiscoveryProfileDetails[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningMap, setIsRunningMap] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await anonymousDiscoveryApi.adminGetAllProfiles();
      setProfiles(data);
      if (data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load discovery profiles.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiscoveryForProfile = async (profileId: number) => {
    setIsRunningMap(prev => ({ ...prev, [profileId]: true }));
    setMessage(null);
    try {
      const matches = await anonymousDiscoveryApi.adminRunDiscoveryForProfile(profileId);
      setMessage({ type: 'success', text: `Scraper finished for Profile #${profileId}. Generated ${matches.length} matches.` });
      
      // Reload profiles to refresh job match list
      const data = await anonymousDiscoveryApi.adminGetAllProfiles();
      setProfiles(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || `Failed to run discovery for Profile #${profileId}.` });
    } finally {
      setIsRunningMap(prev => ({ ...prev, [profileId]: false }));
    }
  };

  // Metrics
  const totalProfiles = profiles.length;
  const totalOperators = profiles.reduce((sum, p) => sum + (p.operators?.length || 0), 0);
  const totalMatches = profiles.reduce((sum, p) => sum + (p.matches?.length || 0), 0);
  
  let totalScoreSum = 0;
  let scoreCount = 0;
  profiles.forEach(p => {
    p.matches?.forEach(m => {
      totalScoreSum += m.fitScore;
      scoreCount++;
    });
  });
  const avgFitScore = scoreCount > 0 ? Math.round(totalScoreSum / scoreCount) : 0;

  // Selected profile details
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Anonymous AI Job Operators Admin</h1>
          <p className="text-sm text-gray-500">Monitor active user discovery profiles, automate Apify scraping, and evaluate match statistics</p>
        </div>
        <button
          onClick={loadProfiles}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh Profiles
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border text-sm font-medium transition-all ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Profiles</p>
            <p className="text-2xl font-black text-gray-900">{totalProfiles}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deployed Operators</p>
            <p className="text-2xl font-black text-gray-900">{totalOperators}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Matches Found</p>
            <p className="text-2xl font-black text-gray-900">{totalMatches}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Fit Match</p>
            <p className="text-2xl font-black text-gray-900">{avgFitScore}%</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Candidates List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900 px-1">Candidate Profiles</h2>
          {profiles.length === 0 ? (
            <div className="text-center py-8 bg-white border border-dashed rounded-3xl text-gray-500 text-sm">
              No active candidate profiles.
            </div>
          ) : (
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
              {profiles.map(p => {
                const isActive = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : 'bg-white border-gray-100 text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                        Profile ID #{p.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.matches?.length || 0} Matches
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm mt-1.5 truncate">{p.targetRole || 'Software Engineer'}</h3>
                    <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {p.industry || 'Technology'}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-50 text-indigo-700 border border-slate-100'
                      }`}>
                        {p.remotePreference}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-50 text-indigo-700 border border-slate-100'
                      }`}>
                        {p.experienceYears ? `${p.experienceYears}y exp` : 'Any exp'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Candidate Details & Match List */}
        <div className="lg:col-span-8 space-y-6">
          {selectedProfile ? (
            <>
              {/* Profile Config Header */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-gray-900">
                      Profile ID #{selectedProfile.id} Details
                    </h2>
                    <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                      <ShieldAlert size={13} /> PII details, CV files, and experience lists are fully anonymized.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunDiscoveryForProfile(selectedProfile.id)}
                    disabled={isRunningMap[selectedProfile.id]}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {isRunningMap[selectedProfile.id] ? (
                      <>
                        <RefreshCw className="animate-spin w-4 h-4" /> Running Apify Scraper...
                      </>
                    ) : (
                      <>
                        <Play size={14} className="fill-current" /> Trigger Apify Run
                      </>
                    )}
                  </button>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Role</span>
                    <span className="font-bold text-gray-800">{selectedProfile.targetRole || 'Not specified'}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{selectedProfile.industry || 'Technology'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Preferences</span>
                    <span className="font-bold text-gray-800 capitalize">Setup: {selectedProfile.remotePreference}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Exp: {selectedProfile.experienceYears ? `${selectedProfile.experienceYears} Years` : 'Any'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Salary Range</span>
                    <span className="font-bold text-gray-800">
                      {selectedProfile.salaryMin ? `$${selectedProfile.salaryMin.toLocaleString()}` : '$0'} - {selectedProfile.salaryMax ? `$${selectedProfile.salaryMax.toLocaleString()}` : 'No limit'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tech Stack Keywords</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50/50 px-2.5 py-1 rounded-lg inline-block max-w-full truncate" title={selectedProfile.skillsKeywords}>
                      {selectedProfile.skillsKeywords || 'None'}
                    </span>
                  </div>
                </div>

                {/* Deployed Operators List */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Deployed AI Operators ({selectedProfile.operators?.length || 0})</h4>
                  {selectedProfile.operators && selectedProfile.operators.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {selectedProfile.operators.map(op => (
                        <div key={op.id} className="bg-white px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
                          <span className={`w-2 h-2 rounded-full ${op.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                          <span className="text-xs font-bold text-gray-700">{op.name}</span>
                          <span className="text-[10px] text-gray-400 capitalize bg-slate-50 px-1.5 py-0.5 rounded">({op.runFrequency})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No active autonomous search operators deployed for this profile.</p>
                  )}
                </div>
              </div>

              {/* Full Matches List with Job Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-extrabold text-gray-900">
                  All Matches ({selectedProfile.matches?.length || 0})
                </h3>

                {(!selectedProfile.matches || selectedProfile.matches.length === 0) ? (
                  <div className="text-center py-16 bg-white border border-dashed rounded-3xl p-8 space-y-4">
                    <div className="p-4 rounded-full bg-blue-50 text-blue-500 inline-block">
                      <Briefcase size={36} />
                    </div>
                    <h4 className="text-md font-bold text-gray-800">No Matches Found</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Click the "Trigger Apify Run" button above to run the scraper operator and discover matching jobs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProfile.matches.map(job => (
                      <div
                        key={job.id}
                        className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-gray-900">{job.jobTitle}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-gray-500">
                              <span className="flex items-center gap-1.5">
                                <Building size={14} className="text-gray-400" /> {job.companyName || 'Confidential'}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-gray-400" /> {job.location || 'Remote'}
                              </span>
                            </div>
                          </div>

                          <div className={`flex flex-col items-center border px-3 py-1.5 rounded-2xl ${scoreColor(job.fitScore)}`}>
                            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Fit Score</span>
                            <span className="text-lg font-black leading-none mt-1">{job.fitScore}%</span>
                          </div>
                        </div>

                        {/* Job Description & AI Reason */}
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Job Description</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{job.description}</p>
                          </div>
                          
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30 flex items-start gap-3">
                            <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Evaluation Reason</p>
                              <p className="text-xs text-indigo-900 leading-normal">{job.fitReason}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100">
                          <span>Scraped Market Data</span>
                          {job.jobUrl && (
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                            >
                              View Posting Details <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white border rounded-3xl text-gray-400 text-sm">
              Please select a candidate profile from the left side to see details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
