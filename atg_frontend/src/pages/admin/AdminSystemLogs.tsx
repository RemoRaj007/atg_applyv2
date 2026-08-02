import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  ShieldCheck,
  Server,
} from 'lucide-react';

import { logApi, type LogEntry, type LogFilters, type LogSummary } from '../../api/logApi';
import Button from '../../components/ui/AtgButton';

const PAGE_SIZE = 50;

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'system', label: 'System' },
  { value: 'activity', label: 'Activity' },
  { value: 'security', label: 'Security' },
];

const LEVELS = [
  { value: '', label: 'All levels' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'security', label: 'Security' },
  { value: 'activity', label: 'Activity' },
];

const levelStyles: Record<string, string> = {
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  security: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
  activity: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const categoryIcons: Record<string, typeof Server> = {
  system: Server,
  activity: Activity,
  security: ShieldCheck,
};

const emptyFilters: LogFilters = { category: '', level: '', search: '', from: '', to: '' };

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // `filters` is what the inputs hold; `applied` is what the last request used,
  // so typing in the search box does not fire a request per keystroke.
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [applied, setApplied] = useState<LogFilters>(emptyFilters);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await logApi.list({ ...applied, limit: PAGE_SIZE, offset });
      setLogs(page.logs);
      setTotal(page.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system logs');
    } finally {
      setLoading(false);
    }
  }, [applied, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    logApi.summary(7).then(setSummary).catch(() => setSummary(null));
  }, []);

  const applyFilters = () => {
    setOffset(0); // a new filter set always starts at the first page
    setApplied(filters);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setOffset(0);
  };

  const download = async () => {
    try {
      const blob = await logApi.exportCsv(applied);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atg-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the logs');
    }
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn text-white">
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">System &amp; Audit Logs</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every system, activity and security event the platform records — who did what, and when.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchLogs}
            className="py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={download}
            className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {summary && (
        <div className="px-8 py-5 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryTile label={`Events (${summary.days}d)`} value={summary.total} icon={Activity} tone="text-sky-400" />
          {(['system', 'activity', 'security'] as const).map((cat) => (
            <SummaryTile
              key={cat}
              label={cat[0].toUpperCase() + cat.slice(1)}
              value={summary.byCategory[cat] ?? 0}
              icon={categoryIcons[cat]}
              tone={cat === 'security' ? 'text-fuchsia-400' : cat === 'activity' ? 'text-emerald-400' : 'text-slate-300'}
              warn={cat === 'security' && (summary.byLevel.error ?? 0) > 0}
            />
          ))}
        </div>
      )}

      <div className="px-8 py-5 border-b border-slate-800 flex flex-wrap items-end gap-3">
        <Field label="Search message">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="e.g. Login failed"
              className="w-56 pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </Field>

        <Field label="Category">
          <Select
            value={filters.category ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            options={CATEGORIES}
          />
        </Field>

        <Field label="Level">
          <Select value={filters.level ?? ''} onChange={(v) => setFilters((f) => ({ ...f, level: v }))} options={LEVELS} />
        </Field>

        <Field label="From">
          <DateInput value={filters.from ?? ''} onChange={(v) => setFilters((f) => ({ ...f, from: v }))} />
        </Field>

        <Field label="To">
          <DateInput value={filters.to ?? ''} onChange={(v) => setFilters((f) => ({ ...f, to: v }))} />
        </Field>

        <Button onClick={applyFilters} className="py-2 px-5 rounded-xl text-xs font-bold cursor-pointer">
          Apply
        </Button>
        <Button variant="outline" onClick={resetFilters} className="py-2 px-4 rounded-xl text-xs font-bold cursor-pointer">
          Clear
        </Button>
      </div>

      {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading logs…</p>}

      {error && !loading && (
        <div className="p-8 flex items-center gap-2 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="p-8 text-sm text-slate-400">No log entries match these filters.</p>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-850 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-8 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Level</th>
                <th className="text-left px-4 py-3 font-semibold">Message</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => {
                const Icon = categoryIcons[log.category] ?? Server;
                const hasMeta = log.meta && Object.keys(log.meta).length > 0;
                return (
                  <tr
                    key={log.id}
                    onClick={() => hasMeta && setExpanded(expanded === log.id ? null : log.id)}
                    className={`align-top ${hasMeta ? 'cursor-pointer hover:bg-slate-850/60' : ''}`}
                  >
                    <td className="px-8 py-3 whitespace-nowrap text-slate-400 text-xs font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          levelStyles[log.level] ?? 'bg-slate-700/40 text-slate-300 border-slate-600'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-xl">
                      {log.message}
                      {hasMeta && expanded === log.id && (
                        <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 overflow-x-auto">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      )}
                      {hasMeta && expanded !== log.id && (
                        <span className="ml-2 text-[11px] text-slate-500">· click for detail</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.userId ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-8 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>
          {total === 0
            ? 'No entries'
            : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="py-1.5 px-3 rounded-xl text-xs cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          <span className="tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="py-1.5 px-3 rounded-xl text-xs cursor-pointer"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ''}
      // The API takes ISO instants; a bare date would otherwise be read as
      // midnight in the server's zone rather than the viewer's.
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
      className="py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
    />
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
  warn,
}: {
  label: string;
  value: number;
  icon: typeof Server;
  tone: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-850 border border-slate-800 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${warn ? 'text-amber-400' : 'text-white'}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
