import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ClipboardList, CreditCard, BarChart3, TrendingUp, Activity, Clock } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { applicationApi } from '../../api/applicationApi';
import { userApi } from '../../api/userApi';
import { paymentApi } from '../../api/paymentApi';
import type { Application } from '../../types/application.types';
import type { User } from '../../types/user.types';
import type { Payment } from '../../types/payment.types';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_ORDER = ['requested', 'processing', 'pending_approval', 'approved', 'completed', 'rejected'];
const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  processing: 'Processing',
  pending_approval: 'Pending Approval',
  approved: 'Approved (Pending Apply)',
  completed: 'Completed',
  rejected: 'Rejected',
};

// ── Recharts Pie Chart ──────────────────────────────────────────────
interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

function BeautifulPieChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const data = segments.filter((s) => s.value > 0);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No data available yet.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-44 h-44 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '8px 12px', color: '#f8fafc' }}
              itemStyle={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-extrabold text-slate-100">{total}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</p>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 gap-2.5 w-full">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-sm text-slate-300 flex-1">{seg.label}</span>
            <span className="text-sm font-bold text-slate-100">{seg.value}</span>
            {total > 0 && (
              <span className="text-xs text-slate-400 w-10 text-right">
                {Math.round((seg.value / total) * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────────
function ActivityLineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">No data available yet.</p>;
  }
  return (
    <div className="mt-6 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            dy={10}
          />
          <Tooltip
            cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '8px 12px', color: '#f8fafc' }}
            itemStyle={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: any) => [`${value} completions`, '']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OperatorDashboard() {
  const { t } = useTranslation();
  const { user } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([applicationApi.list(), userApi.list(), paymentApi.list()])
      .then(([apps, allUsers, allPayments]) => {
        setApplications(apps);
        setUsers(allUsers);
        setPayments(allPayments);
      })
      .catch((err) => setError(err.message));
  }, []);

  // 1. Operator's own booked applications
  const myApplications = applications.filter((a) => a.staffId === user?.id);

  // 2. Payments pending to review:
  const paymentsPendingReview = payments.filter((p) => p.status === 'pending' || !p.paid).length;

  // 3. Applications fully completed today (status === 'completed' on today's local date)
  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };
  const completedToday = applications.filter(
    (a) => a.status === 'completed' && isToday(a.updatedAt || a.createdAt)
  ).length;



  // 5. Completion by date in line chart (last 14 days)
  const last14DaysArray = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const completionRateData = last14DaysArray.map(dateStr => {
    const count = applications.filter((a) => {
      if (a.status !== 'completed') return false;
      const targetDate = a.updatedAt || a.createdAt;
      return targetDate.startsWith(dateStr);
    }).length;
    return {
      label: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: count
    };
  });

  // 6. Not Assigned Applications count (awaiting operator assignment)
  const unassignedInHub = applications.filter((a) => !a.staffId).length;

  // 7. Operator can review (applications in 'pending_approval' or 'requested' status)
  const operatorCanReview = applications.filter(
    (a) => (a.status === 'pending_approval' || a.status === 'requested') && (!a.staffId || a.staffId === user?.id)
  ).length;

  // Sharp theme colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#2563eb';       // Solid Blue
      case 'processing': return '#7c3aed';      // Solid Violet
      case 'pending_approval': return '#d97706'; // Solid Amber
      case 'approved': return '#0d9488';         // Solid Teal
      case 'completed': return '#16a34a';        // Solid Green
      case 'rejected': return '#dc2626';         // Solid Red
      default: return '#4b5563';
    }
  };

  // Pie Chart: My Application Status Counts
  const myStatusSegments: DonutSegment[] = STATUS_ORDER.map(status => ({
    value: myApplications.filter(a => a.status === status).length,
    color: getStatusColor(status),
    label: STATUS_LABEL[status]
  }));

  // Pie Chart: All Application Status Counts
  const allStatusSegments: DonutSegment[] = STATUS_ORDER.map(status => ({
    value: applications.filter(a => a.status === status).length,
    color: getStatusColor(status),
    label: STATUS_LABEL[status]
  }));

  // 1. Average completions per day over last 14 days
  const dailyCompletionsList = last14DaysArray.map(dateStr => {
    return applications.filter((a) => a.status === 'completed' && (a.updatedAt || a.createdAt).startsWith(dateStr)).length;
  });
  const sumCompletions14Days = dailyCompletionsList.reduce((sum, val) => sum + val, 0);
  const avgCompletionsPerDay = (sumCompletions14Days / 14).toFixed(1);

  // 2. Booked applications from the full hub
  const bookedApplicationsCount = applications.filter((a) => a.staffId !== null).length;
  const totalApplicationsCount = applications.length;
  const bookingRatePct = totalApplicationsCount > 0 ? Math.round((bookedApplicationsCount / totalApplicationsCount) * 100) : 0;

  // 3. Completion rate from all booked applications
  const completedBookedApplications = applications.filter((a) => a.staffId !== null && a.status === 'completed').length;
  const completionRateOfBooked = bookedApplicationsCount > 0 ? Math.round((completedBookedApplications / bookedApplicationsCount) * 100) : 0;

  // 4. Operator Leaderboard data
  const operators = users.filter((u) => u.role === 'operator');
  const operatorLeaderboard = operators
    .map((op) => {
      const opsApps = applications.filter((a) => a.staffId === op.id);
      const completedCount = opsApps.filter((a) => a.status === 'completed').length;
      const bookedCount = opsApps.length;
      const completionRate = bookedCount > 0 ? Math.round((completedCount / bookedCount) * 100) : 0;
      return {
        id: op.id,
        name: op.name,
        email: op.email,
        completedCount,
        bookedCount,
        completionRate,
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount || b.completionRate - a.completionRate)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">{t('nav.dashboardHub')}</h1>
        <p className="text-slate-400 mt-1">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {t('dashboard.welcome')}, {user?.name}
        </p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3">{error}</p>}

      {/* ── Key Metrics Cards Grid (Solid Color Ranges) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border p-5 shadow-lg bg-emerald-950/40 border-emerald-800/60 text-emerald-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Completed Today</p>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{completedToday}</p>
          <p className="text-xs text-emerald-300/80 mt-1">Fully complete today</p>
        </div>


        <div className="rounded-2xl border p-5 shadow-lg bg-amber-950/40 border-amber-800/60 text-amber-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Operator Review</p>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{operatorCanReview}</p>
          <p className="text-xs text-amber-300/80 mt-1">Awaiting operator review</p>
        </div>

        <div className="rounded-2xl border p-5 shadow-lg bg-cyan-950/40 border-cyan-800/60 text-cyan-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Not Assigned</p>
            <ClipboardList className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{unassignedInHub}</p>
          <p className="text-xs text-cyan-300/80 mt-1">Awaiting assignment</p>
        </div>

        <div className="rounded-2xl border p-5 shadow-lg bg-rose-950/40 border-rose-800/60 text-rose-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Payments Pending</p>
            <CreditCard className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{paymentsPendingReview}</p>
          <p className="text-xs text-rose-300/80 mt-1">Payments to review</p>
        </div>
      </div>

      {/* ── Leaderboard & System Performance Analysis (Solid Slate Container) ── */}
      <div className="bg-slate-900/90 rounded-3xl p-8 shadow-xl border border-slate-800 animate-fadeIn text-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-100 text-lg">Leaderboard & System Analysis</h2>
            <p className="text-sm text-slate-400">Operator performance ranking and key operational metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Operator Leaderboard Table */}
          <div className="lg:col-span-2 border border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-slate-950/60">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80">
              <h3 className="font-bold text-slate-200 text-sm">Operator Leaderboard (Top 5)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-800 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3 text-center">Booked</th>
                    <th className="px-4 py-3 text-center">Completed</th>
                    <th className="px-4 py-3 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-transparent">
                  {operatorLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No operators logged.</td>
                    </tr>
                  ) : (
                    operatorLeaderboard.map((op) => (
                      <tr key={op.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-100">{op.name}</p>
                            <p className="text-[10px] text-slate-400">{op.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-slate-300">{op.bookedCount}</td>
                        <td className="px-4 py-3 text-center font-extrabold text-emerald-400">{op.completedCount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {op.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Metrics Column */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-all">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Daily Avg Completion</p>
              <p className="text-2xl font-extrabold text-slate-100 mt-1">{avgCompletionsPerDay} / day</p>
              <p className="text-[10px] text-slate-400 mt-2">Average completed applications per day over the last 14 days.</p>
            </div>

            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-all">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Hub Booking Rate</p>
              <p className="text-2xl font-extrabold text-slate-100 mt-1">{bookingRatePct}%</p>
              <p className="text-[10px] text-slate-400 mt-2">{bookedApplicationsCount} of {totalApplicationsCount} applications booked from the full hub.</p>
            </div>

            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-all">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Booked Completion Rate</p>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">{completionRateOfBooked}%</p>
              <p className="text-[10px] text-slate-400 mt-2">Ratio of completed applications from all currently booked ones.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Distribution Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-8 text-slate-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-lg">My Applications Status</h2>
              <p className="text-sm text-slate-400">Distribution of your booked applications</p>
            </div>
          </div>
          {myApplications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No applications assigned to you.</p>
          ) : (
            <BeautifulPieChart segments={myStatusSegments} total={myApplications.length} />
          )}
        </div>

        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-8 text-slate-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-lg">System Application Statuses</h2>
              <p className="text-sm text-slate-400">Platform-wide pipeline overview</p>
            </div>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No applications found.</p>
          ) : (
            <BeautifulPieChart segments={allStatusSegments} total={applications.length} />
          )}
        </div>
      </div>

      {/* ── Completion Rate Line Chart (Full Width) ── */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-8 text-slate-100">
        <div className="mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-100 text-lg">Completion Rates</h2>
            <p className="text-sm text-slate-400">Applications completed over time</p>
          </div>
        </div>
        <ActivityLineChart data={completionRateData} />
      </div>
    </div>
  );
}
