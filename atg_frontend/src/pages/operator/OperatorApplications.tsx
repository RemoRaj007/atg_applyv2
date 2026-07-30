import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { applicationApi } from '../../api/applicationApi';
import type { Application } from '../../types/application.types';
import StatusBadge from '../../components/ui/StatusBadge';
import FitBadge from '../../components/ui/FitBadge';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import OperatorProfileViewModal from './OperatorProfileViewModal';
import { MessageSquare, Send, CheckCircle, MapPin, Calendar, DollarSign, Briefcase, Globe, Award, Info, ExternalLink, Link2, Star } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { getFileUrl } from '../../utils/fileUrl';

interface OperatorApplicationsProps {
  onlyBooked?: boolean;
}

export default function OperatorApplications({ onlyBooked = false }: OperatorApplicationsProps) {
  const { user } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated Details & Processing Modal State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  
  // Comment loop states
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [postingComment, setPostingComment] = useState(false);

  // Processing state machine inputs
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [docNotes, setDocNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const [profileViewDetails, setProfileViewDetails] = useState<{ userId: number; fitScore?: number | null; fitReason?: string | null } | null>(null);

  // Fit review state (for link_request applications)
  const [fitReviewScore, setFitReviewScore] = useState<number>(75);
  const [fitReviewNote, setFitReviewNote] = useState('');
  const [submittingFitReview, setSubmittingFitReview] = useState(false);

  const fetchApplications = () => {
    setLoading(true);
    applicationApi
      .list(onlyBooked && user ? { staffId: user.id } : undefined)
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [onlyBooked, user]);

  const handleBook = async (appId: number) => {
    try {
      await applicationApi.book(appId);
      toast.success('Application booked successfully');
      fetchApplications();
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, staffId: user?.id || null } : null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to book application');
    }
  };

  const handlePostComment = async () => {
    if (!selectedApp || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const updated = await applicationApi.addComment(selectedApp.id, commentText.trim(), commentType);
      setCommentText('');
      setSelectedApp(updated);
      toast.success('Comment posted');
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleStatusProceed = async () => {
    if (!selectedApp) return;
    setProcessingAction(true);
    try {
      const updated = await applicationApi.update(selectedApp.id, { status: 'processing' });
      setSelectedApp(updated);
      toast.success('Application set to processing');
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to proceed application');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCompleteWithEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one relevant document or image file as application proof.');
      return;
    }
    setProcessingAction(true);
    try {
      const formData = new FormData();
      formData.append('status', 'completed');
      formData.append('operatorDocNotes', docNotes.trim());
      uploadFiles.forEach(file => {
        formData.append('proof', file);
      });

      const updated = await applicationApi.update(selectedApp.id, formData);
      setUploadFiles([]);
      setDocNotes('');
      setSelectedApp(updated);
      toast.success('Application completed with evidence!');
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete application and upload evidence');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubmitFitReview = async () => {
    if (!selectedApp) return;
    setSubmittingFitReview(true);
    try {
      const updated = await applicationApi.submitFitReview(selectedApp.id, fitReviewScore, fitReviewNote.trim() || undefined);
      setSelectedApp(updated);
      toast.success('Fit score review submitted');
      fetchApplications();
      setFitReviewNote('');
      setFitReviewScore(75);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit fit review');
    } finally {
      setSubmittingFitReview(false);
    }
  };


  const columns = [
    {
      key: 'job.title',
      label: 'Role / Opportunity',
      render: (app: Application) => {
        // Job Link Request (no job/scholarship attached)
        if (app.jobLinkRequest) {
          return (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <p className="font-bold text-gray-800 text-xs">Job Link Request</p>
              </div>
              <a href={app.jobLinkRequest} target="_blank" rel="noreferrer"
                className="text-[11px] text-blue-600 underline hover:text-blue-800 truncate block max-w-[180px]">
                {app.jobLinkRequest}
              </a>
            </div>
          );
        }
        if (app.job) {
          return (
            <div>
              <p className="font-bold text-gray-805">{app.job.title}</p>
              <p className="text-xs text-gray-400">{app.job.company} · {app.job.location || 'Remote'}</p>
            </div>
          );
        } else if (app.scholarship) {
          return (
            <div>
              <p className="font-bold text-gray-805">{app.scholarship.title}</p>
              <p className="text-xs text-purple-600 font-semibold">Scholarship · {app.scholarship.provider}</p>
            </div>
          );
        }
        return <span className="text-gray-400">—</span>;
      },
    },
    {
      key: 'user.name',
      label: 'Candidate / Applicant',
      render: (app: Application) => (
        <div>
          <p className="font-bold text-gray-805">{app.user.name}</p>
          <p className="text-xs text-gray-400">{app.user.email}</p>
        </div>
      ),
    },
    {
      key: 'fitScore',
      label: 'Fit Score',
      render: (app: Application) => (
        app.fitScore != null ? <div className="flex items-center space-x-1"><FitBadge score={app.fitScore} /><span className="text-xs font-bold text-gray-500">({app.fitScore}%)</span></div> : <span className="text-sm text-gray-400">—</span>
      ),
    },
    {
      key: 'staff',
      label: 'Assigned Operator',
      render: (app: Application) => (
        app.staff ? <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-full">{app.staff.name}</span> : <span className="text-xs text-gray-400 font-medium italic">Unstaffed</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (app: Application) => {
        if (app.status === 'link_request') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
              <Link2 className="w-3 h-3" /> Link Request
            </span>
          );
        }
        if (app.status === 'fit_reviewed') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-300">
              <Star className="w-3 h-3" /> Fit Sent
            </span>
          );
        }
        if (app.status === 'candidate_applied') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle className="w-3 h-3" /> Candidate Applied
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedApp(app)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
          >
            View Details
          </button>
          {!app.staffId && (
            <button
              onClick={() => handleBook(app.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all"
            >
              Book Application
            </button>
          )}
        </div>
      ),
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); }
    catch { return dateStr; }
  };

  const isBookedByMe = selectedApp && selectedApp.staffId === user?.id;

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-55 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-gray-800">
              {onlyBooked ? 'My Applications' : 'Applications Hub'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {onlyBooked
                ? 'Manage and proceed with workflows for applications you have booked.'
                : 'Browse and book candidate applications to start curating their workflows.'}
            </p>
          </div>
        </div>

        {loading && <p className="p-8 text-sm text-gray-500">Loading applications queue...</p>}
        {error && <p className="p-8 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={applications}
            searchPlaceholder="Search by job, company, candidate name or status..."
            searchKeys={['job.title', 'job.company', 'scholarship.title', 'scholarship.provider', 'user.name', 'status']}
            itemsPerPage={8}
            emptyMessage={onlyBooked ? 'You have not booked any applications yet.' : 'No applications currently staffed or requested.'}
          />
        )}
      </div>

      {/* Consolidated View & Process Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-55 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Application File: #{selectedApp.id}</h2>
                <p className="text-xs text-gray-500">
                  {selectedApp.job
                    ? `${selectedApp.job.title} @ ${selectedApp.job.company}`
                    : `${selectedApp.scholarship?.title} by ${selectedApp.scholarship?.provider}`}
                </p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Job / Scholarship Details */}
                <div className="lg:col-span-5 space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-150 shadow-inner">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 border-b border-gray-200/60 pb-3">
                    <Info className="w-4 h-4 text-blue-600" />
                    {selectedApp.job ? 'Job Opportunity Details' : 'Scholarship Details'}
                  </h3>

                  {selectedApp.job && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Role / Title</span>
                        <p className="text-base font-extrabold text-gray-905 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-600 shrink-0" />
                          {selectedApp.job.title}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Company</span>
                        <p className="text-sm font-bold text-gray-805">{selectedApp.job.company}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Location</span>
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {selectedApp.job.location || 'Remote'}
                          </p>
                        </div>
                        {selectedApp.job.locationType && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Workplace Type</span>
                            <p className="text-xs font-semibold text-gray-700 capitalize">{selectedApp.job.locationType}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedApp.job.experience && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Experience</span>
                            <p className="text-xs font-semibold text-gray-700">{selectedApp.job.experience}</p>
                          </div>
                        )}
                        {selectedApp.job.deadline && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Deadline</span>
                            <p className="text-xs font-semibold text-red-650 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(selectedApp.job.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedApp.job.source && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Source</span>
                          <p className="text-xs text-gray-650 flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-gray-450 shrink-0" />
                            {selectedApp.job.source}
                          </p>
                        </div>
                      )}

                      {selectedApp.job.jobUrl && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Job Posting URL</span>
                          <a
                            href={selectedApp.job.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                          >
                            View Original Post <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {selectedApp.job.fitReason && (
                        <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl">
                          <span className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">AI Recommendation / Fit Reason</span>
                          <p className="text-xs text-indigo-950 leading-relaxed font-sans font-medium">{selectedApp.job.fitReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedApp.scholarship && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Scholarship Name</span>
                        <p className="text-base font-extrabold text-gray-905 flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-650 shrink-0" />
                          {selectedApp.scholarship.title}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Provider</span>
                        <p className="text-sm font-bold text-gray-805">{selectedApp.scholarship.provider}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedApp.scholarship.amount !== null && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Funding Amount</span>
                            <p className="text-xs font-bold text-emerald-705 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 shrink-0" />
                              {selectedApp.scholarship.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        )}
                        {selectedApp.scholarship.deadline && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Deadline</span>
                            <p className="text-xs font-semibold text-red-650 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(selectedApp.scholarship.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedApp.scholarship.description && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Description</span>
                          <p className="text-xs text-gray-700 leading-relaxed font-sans bg-white p-3.5 rounded-xl border border-gray-150 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {selectedApp.scholarship.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Workflow status and progress / Comments thread */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Ownership / Booking Block */}
                  {!selectedApp.staffId && (
                    <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-2xl flex items-center justify-between animate-fadeIn">
                      <p className="text-xs text-emerald-800 font-semibold">
                        This application is not booked by any operator yet. Book it to start managing.
                      </p>
                      <Button variant="primary" onClick={() => handleBook(selectedApp.id)}>
                        Book Now
                      </Button>
                    </div>
                  )}

                  {selectedApp.staffId && !isBookedByMe && (
                    <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl">
                      <p className="text-xs text-amber-805 font-bold">
                        ⚠️ Booked by another operator: {selectedApp.staff?.name || 'Unknown'}.
                      </p>
                    </div>
                  )}

                  {/* Candidate Info Card */}
                  <div className="bg-gray-55 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{selectedApp.user.name}</p>
                      <p className="text-xs text-gray-500">{selectedApp.user.email}</p>
                      <span className="mt-2 inline-flex text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        Match Score: {selectedApp.fitScore ?? '—'}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProfileViewDetails({ userId: selectedApp.user.id, fitScore: selectedApp.fitScore, fitReason: selectedApp.reason })}
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-55 rounded-lg transition shadow-sm"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>

                  {/* Sent Application Materials (visible to Operator) */}
                  {(selectedApp.proof || selectedApp.operatorDocNotes) && (
                    <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-indigo-850 uppercase tracking-wider block">Sent Application Materials</span>
                      {selectedApp.operatorDocNotes && (
                        <div className="text-xs bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="font-semibold text-gray-500 block mb-1">Operator Notes & Instructions:</span>
                          <p className="text-gray-705 leading-relaxed">{selectedApp.operatorDocNotes}</p>
                        </div>
                      )}
                      {selectedApp.proof && (
                        <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="font-semibold block text-gray-500 mb-1">Sent Documents:</span>
                          {selectedApp.proof.split(',').map((filePath, idx) => {
                            const refs = selectedApp.proofRef ? selectedApp.proofRef.split(',') : [];
                            const fileName = refs[idx] || `Document ${idx + 1}`;
                            return (
                              <a key={idx} href={getFileUrl(filePath)}
                                target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800 block font-sans">
                                {fileName}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* State Machine Status & Actions Section */}
                  <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Workflow Status</span>
                      <StatusBadge status={selectedApp.status} />
                    </div>

                    {/* Only display action controls if on My Applications page and booked by current operator */}
                    {onlyBooked && isBookedByMe ? (
                      <>
                        {/* Fit Review Panel — for link_request applications */}
                        {(selectedApp.status === 'link_request') && (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" /> Candidate's Job Link
                              </p>
                              {selectedApp.jobLinkRequest && (
                                <a href={selectedApp.jobLinkRequest} target="_blank" rel="noreferrer"
                                  className="text-xs text-blue-600 font-semibold underline hover:text-blue-800 break-all flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  {selectedApp.jobLinkRequest}
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-blue-700">
                              Review the candidate's profile and the job link above. Assign a fit score and send your assessment.
                            </p>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                                  <Star className="w-3.5 h-3.5 text-yellow-500" /> Fit Score
                                </label>
                                <span className="text-sm font-black text-blue-700">{fitReviewScore}%</span>
                              </div>
                              <input
                                type="range" min="0" max="100" step="5"
                                value={fitReviewScore}
                                onChange={e => setFitReviewScore(Number(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                style={{ background: `linear-gradient(to right, #2563eb ${fitReviewScore}%, #dbeafe ${fitReviewScore}%)` }}
                              />
                              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                <span>0% — Poor</span><span>50% — Good</span><span>100% — Excellent</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Assessment Notes</label>
                              <textarea
                                value={fitReviewNote}
                                onChange={e => setFitReviewNote(e.target.value)}
                                placeholder="Describe why the candidate fits (or doesn't fit) this role..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white focus:ring-2 focus:ring-blue-300 resize-none"
                              />
                            </div>
                            <button
                              onClick={handleSubmitFitReview}
                              disabled={submittingFitReview}
                              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                              {submittingFitReview ? 'Sending Assessment...' : 'Send Fit Assessment to Candidate'}
                            </button>
                          </div>
                        )}

                        {/* Fit Reviewed — show what was sent */}
                        {selectedApp.status === 'fit_reviewed' && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                              <p className="text-xs font-bold text-yellow-800 flex items-center gap-1.5 mb-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500" /> Fit Assessment Sent — Score: {selectedApp.fitScore}%
                              </p>
                              {selectedApp.operatorFitNote && (
                                <p className="text-xs text-yellow-900 leading-relaxed">{selectedApp.operatorFitNote}</p>
                              )}
                              <p className="text-[10px] text-yellow-600 mt-1.5 italic">Awaiting candidate decision to apply...</p>
                            </div>
                          </div>
                        )}

                        {/* Candidate Applied — confirmed */}
                        {selectedApp.status === 'candidate_applied' && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-600" /> Candidate confirmed application (Score: {selectedApp.fitScore}%)
                              </p>
                              <p className="text-xs text-emerald-700 mt-1">The candidate has reviewed your assessment and confirmed they want to apply. You may now proceed to process their application.</p>
                            </div>
                            <button
                              disabled={processingAction}
                              onClick={handleStatusProceed}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" /> Proceed to Processing
                            </button>
                          </div>
                        )}

                        {selectedApp.status === 'requested' && (

                          <div className="space-y-2">
                            <p className="text-xs text-blue-700">Candidate requested to apply. Review candidate profile/comments and proceed to application processing.</p>
                            <button
                              disabled={processingAction}
                              onClick={handleStatusProceed}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" /> Proceed to Processing
                            </button>
                          </div>
                        )}

                        {selectedApp.status === 'processing' && (
                          <form onSubmit={handleCompleteWithEvidence} className="space-y-4 pt-2 border-t border-blue-100">
                            <p className="text-xs font-semibold text-blue-700">Apply on candidate's behalf, upload evidence (proof documents & images), and mark as complete.</p>
                            
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Evidence Documents / Screenshots (PDF, PNG, JPG) *</label>
                              <input
                                type="file"
                                multiple
                                required
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setUploadFiles(Array.from(e.target.files));
                                  }
                                }}
                                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Submission Notes & Proof Details *</label>
                              <textarea
                                required
                                value={docNotes}
                                onChange={(e) => setDocNotes(e.target.value)}
                                placeholder="Detail submission reference, portal confirmation, or application notes for candidate..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={processingAction}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {processingAction ? 'Saving & Completing...' : 'Mark as Complete & Upload Evidence'}
                            </button>
                          </form>
                        )}

                        {selectedApp.status === 'completed' && (
                          <div className="space-y-2">
                            <p className="text-xs text-emerald-805 font-bold">✓ Application Process Completed successfully.</p>
                            {selectedApp.candidateFeedback && (
                              <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs">
                                <span className="font-bold text-gray-500 block">Candidate Feedback:</span>
                                <p className="font-bold text-amber-500 font-sans">Rating: {Array(selectedApp.candidateFeedbackRating || 5).fill('★').join('')}</p>
                                <p className="text-gray-700 mt-1">"{selectedApp.candidateFeedback}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        {!onlyBooked 
                          ? "Workflow state controls are managed in the 'My Applications' dashboard."
                          : "Workflow state controls are restricted to the assigned operator."}
                      </p>
                    )}
                  </div>

                  {/* Loop Comments thread */}
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Comments Thread (Public & Internal logs)
                    </h3>

                    <div className="space-y-3 max-h-56 overflow-y-auto p-3 bg-gray-55 rounded-xl border border-gray-100">
                      {selectedApp.comments && selectedApp.comments.length > 0 ? (
                        selectedApp.comments.map((c: any) => {
                          const isInternal = c.type === 'internal';
                          return (
                            <div key={c.id} className={`text-xs p-3 rounded-lg border shadow-sm ${isInternal ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                              <div className="flex items-center justify-between font-semibold text-gray-700 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-blue-805 font-bold">{c.sender?.name}</span>
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded uppercase">{c.sender?.role}</span>
                                  {isInternal && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 rounded-full border border-amber-200">INTERNAL LOG</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">{formatDate(c.createdAt)}</span>
                              </div>
                              <p className="text-gray-605 leading-relaxed">{c.text}</p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-gray-400 italic">No comments in history yet.</p>
                      )}
                    </div>

                    {/* Operator reply inputs - only on My Applications page and booked by current operator */}
                    {onlyBooked && isBookedByMe && selectedApp.status !== 'completed' && (
                      <div className="space-y-3">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a reply comment or note..."
                          rows={2}
                          className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={commentType}
                              onChange={(e: any) => setCommentType(e.target.value)}
                              className="px-2.5 py-1.5 border border-gray-250 rounded-lg outline-none text-xs bg-white text-gray-700 font-semibold"
                            >
                              <option value="public">Reply to Candidate (Public)</option>
                              <option value="internal">For Internal Operators Use (Internal)</option>
                            </select>
                          </div>
                          <button
                            onClick={handlePostComment}
                            disabled={postingComment || !commentText.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Post Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-55 flex justify-end shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2.5 rounded-xl font-bold border-gray-205 text-gray-600 hover:bg-gray-55"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

      {profileViewDetails && (
        <OperatorProfileViewModal 
          userId={profileViewDetails.userId} 
          fitScore={profileViewDetails.fitScore}
          fitReason={profileViewDetails.fitReason}
          onClose={() => setProfileViewDetails(null)} 
        />
      )}
    </>
  );
}
