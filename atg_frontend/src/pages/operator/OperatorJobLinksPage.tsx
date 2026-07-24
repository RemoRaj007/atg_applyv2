import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Link2, Send, CheckCircle2, Star, MessageSquare, ExternalLink, User,
  Search, RefreshCw, UserCheck, Layers
} from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { applicationApi } from '../../api/applicationApi';
import type { Application } from '../../types/application.types';
import BackButton from '../../components/ui/BackButton';
import FitBadge from '../../components/ui/FitBadge';

export default function OperatorJobLinksPage() {
  const { user } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Assessment Form State
  const [fitScore, setFitScore] = useState<number>(85);
  const [operatorFitNote, setOperatorFitNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Chat message state
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'my_booked' | 'reviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await applicationApi.list();
      // Filter only job link requests
      const linksOnly = data.filter((app: Application) => !!app.jobLinkRequest || app.status === 'link_request');
      setApplications(linksOnly);

      if (linksOnly.length > 0 && !selectedAppId) {
        setSelectedAppId(linksOnly[0].id);
        setSelectedApp(linksOnly[0]);
        setFitScore(linksOnly[0].fitScore || 85);
        setOperatorFitNote(linksOnly[0].operatorFitNote || '');
      } else if (selectedAppId) {
        const updated = linksOnly.find((a) => a.id === selectedAppId);
        if (updated) {
          setSelectedApp(updated);
          setFitScore(updated.fitScore || 85);
          setOperatorFitNote(updated.operatorFitNote || '');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job link requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedApp?.comments]);

  const handleSelectApp = (app: Application) => {
    setSelectedAppId(app.id);
    setSelectedApp(app);
    setFitScore(app.fitScore || 85);
    setOperatorFitNote(app.operatorFitNote || '');
  };

  // Book request for operator
  const handleBook = async () => {
    if (!selectedApp) return;
    try {
      const updated = await applicationApi.book(selectedApp.id);
      toast.success('Job link request booked to your queue!');
      setSelectedApp(updated);
      await fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to book application');
    }
  };

  // Submit Fit Assessment
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsSubmittingReview(true);
    try {
      const updated = await applicationApi.submitFitReview(selectedApp.id, fitScore, operatorFitNote.trim() || undefined);
      toast.success('Fit assessment submitted to candidate!');
      setSelectedApp(updated);
      await fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit fit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Send message to candidate
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !messageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const updatedApp = await applicationApi.addComment(selectedApp.id, messageText.trim());
      toast.success('Reply sent to candidate');
      setMessageText('');
      setSelectedApp(updatedApp);
      await fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'unassigned' && app.staffId) return false;
    if (statusFilter === 'my_booked' && app.staffId !== user?.id) return false;
    if (statusFilter === 'reviewed' && app.status !== 'fit_reviewed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCandidate = app.user?.name?.toLowerCase().includes(q) || app.user?.email?.toLowerCase().includes(q);
      const matchUrl = app.jobLinkRequest?.toLowerCase().includes(q);
      return matchCandidate || matchUrl;
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div>
          <div className="mb-3">
            <BackButton label="Back to Operator Dashboard" to="/operator" variant="dark" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-400" />
            Operator Job Link Requests & Review Desk
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Review candidate-submitted job URLs, calculate fit scores, write assessments, and chat directly with candidates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchApplications()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* ── Main Master-Detail Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* LEFT COLUMN: Request Queue (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Incoming Requests ({applications.length})
              </h2>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, email, or URL..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({applications.length})
              </button>
              <button
                onClick={() => setStatusFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'unassigned'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Unassigned ({applications.filter((a) => !a.staffId).length})
              </button>
              <button
                onClick={() => setStatusFilter('my_booked')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'my_booked'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                My Booked ({applications.filter((a) => a.staffId === user?.id).length})
              </button>
              <button
                onClick={() => setStatusFilter('reviewed')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'reviewed'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Reviewed ({applications.filter((a) => a.status === 'fit_reviewed').length})
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && <p className="text-xs text-slate-400 p-4 animate-pulse">Loading request queue...</p>}
            {error && <p className="text-xs text-rose-400 p-4">{error}</p>}
            {!loading && filteredApps.length === 0 && (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No job link requests found.</p>
              </div>
            )}

            {filteredApps.map((app) => {
              const isSelected = selectedAppId === app.id;
              let domain = 'Job Link';
              try {
                if (app.jobLinkRequest) {
                  domain = new URL(app.jobLinkRequest).hostname.replace('www.', '');
                }
              } catch {}

              return (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[140px]">{app.user?.name || 'Candidate'}</p>
                        <p className="text-[10px] text-slate-400">{domain}</p>
                      </div>
                    </div>
                    {app.fitScore != null && <FitBadge score={app.fitScore} />}
                  </div>

                  <p className="text-xs text-slate-300 font-mono truncate mb-2 opacity-90">{app.jobLinkRequest}</p>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                    <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-indigo-300">{app.staff?.name || 'Unassigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Operator Review Form & Live Communication Chat (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          {selectedApp ? (
            <>
              {/* Header & Candidate Summary */}
              <div className="space-y-5 border-b border-slate-800 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-950 border border-indigo-800 px-2.5 py-0.5 rounded-full">
                        Candidate: {selectedApp.user?.name} ({selectedApp.user?.email})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Status: {selectedApp.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-2">Job Link Assessment Desk</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedApp.staffId && (
                      <button
                        type="button"
                        onClick={handleBook}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <UserCheck size={14} />
                        <span>Book to My Queue</span>
                      </button>
                    )}
                    {selectedApp.jobLinkRequest && (
                      <a
                        href={selectedApp.jobLinkRequest}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        <span>Open Link</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* URL Display */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-indigo-300 flex items-center justify-between gap-3">
                  <span className="truncate">{selectedApp.jobLinkRequest}</span>
                  <span className="text-[10px] text-slate-500 font-sans shrink-0">Submitted {new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                </div>

                {/* OPERATOR FIT REVIEW ASSESSMENT FORM */}
                <form onSubmit={handleSubmitReview} className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" /> Operator Fit Assessment
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-300">Fit Score: {fitScore}%</span>
                      <FitBadge score={fitScore} />
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Set Fit Score (0% to 100%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fitScore}
                      onChange={(e) => setFitScore(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Written Fit Note / Guidance for Candidate
                    </label>
                    <textarea
                      rows={2}
                      value={operatorFitNote}
                      onChange={(e) => setOperatorFitNote(e.target.value)}
                      placeholder="Provide reasoning for fit score (e.g. Strong alignment with candidate's React experience, visa sponsorship confirmed...)"
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isSubmittingReview ? 'Submitting...' : 'Save & Send Fit Review to Candidate'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* LIVE TWO-WAY COMMUNICATION THREAD */}
              <div className="flex-1 flex flex-col space-y-4 min-h-[350px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Live Conversation Thread with {selectedApp.user?.name}</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Candidate Email: <strong className="text-indigo-300">{selectedApp.user?.email}</strong>
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[360px] p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  {/* Candidate initial comment */}
                  {selectedApp.candidateComment && (
                    <div className="flex flex-col items-start">
                      <div className="max-w-[80%] bg-slate-800 border border-slate-700 text-slate-100 p-3.5 rounded-2xl rounded-tl-none text-xs space-y-1 shadow-md">
                        <p className="font-bold text-[10px] text-indigo-300">{selectedApp.user?.name} (Candidate Initial Note)</p>
                        <p className="leading-relaxed">{selectedApp.candidateComment}</p>
                      </div>
                    </div>
                  )}

                  {/* Thread comments */}
                  {selectedApp.comments && selectedApp.comments.length > 0 ? (
                    selectedApp.comments.map((comment: any) => {
                      const isMe = comment.senderId === user?.id || comment.sender?.role === 'operator' || comment.sender?.role === 'admin';
                      return (
                        <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                              <span className="font-bold">{isMe ? 'You (Operator)' : comment.sender?.name || 'Candidate'}</span>
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    !selectedApp.candidateComment && (
                      <div className="text-center py-10 text-slate-500 text-xs">
                        <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                        <p>No chat messages yet. Reply to the candidate below.</p>
                      </div>
                    )
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Reply to candidate ${selectedApp.user?.name}...`}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send size={14} />
                    <span>{isSendingMessage ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
              <Layers className="w-12 h-12 mb-3 text-slate-700" />
              <h3 className="text-base font-bold text-slate-300">Select a Job Link Request</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select a request from the queue to calculate fit score, submit review, and chat with the candidate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
