import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../../api/paymentApi';
import type { Payment } from '../../types/payment.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import { FileText, MessageSquare, Plus } from 'lucide-react';
import { getFileUrl } from '../../utils/fileUrl';

const statusClass: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  refunded: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function CandidatePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentApi
      .list()
      .then(setPayments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'pkg',
      label: 'Package Details',
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
        <span className="font-semibold text-gray-800 text-sm">
          {p.currency || 'USD'} {p.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'Details & Slip',
      render: (p: Payment) => (
        <div className="space-y-1">
          {p.ref && <p className="text-xs font-mono text-gray-600">Ref: {p.ref}</p>}
          {p.details && <p className="text-xs text-gray-500 max-w-[200px] truncate" title={p.details}>{p.details}</p>}
          {p.slipUrl ? (
            <a
              href={getFileUrl(p.slipUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 hover:underline font-semibold"
            >
              <FileText className="h-3.5 w-3.5" />
              View Receipt
            </a>
          ) : (
            <span className="text-xs text-gray-400">No Slip</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status & Comments',
      render: (p: Payment) => (
        <div className="space-y-1">
          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${statusClass[p.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {p.status}
          </span>
          {p.status === 'rejected' && p.operatorComment && (
            <div className="flex items-start gap-1 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-lg p-1.5 mt-1 max-w-[200px]">
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="italic">{p.operatorComment}</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl overflow-hidden animate-fadeIn backdrop-blur-sm text-slate-100">
      <div className="px-8 py-6 border-b border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Payments</h1>
          <p className="text-sm text-slate-400 mt-1">Your billing history for ATG Apply packages.</p>
        </div>
        <Link to="/candidate/upgrade">
          <Button variant="outline" className="py-2 px-4 rounded-xl text-sm font-semibold border-slate-700 hover:bg-slate-700 hover:text-white text-slate-200 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-blue-400" />
            Buy Quota Pack
          </Button>
        </Link>
      </div>

      {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading payments...</p>}
      {error && <p className="p-8 text-sm text-rose-400 bg-rose-950/60 border border-rose-800/60">{error}</p>}

      {!loading && !error && (
        <ReusableTable
          columns={columns}
          data={payments}
          searchPlaceholder="Search payments by package, details, reference or status..."
          searchKeys={['pkg', 'status', 'ref', 'details']}
          itemsPerPage={5}
          emptyMessage="No payment history found."
        />
      )}
    </div>
  );
}
