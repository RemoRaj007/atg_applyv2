import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Link2, Send, CheckCircle2, Clock, Star, MessageSquare, ExternalLink,
  Plus, Search, RefreshCw, X, UserCheck, AlertTriangle
} from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useApprovalQueue } from '../../hooks/useApprovalQueue';
import { applicationApi } from '../../api/applicationApi';
import type { Application } from '../../types/application.types';
import BackButton from '../../components/ui/BackButton';
import FitBadge from '../../components/ui/FitBadge';

export default function CandidateJobLinksPage() {
  const { user } = useSession();
  const { applications, loading, error, refetch } = useApprovalQueue();

  // Filter only job link requests
  const linkRequests = applications.filter((app) => !!app.jobLinkRequest || app.status === 'link_request');
  
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Form states
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState('');
  const [newJobComment, setNewJobComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat message state
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Filter tab state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'applied'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-select first request if none selected
  useEffect(() => {
    if (linkRequests.length > 0 && !selectedAppId) {
      setSelectedAppId(linkRequests[0].id);
      setSelectedApp(linkRequests[0]);
    } else if (selectedAppId) {
      const updated = linkRequests.find((a) => a.id === selectedAppId);
      if (updated) setSelectedApp(updated);
    }
  }, [applications, selectedAppId]);

  // Scroll chat to bottom on app change or new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedApp?.comments]);

  const handleSelectApp = (app: Application) => {
    setSelectedAppId(app.id);
    setSelectedApp(app);
  };

  // Submit new job link request
  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobUrl.trim()) {
      toast.error('Please enter a valid job URL');
      return;
    }
    setIsSubmitting(true);
    try {
      const newApp = await applicationApi.submitLinkRequest(newJobUrl.trim(), newJobComment.trim() || undefined);
      toast.success('Job link request submitted to operator!');
      setNewJobUrl('');
      setNewJobComment('');
      setIsSubmitFormOpen(false);
      await refetch();
      if (newApp?.id) {
        setSelectedAppId(newApp.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit job link');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send message to operator
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !messageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const updatedApp = await applicationApi.addComment(selectedApp.id, messageText.trim());
      toast.success('Message sent to operator');
      setMessageText('');
      setSelectedApp(updatedApp);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Confirm and apply for job
  const handleConfirmApply = async () => {
    if (!selectedApp) return;
    try {
      await applicationApi.confirmApply(selectedApp.id);
      toast.success('Application confirmed successfully!');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm application');
    }
  };

  // Filtered requests
  const filteredRequests = linkRequests.filter((app) => {
    if (statusFilter === 'pending' && app.status !== 'link_request') return false;
    if (statusFilter === 'reviewed' && app.status !== 'fit_reviewed') return false;
    if (statusFilter === 'applied' && !['candidate_applied', 'approved', 'processing', 'completed'].includes(app.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUrl = app.jobLinkRequest?.toLowerCase().includes(q);
      const matchOp = app.staff?.name?.toLowerCase().includes(q);
      const matchStatus = app.status?.toLowerCase().includes(q);
      return matchUrl || matchOp || matchStatus;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'link_request':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Review
          </span>
        );
      case 'fit_reviewed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <Star className="w-3.5 h-3.5" /> Fit Score Ready
          </span>
        );
      case 'candidate_applied':
      case 'completed':
      case 'approved':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Applied
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div>
          <div className="mb-3">
            <BackButton label="Back to Dashboard" to="/candidate" variant="dark" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Link2 className="w-8 h-8 text-blue-400" />
            Job Link Requests & Operator Desk
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Submit custom job posting links, receive detailed operator fit reviews, and message your operator directly.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSubmitFormOpen((prev) => !prev)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>{isSubmitFormOpen ? 'Close Form' : 'Submit New Job Link'}</span>
        </button>
      </div>

      {/* ── Submission Form Drawer ── */}
      {isSubmitFormOpen && (
        <form
          onSubmit={handleSubmitLink}
          className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Send External Job Link to Operator</h3>
                <p className="text-xs text-slate-400">Free fit review evaluation — no quota deducted until you confirm application</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSubmitFormOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Job Posting URL <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  required
                  value={newJobUrl}
                  onChange={(e) => setNewJobUrl(e.target.value)}
                  placeholder="e.g. https://www.linkedin.com/jobs/view/123456789"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Optional Notes for Operator
              </label>
              <input
                type="text"
                value={newJobComment}
                onChange={(e) => setNewJobComment(e.target.value)}
                placeholder="e.g. I prefer remote roles. Please highlight matching skills."
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSubmitFormOpen(false)}
              className="px-5 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Link...' : 'Submit to Operator'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── Main Master-Detail Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* LEFT COLUMN: Request List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
          {/* Header & Filter Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Submitted Requests ({linkRequests.length})
              </h2>
              <button
                onClick={() => refetch()}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job links or operators..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({linkRequests.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'pending'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Awaiting ({linkRequests.filter((a) => a.status === 'link_request').length})
              </button>
              <button
                onClick={() => setStatusFilter('reviewed')}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'reviewed'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Reviewed ({linkRequests.filter((a) => a.status === 'fit_reviewed').length})
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && <p className="text-xs text-slate-400 p-4 animate-pulse">Loading job links...</p>}
            {error && <p className="text-xs text-rose-400 p-4">{error}</p>}
            {!loading && filteredRequests.length === 0 && (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl">
                <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">No job link requests found.</p>
                <button
                  type="button"
                  onClick={() => setIsSubmitFormOpen(true)}
                  className="mt-3 text-xs text-blue-400 hover:underline font-bold"
                >
                  + Submit a job link
                </button>
              </div>
            )}

            {filteredRequests.map((app) => {
              const isSelected = selectedAppId === app.id;
              const displayUrl = app.jobLinkRequest || 'Custom Job Link';
              let domain = 'Job Link';
              try {
                if (app.jobLinkRequest) {
                  domain = new URL(app.jobLinkRequest).hostname.replace('www.', '');
                }
              } catch {
                // A candidate can paste anything into the link field, so a value
                // that will not parse is expected, not exceptional — keep the
                // 'Job Link' placeholder. Nothing to report: this runs during
                // render, once per row.
              }

              return (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                        <Link2 size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white capitalize truncate max-w-[150px]">{domain}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {app.fitScore != null && <FitBadge score={app.fitScore} />}
                  </div>

                  <p className="text-xs text-slate-300 font-mono truncate mb-2.5 opacity-90">{displayUrl}</p>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <UserCheck size={12} className="text-blue-400" />
                      {app.staff?.name || 'Unassigned Operator'}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Master Details & Two-Way Live Communication (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          {selectedApp ? (
            <>
              {/* Top Details & Operator Review Banner */}
              <div className="space-y-5 border-b border-slate-800 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800 px-2.5 py-0.5 rounded-full">
                        Request ID #{selectedApp.id}
                      </span>
                      {getStatusBadge(selectedApp.status)}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                      <span>External Job Link Request</span>
                    </h2>
                  </div>

                  {selectedApp.jobLinkRequest && (
                    <a
                      href={selectedApp.jobLinkRequest}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
                    >
                      <span>Open External Posting</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                {/* URL Display */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono text-blue-300">
                  <span className="truncate">{selectedApp.jobLinkRequest}</span>
                  <span className="text-[10px] text-slate-500 font-sans shrink-0">Submitted {new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Operator Fit Review Assessment Card (If Completed) */}
                {selectedApp.status === 'fit_reviewed' && (
                  <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Star size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-white">Operator Fit Assessment Ready</h4>
                          <p className="text-xs text-slate-400">Assessed by {selectedApp.staff?.name || 'Operator'}</p>
                        </div>
                      </div>
                      {selectedApp.fitScore != null && <FitBadge score={selectedApp.fitScore} />}
                    </div>

                    {selectedApp.operatorFitNote && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                        "{selectedApp.operatorFitNote}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        Happy with this fit review? Click to confirm and proceed to application.
                      </span>
                      <button
                        type="button"
                        onClick={handleConfirmApply}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>Confirm & Apply Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* TWO-WAY LIVE COMMUNICATION THREAD */}
              <div className="flex-1 flex flex-col space-y-4 min-h-[350px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Operator Communication Thread</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Assigned Operator: <strong className="text-blue-300">{selectedApp.staff?.name || 'Operator Queue'}</strong>
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[360px] p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  {/* Initial candidate comment if provided */}
                  {selectedApp.candidateComment && (
                    <div className="flex flex-col items-end">
                      <div className="max-w-[80%] bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs space-y-1 shadow-md">
                        <p className="font-bold text-[10px] text-blue-200">You (Initial Note)</p>
                        <p className="leading-relaxed">{selectedApp.candidateComment}</p>
                      </div>
                    </div>
                  )}

                  {/* Thread comments */}
                  {selectedApp.comments && selectedApp.comments.length > 0 ? (
                    selectedApp.comments.map((comment: any) => {
                      const isMe = comment.senderId === user?.id || comment.sender?.role === 'candidate';
                      return (
                        <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                              <span className="font-bold">{isMe ? 'You' : comment.sender?.name || 'Operator'}</span>
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
                        <p>No messages yet. Send a message to your assigned operator below.</p>
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
                    placeholder={`Type a message to ${selectedApp.staff?.name || 'Operator'}...`}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send size={14} />
                    <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
              <Link2 className="w-12 h-12 mb-3 text-slate-700" />
              <h3 className="text-base font-bold text-slate-300">Select a Job Link Request</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose a request from the left list to view operator assessment details and communicate directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
