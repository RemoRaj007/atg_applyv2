import { useEffect, useState } from 'react';
import { GraduationCap, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { scholarshipApi } from '../../api/scholarshipApi';
import { applicationApi } from '../../api/applicationApi';
import type { Scholarship } from '../../types/scholarship.types';
import type { Application } from '../../types/application.types';
import Button from '../../components/ui/AtgButton';

export default function CandidateScholarships() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply Modal state
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sList, aList] = await Promise.all([
        scholarshipApi.list(),
        applicationApi.list()
      ]);
      setScholarships(sList);
      setApplications(aList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScholarship) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await applicationApi.create({
        scholarshipId: selectedScholarship.id,
        comment: comment.trim() || undefined
      });
      setSelectedScholarship(null);
      setComment('');
      fetchData();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getApplicationForScholarship = (scholarshipId: number) => {
    return applications.find((app) => app.scholarshipId === scholarshipId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Requested
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
            <Clock className="w-3.5 h-3.5" /> Processing
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Draft Prepared
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full border border-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
            <AlertCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-white">Scholarships</h1>
        <p className="text-sm text-slate-400 mt-1">Funding and grant opportunities curated by our team.</p>
      </div>

      {loading && <p className="text-sm text-slate-400 animate-pulse">Loading scholarships...</p>}
      {error && <p className="text-sm text-rose-400 bg-rose-950/60 p-4 rounded-xl border border-rose-800/60">{error}</p>}
      {!loading && !error && scholarships.length === 0 && (
        <p className="text-sm text-slate-400">No scholarships available right now.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scholarships.map((s) => {
          const app = getApplicationForScholarship(s.id);
          return (
            <div key={s.id} className="bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-xl p-6 flex flex-col justify-between backdrop-blur-sm hover:border-slate-600/80 transition-all">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{s.title}</p>
                      <p className="text-sm text-slate-400">{s.provider}</p>
                    </div>
                  </div>
                  {app && getStatusBadge(app.status)}
                </div>
                {s.amount != null && (
                  <p className="text-2xl font-extrabold text-blue-400 mt-4">${s.amount.toLocaleString()}</p>
                )}
                {s.description && <p className="text-sm text-slate-300 mt-2 line-clamp-3 leading-relaxed">{s.description}</p>}
                {s.deadline && (
                  <p className="text-xs text-slate-400 mt-3 font-medium">Deadline: {new Date(s.deadline).toLocaleDateString()}</p>
                )}
              </div>
              <div className="mt-5 border-t border-slate-700/60 pt-4 flex justify-end">
                {app ? (
                  <Button variant="outline" disabled>
                    Applied
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setSelectedScholarship(s)}>
                    Apply Now
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply Modal */}
      {selectedScholarship && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-fadeIn text-slate-100">
            <h2 className="text-lg font-bold text-white mb-2">Apply for Scholarship</h2>
            <p className="text-sm text-slate-300 mb-4 font-semibold">
              {selectedScholarship.title} <span className="text-slate-400 font-normal">by {selectedScholarship.provider}</span>
            </p>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Message / Cover Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-800/60 text-white placeholder-slate-500"
                  placeholder="Share details about why you qualify for this scholarship..."
                />
              </div>

              {submitError && <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-800/60">{submitError}</p>}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setSelectedScholarship(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
