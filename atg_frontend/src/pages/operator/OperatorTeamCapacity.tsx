import { useEffect, useState } from 'react';
import { teamApi } from '../../api/teamApi';
import type { OperatorCapacity } from '../../types/team.types';
import { Users, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

const COLORS = ['#0284c7', '#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function OperatorTeamCapacity() {
  const [operators, setOperators] = useState<OperatorCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gauge' | 'distribution'>('gauge');

  useEffect(() => {
    teamApi
      .getCapacity()
      .then(setOperators)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalLoad = operators.reduce((sum, op) => sum + op.activeLoad, 0);
  const totalCapacity = operators.reduce((sum, op) => sum + op.capacity, 0);
  const headcount = operators.length;
  
  const avgUtilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;
  const atRiskCount = operators.filter(op => {
    const pct = op.capacity > 0 ? (op.activeLoad / op.capacity) * 100 : 0;
    return pct >= 75 && pct < 100;
  }).length;
  const overloadedCount = operators.filter(op => op.activeLoad >= op.capacity && op.capacity > 0).length;

  // Data for workload stacked bar chart
  const workloadChartData = operators.map(op => ({
    name: op.name,
    'Active Load': op.activeLoad,
    'Remaining Capacity': Math.max(0, op.capacity - op.activeLoad),
  }));

  // Data for load distribution pie chart
  const distributionPieData = operators
    .filter(op => op.activeLoad > 0)
    .map(op => ({
      name: op.name,
      value: op.activeLoad,
    }));

  // Gauge data for team utilization
  const gaugeData = [
    { 
      name: 'Used', 
      value: avgUtilization, 
      color: avgUtilization >= 90 ? '#f43f5e' : avgUtilization >= 75 ? '#f59e0b' : '#10b981' 
    },
    { 
      name: 'Remaining', 
      value: Math.max(0, 100 - avgUtilization), 
      color: '#334155' 
    }
  ];

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-8">
        <h1 className="text-3xl font-serif font-extrabold text-gray-900">Team Capacity & Workloads</h1>
        <p className="text-sm text-gray-500 mt-2">
          Capacity model: ~12 active users per specialist at ~35 min/user/week. Monitor and balance workloads before specialists hit capacity thresholds.
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm font-medium text-red-650 bg-red-55/50 border border-red-100 rounded-2xl">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Advanced Analytics Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Active Staff</span>
                <span className="text-2xl font-serif font-bold text-gray-900 mt-1">{headcount} Operators</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Workload</span>
                <span className="text-2xl font-serif font-bold text-gray-900 mt-1">{totalLoad} / {totalCapacity} Applications</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Avg Utilization</span>
                <span className={`text-2xl font-serif font-bold mt-1 block ${
                  avgUtilization >= 90 ? 'text-rose-600' : avgUtilization >= 75 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {avgUtilization}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                overloadedCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : atRiskCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Load Risk Warnings</span>
                <span className="text-2xl font-serif font-bold text-gray-900 mt-1">
                  {overloadedCount} Overloaded {atRiskCount > 0 && `(${atRiskCount} at risk)`}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Charting Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workload Allocation Stacked Horizontal Bar Chart */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm lg:col-span-2">
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="font-serif font-extrabold text-gray-850 text-lg">Workload Allocation & Limits</h2>
                <p className="text-xs text-gray-450 mt-1">Shows active workload stacked against remaining capacity for each operator.</p>
              </div>
              <div className="h-72 w-full">
                {workloadChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">No active operators.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={workloadChartData} margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} width={90} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', color: '#f8fafc' }}
                        itemStyle={{ fontWeight: 'semibold', fontSize: '12px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="Active Load" stackId="a" fill="#0284c7" maxBarSize={24} />
                      <Bar dataKey="Remaining Capacity" stackId="a" fill="#334155" maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Load Distribution / Utilization Gauge */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
                  <h2 className="font-serif font-extrabold text-gray-850 text-base">Team Allocation Analysis</h2>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button 
                      onClick={() => setActiveTab('gauge')}
                      className={`px-2 py-1 rounded-md transition-all ${activeTab === 'gauge' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                    >
                      Team Gauge
                    </button>
                    {distributionPieData.length > 0 && (
                      <button 
                        onClick={() => setActiveTab('distribution')}
                        className={`px-2 py-1 rounded-md transition-all ${activeTab === 'distribution' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                      >
                        Share
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-56 w-full relative flex items-center justify-center">
                  {activeTab === 'gauge' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            {gaugeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-gray-800 dark:text-white leading-none">{avgUtilization}%</span>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mt-1.5 whitespace-nowrap">Team Capacity Used</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-center">
                      <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distributionPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {distributionPieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                              itemStyle={{ fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-1 text-[10px] font-semibold px-2 border-t border-gray-50 pt-2 max-h-16 overflow-y-auto mt-2">
                        {distributionPieData.map((d, index) => (
                          <div key={d.name} className="flex justify-between items-center text-gray-600">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="truncate">{d.name}</span>
                            </div>
                            <span className="font-bold text-gray-850 shrink-0">{d.value} apps</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 text-center bg-gray-50 rounded-xl p-2.5 border border-gray-100/50">
                {avgUtilization >= 95 
                  ? "CRITICAL: The team is nearly fully saturated. Hire or reallocate operators." 
                  : avgUtilization >= 80 
                    ? "WARNING: Load is high. Check individual limits." 
                    : "Team utilization is within safe operational limits."}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Operator List View */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-55/30">
          <h2 className="font-serif font-extrabold text-gray-800 text-lg">Specialist Capacity Statuses</h2>
        </div>

        {loading && <p className="p-8 text-sm text-gray-500">Loading team capacity details...</p>}
        {!loading && !error && operators.length === 0 && (
          <p className="p-8 text-sm text-gray-500">No operators registered on the team.</p>
        )}

        <div className="divide-y divide-gray-100">
          {operators.map((op) => {
            const pct = op.capacity > 0 ? Math.min(100, Math.round((op.activeLoad / op.capacity) * 100)) : 0;
            const isOverloaded = op.capacity > 0 && op.activeLoad >= op.capacity;
            
            // Map roles based on name or defaults
            let displayRole = 'Application Specialist';
            if (op.name.includes('Nadia')) displayRole = 'Senior Researcher';
            if (op.name.includes('Imran')) displayRole = 'Researcher';
            if (op.name.includes('Dilani')) displayRole = 'QC Lead / Founder';
            
            const initials = op.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div key={op.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4 w-full md:w-1/3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs shadow-inner shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{op.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{displayRole}</p>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-medium shrink-0">of {op.capacity} users</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded ? 'bg-rose-600' : pct >= 75 ? 'bg-amber-600' : 'bg-brand-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600 shrink-0 w-8 text-right">{pct}%</span>
                </div>

                <div className="w-full md:w-28 md:text-right shrink-0">
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                    isOverloaded 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : pct >= 75 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                  }`}>
                    {isOverloaded ? 'At capacity' : pct >= 75 ? 'High load' : 'Available'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
