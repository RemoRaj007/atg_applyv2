import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Eye, X, Users, ClipboardList, CreditCard, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useSession } from '../../hooks/useSession';
import Button from '../../components/ui/AtgButton';

export default function OperatorExport() {
  const { user } = useSession();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview Modal States
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Live row counts
  const [counts, setCounts] = useState({
    users: 0,
    applications: 0,
    payments: 0,
    capacity: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);

  const fetchCounts = async () => {
    try {
      const [usersRes, appsRes, paymentsRes, capacityRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/applications'),
        apiClient.get('/payments'),
        apiClient.get('/team/capacity'),
      ]);

      const allUsers = usersRes.data.data.users;
      const allApps = appsRes.data.data.applications;
      const allPayments = paymentsRes.data.data.payments;
      const allOps = capacityRes.data.data.operators;

      if (user?.role === 'operator') {
        const myApps = allApps.filter((a: any) => a.staffId === user.id);
        const myUserIds = new Set(myApps.map((a: any) => a.userId));
        
        setCounts({
          users: allUsers.filter((u: any) => myUserIds.has(u.id)).length,
          applications: myApps.length,
          payments: allPayments.filter((p: any) => myUserIds.has(p.userId)).length,
          capacity: allOps.filter((o: any) => o.id === user.id).length,
        });
      } else {
        setCounts({
          users: allUsers.length,
          applications: allApps.length,
          payments: allPayments.length,
          capacity: allOps.length,
        });
      }
    } catch (err) {
      console.error('Failed to load counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [user]);

  const loadReportData = async (report: any) => {
    setActiveReport(report);
    setLoadingPreview(true);
    setPreviewData([]);
    setError(null);
    try {
      if (report.key === 'users') {
        const [usersRes, appsRes] = await Promise.all([
          apiClient.get('/users'),
          apiClient.get('/applications')
        ]);
        const allUsers = usersRes.data.data.users;
        const allApps = appsRes.data.data.applications;
        
        if (user?.role === 'operator') {
          const myApps = allApps.filter((a: any) => a.staffId === user.id);
          const myUserIds = new Set(myApps.map((a: any) => a.userId));
          setPreviewData(allUsers.filter((u: any) => myUserIds.has(u.id)));
        } else {
          setPreviewData(allUsers);
        }
      } else if (report.key === 'applications') {
        const res = await apiClient.get('/applications');
        const allApps = res.data.data.applications;
        if (user?.role === 'operator') {
          setPreviewData(allApps.filter((a: any) => a.staffId === user.id));
        } else {
          setPreviewData(allApps);
        }
      } else if (report.key === 'payments') {
        const [paymentsRes, appsRes] = await Promise.all([
          apiClient.get('/payments'),
          apiClient.get('/applications')
        ]);
        const allPayments = paymentsRes.data.data.payments;
        const allApps = appsRes.data.data.applications;
        
        if (user?.role === 'operator') {
          const myApps = allApps.filter((a: any) => a.staffId === user.id);
          const myUserIds = new Set(myApps.map((a: any) => a.userId));
          setPreviewData(allPayments.filter((p: any) => myUserIds.has(p.userId)));
        } else {
          setPreviewData(allPayments);
        }
      } else if (report.key === 'capacity') {
        const res = await apiClient.get('/team/capacity');
        const allOps = res.data.data.operators;
        if (user?.role === 'operator') {
          setPreviewData(allOps.filter((o: any) => o.id === user.id));
        } else {
          setPreviewData(allOps);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (endpoint: string, filename: string, key: string) => {
    setDownloading(key);
    setError(null);
    try {
      const response = await apiClient.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || `Failed to export ${filename}`);
    } finally {
      setDownloading(null);
    }
  };

  const exportTypes = [
    {
      key: 'users',
      title: 'Users Report',
      description: 'name, email, phone, country, city, package, role, created date',
      countLabel: (cnt: number) => `${cnt} total users`,
      endpoint: '/users/export',
      filename: 'users-export',
      icon: Users,
      theme: {
        bgBar: 'bg-blue-500',
        bgIcon: 'bg-blue-50',
        textIcon: 'text-blue-600',
        badge: 'bg-blue-50 text-blue-700 border border-blue-100',
      },
      columns: ['Name', 'Email', 'Phone', 'Country/City', 'Package', 'Role'],
      renderRows: (data: any[]) =>
        data.map((u) => (
          <tr key={u.id} className="border-b text-sm text-gray-705 hover:bg-gray-50/50">
            <td className="px-4 py-3 font-semibold text-gray-800">{u.name}</td>
            <td className="px-4 py-3 text-gray-600">{u.email}</td>
            <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
            <td className="px-4 py-3 text-gray-605">
              {u.city || u.country ? `${u.city || ''}, ${u.country || ''}` : '—'}
            </td>
            <td className="px-4 py-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-805 capitalize">
                {u.pkg}
              </span>
            </td>
            <td className="px-4 py-3 capitalize text-gray-550">{u.role}</td>
          </tr>
        )),
    },
    {
      key: 'applications',
      title: 'Applications Report',
      description: 'user, company, title, location, fit score, status, applied date, proof type',
      countLabel: (cnt: number) => `${cnt} applications`,
      endpoint: '/applications/export',
      filename: 'applications-export',
      icon: ClipboardList,
      theme: {
        bgBar: 'bg-emerald-500',
        bgIcon: 'bg-emerald-50',
        textIcon: 'text-emerald-600',
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      },
      columns: ['ID', 'Candidate', 'Job Title', 'Company', 'Status', 'Fit Score'],
      renderRows: (data: any[]) =>
        data.map((a) => (
          <tr key={a.id} className="border-b text-sm text-gray-705 hover:bg-gray-50/50">
            <td className="px-4 py-3 font-bold text-gray-400">#{a.id}</td>
            <td className="px-4 py-3 font-semibold text-gray-805">{a.user?.name}</td>
            <td className="px-4 py-3 text-gray-600">{a.job?.title || a.scholarship?.title}</td>
            <td className="px-4 py-3 text-gray-500">{a.job?.company || a.scholarship?.provider || '—'}</td>
            <td className="px-4 py-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 capitalize">
                {a.status.replace(/_/g, ' ')}
              </span>
            </td>
            <td className="px-4 py-3 font-bold text-indigo-600">{a.fitScore != null ? `${a.fitScore}%` : '—'}</td>
          </tr>
        )),
    },
    {
      key: 'payments',
      title: 'Payments Report',
      description: 'user, package, amount, paid, method, status, reference, date',
      countLabel: (cnt: number) => `${cnt} payments`,
      endpoint: '/payments/export',
      filename: 'payments-export',
      icon: CreditCard,
      theme: {
        bgBar: 'bg-amber-500',
        bgIcon: 'bg-amber-50',
        textIcon: 'text-amber-600',
        badge: 'bg-amber-50 text-amber-700 border border-amber-100',
      },
      columns: ['ID', 'User ID', 'Package', 'Amount', 'Paid', 'Status'],
      renderRows: (data: any[]) =>
        data.map((p) => (
          <tr key={p.id} className="border-b text-sm text-gray-755 hover:bg-gray-50/50">
            <td className="px-4 py-3 font-bold text-gray-400">#{p.id}</td>
            <td className="px-4 py-3 text-gray-600">User #{p.userId}</td>
            <td className="px-4 py-3 text-gray-500 capitalize">{p.pkg}</td>
            <td className="px-4 py-3 font-bold text-gray-800">
              {p.amount} {p.currency}
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {p.paid ? 'Paid' : 'Unpaid'}
              </span>
            </td>
            <td className="px-4 py-3 capitalize text-gray-600">{p.status}</td>
          </tr>
        )),
    },
    {
      key: 'capacity',
      title: 'Staff Capacity Report',
      description: 'name, role, email, max capacity, current load',
      countLabel: (cnt: number) => `${cnt} operators`,
      endpoint: '/team/capacity/export',
      filename: 'staff-capacity-export',
      icon: ShieldCheck,
      theme: {
        bgBar: 'bg-purple-500',
        bgIcon: 'bg-purple-50',
        textIcon: 'text-purple-600',
        badge: 'bg-purple-50 text-purple-700 border border-purple-100',
      },
      columns: ['Name', 'Email', 'Role', 'Max Capacity', 'Current Load'],
      renderRows: (data: any[]) =>
        data.map((o) => (
          <tr key={o.id} className="border-b text-sm text-gray-705 hover:bg-gray-50/50">
            <td className="px-4 py-3 font-semibold text-gray-800">{o.name}</td>
            <td className="px-4 py-3 text-gray-600">{o.email}</td>
            <td className="px-4 py-3 text-gray-500 font-medium">Operator</td>
            <td className="px-4 py-3 text-gray-600">{o.capacity}</td>
            <td className="px-4 py-3 font-bold text-indigo-700">{o.activeLoad}</td>
          </tr>
        )),
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn p-6">
      {/* Premium Header Dashboard Banner */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-8 flex items-center justify-between relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <h1 className="text-3xl font-serif font-extrabold text-gray-900 tracking-tight">System Reports</h1>
          <p className="text-gray-500 text-sm max-w-xl">
            Export database metrics and run analytics on active system accounts, staffing assignments, payment streams, and application workflows.
          </p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center hidden sm:flex shrink-0">
          <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Reports Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportTypes.map((item) => {
          const count = counts[item.key as keyof typeof counts];
          const theme = item.theme;
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-brand-200 transition-all duration-300 relative group overflow-hidden"
            >
              {/* Subtle top decoration */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.bgBar}`} />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl ${theme.bgIcon} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${theme.textIcon}`} />
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${theme.badge}`}>
                    {loadingCounts ? 'Calculating...' : item.countLabel(count)}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-extrabold text-gray-800 text-lg group-hover:text-brand-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">
                    Fields: {item.description}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => loadReportData(item)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview Data</span>
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() =>
                    handleDownload(item.endpoint, item.filename, item.key)
                  }
                  disabled={downloading !== null}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloading === item.key ? 'Exporting...' : 'Export'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {activeReport && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-serif font-extrabold text-xl text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="text-brand-600 w-6 h-6" /> {activeReport.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Previewing {previewData.length} records matching your reporting access.
                </p>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              ) : previewData.length === 0 ? (
                <p className="text-center py-16 text-sm text-gray-500 font-medium border border-dashed border-gray-200 rounded-2xl">
                  No records to display for this report.
                </p>
              ) : (
                <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/75 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {activeReport.columns.map((col: string) => (
                          <th key={col} className="px-4 py-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {activeReport.renderRows(previewData)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-55 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveReport(null)}
                className="py-2.5 px-5 rounded-xl text-sm font-semibold border-gray-250 hover:bg-gray-100 text-gray-705"
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  handleDownload(activeReport.endpoint, activeReport.filename, activeReport.key)
                }
                disabled={downloading !== null || previewData.length === 0 || loadingPreview}
                className="py-2.5 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>{downloading === activeReport.key ? 'Exporting...' : 'Export CSV'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
