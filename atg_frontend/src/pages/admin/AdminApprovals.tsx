import { useEffect, useState } from 'react';

import { requestApi, type ChangeRequest } from '../../api/requestApi';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import { Clock, Eye, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminApprovals() {

  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchRequests = () => {
    setLoading(true);
    requestApi
      .list()
      .then((data) => {
        setRequests(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to retrieve change requests.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    setSubmittingId(id);
    try {
      await requestApi.approve(id);
      toast.success('Change request approved and applied successfully.');
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setSubmittingId(id);
    try {
      await requestApi.reject(id);
      toast.success('Change request has been rejected.');
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request.');
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending') {
      return r.status === 'pending';
    } else {
      return r.status !== 'pending';
    }
  });

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      name: 'Full Name',
      role: 'Security Role',
      phone: 'Phone Number',
      country: 'Country',
      city: 'City',
      isLegendary: 'Legendary Candidate Status',
      pkg: 'Subscription Plan',
      appsTotal: 'Application Credit Limit',
      capacity: 'Staffing Capacity Limit',
    };
    return labels[key] || key;
  };

  const formatValue = (_key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  const renderDiff = (req: ChangeRequest) => {
    if (req.type === 'delete_user') {
      return (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center text-sm font-semibold text-red-800">
          ⚠️ Soft Deactivation Request: The operator has proposed deactivating this user account.
        </div>
      );
    }

    let proposedDetails: any = {};
    try {
      if (req.details) {
        proposedDetails = JSON.parse(req.details);
      }
    } catch (e) {
      proposedDetails = {};
    }

    const targetUser = (req as any).targetUser || {};
    const keys = Object.keys(proposedDetails);

    if (keys.length === 0) {
      return <p className="text-sm text-gray-500 italic">No specific changes specified in request payload.</p>;
    }

    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Proposed Property Comparisons</h4>
        <div className="border border-gray-150 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white">
          <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <div>Property</div>
            <div>Current Value</div>
            <div>Proposed Value</div>
          </div>
          {keys.map((key) => {
            const currentVal = targetUser[key];
            const proposedVal = proposedDetails[key];
            const isDifferent = String(currentVal) !== String(proposedVal);

            return (
              <div key={key} className="grid grid-cols-3 gap-4 px-6 py-4.5 text-sm items-center">
                <div className="font-bold text-gray-700">{getFieldLabel(key)}</div>
                <div className={`text-gray-600 truncate ${isDifferent ? 'line-through text-red-500 bg-red-50/30 px-2 py-1 rounded-md w-fit' : ''}`}>
                  {formatValue(key, currentVal)}
                </div>
                <div className={`font-semibold truncate ${isDifferent ? 'text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit border border-emerald-100' : 'text-gray-800'}`}>
                  {formatValue(key, proposedVal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const columns = [
    {
      key: 'type',
      label: 'Request Type',
      render: (r: ChangeRequest) => (
        <span
          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${r.type === 'delete_user'
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
        >
          {r.type === 'delete_user' ? 'Deactivation' : 'Profile Edit'}
        </span>
      ),
    },
    {
      key: 'target',
      label: 'Target Account',
      render: (r: ChangeRequest) => {
        const target = (r as any).targetUser;
        if (target) {
          return (
            <div>
              <p className="font-bold text-gray-800">{target.name}</p>
              <p className="text-xs text-gray-400">{target.email}</p>
            </div>
          );
        }
        return <span className="text-gray-400 font-medium italic">ID #{r.targetId} (Not Found)</span>;
      },
    },
    {
      key: 'createdBy',
      label: 'Proposed By',
      render: (r: ChangeRequest) => (
        <div>
          <p className="font-semibold text-gray-700">{r.createdBy?.name || 'Staff'}</p>
          <p className="text-xs text-gray-400">{r.createdBy?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Justification Reason',
      render: (r: ChangeRequest) => (
        <p className="text-sm text-gray-600 line-clamp-2 max-w-[280px]" title={r.reason}>
          {r.reason}
        </p>
      ),
    },
    {
      key: 'createdAt',
      label: 'Submitted Date',
      render: (r: ChangeRequest) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: ChangeRequest) => {
        if (r.status === 'pending') {
          return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Pending</span>;
        } else if (r.status === 'approved') {
          return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Approved</span>;
        } else {
          return <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Rejected</span>;
        }
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: ChangeRequest) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedRequest(r)}
            className="p-2 rounded-lg bg-gray-50 hover:bg-brand-50 hover:text-brand-700 text-gray-600 transition"
            title="Review Details"
          >
            <Eye size={15} />
          </button>
          {r.status === 'pending' && (
            <>
              <button
                disabled={submittingId === r.id}
                onClick={() => handleApprove(r.id)}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition disabled:opacity-50"
                title="Approve & Apply"
              >
                <Check size={15} />
              </button>
              <button
                disabled={submittingId === r.id}
                onClick={() => handleReject(r.id)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition disabled:opacity-50"
                title="Reject Request"
              >
                <X size={15} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden p-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-extrabold text-gray-900">User Change Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, approve, and execute profile change requests or account deactivations submitted by operators.
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Pending Queue
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Processed History
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn relative">
        {loading && <p className="p-8 text-sm text-gray-500">Loading change requests...</p>}
        {error && <p className="p-8 text-sm text-red-650 bg-red-50 border-b border-red-100">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={filteredRequests}
            searchPlaceholder="Search approvals by operator, target user, or reason..."
            searchKeys={['reason', 'createdBy.name', 'targetUser.name', 'type']}
            itemsPerPage={8}
            emptyMessage={activeTab === 'pending' ? 'No pending change requests in the queue.' : 'No processed requests history.'}
          />
        )}
      </div>

      {/* Details View Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-650/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <span
                  className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${selectedRequest.type === 'delete_user'
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}
                >
                  {selectedRequest.type === 'delete_user' ? 'Deactivation Request' : 'Profile Edit Request'}
                </span>
                <h2 className="text-lg font-serif font-extrabold text-gray-900 mt-1">Review Request #{selectedRequest.id}</h2>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Submission Information Card */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div>
                  <span className="block text-[10px] font-bold text-gray-455 uppercase tracking-widest mb-1">Target Account</span>
                  <div className="text-sm font-bold text-gray-800">
                    {(selectedRequest as any).targetUser?.name || `ID #${selectedRequest.targetId}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{(selectedRequest as any).targetUser?.email || '—'}</div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-455 uppercase tracking-widest mb-1">Proposed By</span>
                  <div className="text-sm font-bold text-gray-800">{selectedRequest.createdBy?.name || 'Staff'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{selectedRequest.createdBy?.email || '—'}</div>
                </div>
              </div>

              {/* Justification */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Justification Reason</h4>
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4.5 text-sm text-gray-800 italic leading-relaxed">
                  "{selectedRequest.reason}"
                </div>
              </div>

              {/* Changes Detail View */}
              {renderDiff(selectedRequest)}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="text-xs text-gray-450 font-medium">
                Submitted on {new Date(selectedRequest.createdAt).toLocaleString()}
              </div>
              <div className="flex gap-2.5">
                <Button variant="outline" onClick={() => setSelectedRequest(null)} className="px-4 py-2 rounded-xl text-sm font-bold">
                  Close
                </Button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-750 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={submittingId === selectedRequest.id}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={submittingId === selectedRequest.id}
                    >
                      Approve & Apply
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
