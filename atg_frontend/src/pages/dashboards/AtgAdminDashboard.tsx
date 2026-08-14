import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Users, Briefcase, DollarSign, Building, AlertCircle, CheckCircle, XCircle, TrendingUp, Layers, UserCheck } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { userApi } from '../../api/userApi';
import { jobApi } from '../../api/jobApi';
import { paymentApi } from '../../api/paymentApi';
import { companyApi } from '../../api/companyApi';
import { requestApi, type ChangeRequest } from '../../api/requestApi';
import { applicationApi } from '../../api/applicationApi';
import { safeExternalUrl } from '../../utils/validation';

// Recharts imports for beautiful visualizations
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

interface Workload {
  id: number;
  name: string;
  active: number;
  capacity: number;
  total: number;
}

// Visual color palette matching candidate dashboard styles
const COLORS = ['#0284c7', '#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useSession();
  
  // Data lists
  const [usersCount, setUsersCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);
  
  // Analytical states
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [operatorWorkloads, setOperatorWorkloads] = useState<Workload[]>([]);
  const [revenueByPackage, setRevenueByPackage] = useState<Record<string, number>>({});
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [allUsers, allJobs, allPayments, allCompanies, allRequests, allApplications] = await Promise.all([
        userApi.list(),
        jobApi.list(),
        paymentApi.list(),
        companyApi.list(),
        requestApi.list(),
        applicationApi.list().catch(() => []),
      ]);

      setUsersCount(allUsers.length);
      setJobsCount(allJobs.filter((j) => j.status === 'approved').length);
      setCompaniesCount(allCompanies.length);
      
      // Calculate revenue from paid transactions
      const revenue = allPayments
        .filter((p) => p.paid || p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalRevenue(revenue);

      // Filter queues
      setChangeRequests(allRequests.filter((r) => r.status === 'pending'));
      setPendingCompanies(allCompanies.filter((c) => c.status === 'pending'));

      // 1. Calculate role-wise counts
      const roles = allUsers.reduce((acc, u) => {
        const r = u.role || 'candidate';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setRoleCounts(roles);

      // 2. Calculate packages
      const pkgs = allUsers.reduce((acc, u) => {
        const p = u.pkg || 'Trial';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setPackageCounts(pkgs);

      // 3. Calculate application status distribution
      const statuses = allApplications.reduce((acc, app) => {
        const s = app.status || 'pending_approval';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setStatusCounts(statuses);

      // 4. Calculate workloads operator by operator
      const ops = allUsers.filter(u => u.role === 'operator');
      const workloads = ops.map(op => {
        const assignedApps = allApplications.filter(app => app.staffId === op.id);
        const activeAssigned = assignedApps.filter(app => ['pending_approval', 'approved'].includes(app.status)).length;
        return {
          id: op.id,
          name: op.name,
          active: activeAssigned,
          capacity: op.capacity || 10,
          total: assignedApps.length,
        };
      });
      setOperatorWorkloads(workloads);

      // 5. Calculate revenue by package type
      const revByPkg = allPayments
        .filter((p) => p.paid || p.status === 'completed')
        .reduce((acc, p) => {
          const pkg = p.pkg || 'Trial';
          acc[pkg] = (acc[pkg] || 0) + p.amount;
          return acc;
        }, {} as Record<string, number>);
      setRevenueByPackage(revByPkg);

      // 6. Calculate cumulative revenue trend over time
      const sortedPayments = [...allPayments]
        .filter((p) => p.paid || p.status === 'completed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let runningTotal = 0;
      const trend = sortedPayments.map((p, idx) => {
        runningTotal += p.amount;
        const dateLabel = new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        return {
          label: dateLabel || `Tx ${idx + 1}`,
          Revenue: runningTotal,
        };
      });
      setRevenueTrend(trend);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveRequest = async (id: number) => {
    try {
      await requestApi.approve(id);
      toast.success('Change request approved and database mutators executed.');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve change request.');
    }
  };

  const handleRejectRequest = async (id: number) => {
    try {
      await requestApi.reject(id);
      toast.success('Change request rejected.');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject change request.');
    }
  };

  const handleCompanyApproval = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await companyApi.approve(id, status);
      toast.success(`Company registration has been ${status}.`);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update company status.');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading platform intelligence...</div>;
  }

  // Formatting datasets for Recharts
  const workloadChartData = operatorWorkloads.map(op => ({
    name: op.name,
    Active: op.active,
    Capacity: op.capacity,
  }));

  const rolePieData = Object.entries(roleCounts).map(([role, count]) => ({
    name: role.toUpperCase(),
    value: count,
  }));

  const packagePieData = Object.entries(packageCounts).map(([pkg, count]) => ({
    name: pkg === 'Trial' ? 'Free/Trial' : pkg,
    value: count,
  }));

  const statusPieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    value: count,
  }));

  const revenueChartData = ['Trial', 'Premium', 'Professional'].map(pkg => ({
    name: pkg === 'Trial' ? 'Free/Trial' : pkg,
    value: revenueByPackage[pkg] || 0,
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-gray-900">{t('admin.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform metrics, financial yields, and operator verification queues.</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-150 px-3 py-1.5 rounded-xl font-bold self-start md:self-center">
          Active Session: {user?.name} (Administrator)
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm font-medium text-red-650 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Metrics Row (Solid Color Ranges) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-blue-950/40 border border-blue-800/60 p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-scaleUp text-blue-100">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Gross Yield Revenue</p>
            <p className="text-2xl font-extrabold text-white mt-1">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-cyan-950/40 border border-cyan-800/60 p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-scaleUp text-cyan-100">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-extrabold text-white mt-1">{usersCount} Profiles</p>
          </div>
        </div>

        <div className="bg-violet-950/40 border border-violet-800/60 p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-scaleUp text-violet-100">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider">Partner Companies</p>
            <p className="text-2xl font-extrabold text-white mt-1">{companiesCount} Profiles</p>
          </div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/60 p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-scaleUp text-emerald-100">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Job Posts</p>
            <p className="text-2xl font-extrabold text-white mt-1">{jobsCount} Active</p>
          </div>
        </div>
      </div>

      {/* Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Work Distribution (Operator Workloads) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              <UserCheck className="h-5 w-5 text-sky-700" />
              <h2 className="font-serif font-extrabold text-gray-850 text-lg">Work Distribution</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Active workload (applications) assigned to each specialist.</p>
            
            <div className="h-32 w-full mt-4">
              {workloadChartData.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10">No operators active.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: any) => [`${value} Active Apps`, 'Active Workload']}
                    />
                    <Bar dataKey="Active" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex flex-col gap-2 text-[10px] w-full text-left font-semibold px-2 mt-4 border-t border-gray-100 pt-3">
              {operatorWorkloads.map(op => {
                const pct = Math.min(100, Math.round((op.active / op.capacity) * 100));
                return (
                  <div key={op.id} className="space-y-1">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>{op.name}</span>
                      <span className="font-bold text-gray-900">{op.active} / {op.capacity} active ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Financials & Cumulative Revenue Trend */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h2 className="font-serif font-extrabold text-gray-850 text-lg">Revenue Yield & Trend</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Cumulative yield growth from paid packages over time.</p>

            <div className="h-60 w-full mt-4">
              {revenueTrend.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-20">No revenue data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      itemStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}
                      formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Cumulative Rev']}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Demographics & Package Subscriptions (Pie Charts) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h2 className="font-serif font-extrabold text-gray-850 text-lg">System Demographics</h2>
            </div>
            <p className="text-xs text-gray-400 mb-2">Package distribution and account roles.</p>

            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {/* Package distribution donut */}
              <div className="flex flex-col items-center justify-start relative">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Packages</span>
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={packagePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {packagePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1 text-[10px] w-full text-left font-semibold px-2 mt-2">
                  {packagePieData.map((d, index) => (
                    <div key={d.name} className="flex justify-between items-center text-gray-700">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles donut */}
              <div className="flex flex-col items-center justify-start relative">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">User Roles</span>
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rolePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {rolePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1 text-[10px] w-full text-left font-semibold px-2 mt-2">
                  {rolePieData.map((d, index) => (
                    <div key={d.name} className="flex justify-between items-center text-gray-700">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                        <span className="truncate">{d.name.toLowerCase()}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Detailed Stats & Application Status Distribution */}
      <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div>
            <h2 className="font-serif font-extrabold text-gray-850 text-lg">Application Status Pipeline</h2>
            <p className="text-xs text-gray-400 mt-1">Application status statistics and revenue contribution per tier.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Status Breakdown Bar chart */}
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-4">Application Status Counts</span>
            <div className="h-56 w-full">
              {statusPieData.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-20">No applications registered.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusPieData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {statusPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed stats grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Package User Shares</span>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packagePieData} layout="vertical" margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '10px' }}
                      />
                      <Bar dataKey="value" fill="#0284c7" radius={[0, 4, 4, 0]}>
                        {packagePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2 text-xs">
                  {packagePieData.map((d, index) => {
                    const total = packagePieData.reduce((a, b) => a + b.value, 0);
                    const pct = total > 0 ? (d.value / total) * 100 : 0;
                    return (
                      <div key={d.name} className="flex justify-between items-center text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-semibold">{d.name}</span>
                        </div>
                        <span className="font-bold text-gray-800">{d.value} ({Math.round(pct)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Revenue Breakdown</span>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} layout="vertical" margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '10px' }}
                        formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Revenue']}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                        {revenueChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2 text-xs">
                  {revenueChartData.map((d, index) => {
                    const total = revenueChartData.reduce((a, b) => a + b.value, 0);
                    const pct = total > 0 ? (d.value / total) * 100 : 0;
                    return (
                      <div key={d.name} className="flex justify-between items-center text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(index + 1) % COLORS.length] }} />
                          <span className="font-semibold">{d.name}</span>
                        </div>
                        <span className="font-bold text-gray-800">${d.value.toFixed(2)} ({Math.round(pct)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification & Approvals Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Operator Change Requests Queue */}
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-scaleUp">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-brand-700" />
              <h2 className="font-serif font-extrabold text-gray-800">Operator Change Requests Queue</h2>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {changeRequests.length} pending
            </span>
          </div>

          {changeRequests.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No pending operator request tickets.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {changeRequests.map((req) => {
                let detailsObj: any = {};
                try {
                  if (req.details) detailsObj = JSON.parse(req.details);
                } catch (e) {}

                return (
                  <div key={req.id} className="p-6 hover:bg-gray-55/30 transition-all space-y-3.5 animate-fadeIn">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          req.type === 'delete_user' 
                            ? 'bg-red-50 text-red-700 border border-red-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {req.type === 'delete_user' ? 'Deactivation' : 'Profile Edit'}
                        </span>
                        <h3 className="font-bold text-gray-800 mt-1.5">
                          Target Account ID: <span className="underline">#{req.targetId}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Submitted by Operator: {req.createdBy?.name || 'Staff'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <CheckCircle className="h-3 w-3" /> Approve & Apply
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-2">
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[9px] block">Justification Reason:</span>
                        <p className="text-gray-700 font-medium italic mt-0.5">"{req.reason}"</p>
                      </div>
                      {req.type === 'edit_user' && Object.keys(detailsObj).length > 0 && (
                        <div className="pt-2 border-t border-gray-250/50">
                          <span className="font-bold text-gray-500 uppercase tracking-wider text-[9px] block">Updates to apply:</span>
                          <pre className="text-[10px] text-brand-850 mt-1 bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto max-h-[120px] font-mono leading-relaxed">
                            {JSON.stringify(detailsObj, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Companies Queue */}
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-scaleUp">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-4.5 w-4.5 text-brand-700" />
              <h2 className="font-serif font-extrabold text-gray-800">Company Registration Approvals</h2>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {pendingCompanies.length} pending
            </span>
          </div>

          {pendingCompanies.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No company profiles awaiting verification.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingCompanies.map((c) => {
                // A pending company's website is attacker-supplied and unreviewed;
                // link it only when it is a real http(s) URL.
                const website = safeExternalUrl(c.website);
                return (
                <div key={c.id} className="p-6 hover:bg-gray-55/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                  <div>
                    <h3 className="font-bold text-gray-800">{c.name}</h3>
                    <p className="text-xs text-gray-550">{c.email}</p>
                    {website ? (
                      <a href={website} target="_blank" rel="noreferrer" className="text-[10px] text-brand-600 hover:underline block mt-1">
                        {c.website}
                      </a>
                    ) : (
                      c.website && <span className="text-[10px] text-gray-500 block mt-1">{c.website}</span>
                    )}
                    {c.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 italic">"{c.description}"</p>}
                  </div>
                  <div className="flex gap-1.5 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => handleCompanyApproval(c.id, 'approved')}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Approve Partner
                    </button>
                    <button
                      onClick={() => handleCompanyApproval(c.id, 'rejected')}
                      className="px-3 py-1.5 text-xs font-bold bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
