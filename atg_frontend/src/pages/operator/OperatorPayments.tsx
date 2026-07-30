import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { paymentApi } from '../../api/paymentApi';
import type { Payment } from '../../types/payment.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import { FileText, XCircle, CheckCircle } from 'lucide-react';
import { getFileUrl } from '../../utils/fileUrl';

const statusClass: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  refunded: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function OperatorPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal states
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  useEffect(() => {
    paymentApi
      .list()
      .then(setPayments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const updated = await paymentApi.update(id, { paid: true, status: 'completed' });
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success('Payment approved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payment');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayment) return;
    if (!rejectComment.trim()) {
      toast.error('Please specify a rejection comment.');
      return;
    }

    setSubmittingReject(true);
    try {
      const updated = await paymentApi.update(rejectingPayment.id, {
        paid: false,
        status: 'rejected',
        operatorComment: rejectComment,
      });
      setPayments((prev) => prev.map((p) => (p.id === rejectingPayment.id ? updated : p)));
      setRejectingPayment(null);
      setRejectComment('');
      toast.success('Payment rejected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject payment');
    } finally {
      setSubmittingReject(false);
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Candidate Info',
      render: (p: Payment) => (
        <div>
          <p className="font-semibold text-gray-800">User ID: {p.userId}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ref: {p.ref || '—'}</p>
        </div>
      ),
    },
    {
      key: 'pkg',
      label: 'Package & Quota',
      render: (p: Payment) => (
        <div>
          <p className="font-semibold text-gray-800 capitalize">{p.pkg || 'Subscription Pack'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
          {p.appsCount ? (
            <p className="text-xs text-brand-600 font-medium mt-0.5">+{p.appsCount} applications</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (p: Payment) => (
        <span className="font-semibold text-gray-800">
          {p.currency || 'USD'} {p.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'slipUrl',
      label: 'Receipt Slip & Details',
      render: (p: Payment) => (
        <div className="space-y-1">
          {p.details && <p className="text-xs text-gray-600 max-w-[200px] truncate" title={p.details}>{p.details}</p>}
          {p.slipUrl ? (
            <a
              href={getFileUrl(p.slipUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Receipt Slip
            </a>
          ) : (
            <span className="text-xs text-gray-400">No receipt slip uploaded</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p: Payment) => (
        <div className="space-y-1">
          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${statusClass[p.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {p.status}
          </span>
          {p.status === 'rejected' && p.operatorComment && (
            <p className="text-xs text-rose-600 italic max-w-[200px]">{p.operatorComment}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p: Payment) => (
        p.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="success"
              onClick={() => handleApprove(p.id)}
              className="py-1 px-3 rounded-lg text-xs flex items-center gap-1 font-semibold"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => setRejectingPayment(p)}
              className="py-1 px-3 rounded-lg text-xs flex items-center gap-1 font-semibold bg-rose-600 text-white hover:bg-rose-700 border-none"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-400 font-medium capitalize">
            {p.status === 'completed' ? 'Reconciled' : p.status}
          </span>
        )
      ),
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn relative">
      <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/55 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-gray-800">Payments Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Review bank transfer receipts and approve subscription quotes.</p>
        </div>
        <Link to="/operator/users">
          <Button variant="outline" className="py-2 px-4 rounded-xl text-sm font-semibold border-brand-200 hover:bg-brand-50 hover:text-brand-800">
            {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#1E40AF' })}
            View Users
          </Button>
        </Link>
      </div>

      {loading && <p className="p-8 text-sm text-gray-500 animate-pulse">Loading payments...</p>}
      {error && <p className="p-8 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <ReusableTable
          columns={columns}
          data={payments}
          searchPlaceholder="Search payments by status, ref, details or package..."
          searchKeys={['pkg', 'status', 'ref', 'details']}
          itemsPerPage={5}
          emptyMessage="No payments found."
        />
      )}

      {/* Reject Reason Modal */}
      {rejectingPayment && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-150 m-4">
            <h3 className="text-lg font-serif font-bold text-gray-800 mb-2">Reject Payment Reference</h3>
            <p className="text-sm text-gray-500 mb-4">
              Explain why this payment slip is rejected. The candidate will see this comment and can resubmit.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rejection Comment</label>
                <textarea
                  required
                  placeholder="e.g. Receipt image is blurry / Incorrect amount deposited / Invalid reference number"
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="px-4 py-2 rounded-xl text-sm"
                  disabled={submittingReject}
                  onClick={() => {
                    setRejectingPayment(null);
                    setRejectComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={submittingReject}
                  className="px-4 py-2 rounded-xl text-sm bg-rose-600 text-white hover:bg-rose-700 border-none"
                >
                  {submittingReject ? 'Submitting...' : 'Reject Receipt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
