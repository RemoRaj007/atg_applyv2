import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, FileText, RotateCcw, Save } from 'lucide-react';

import { contentApi, type ContentBlock } from '../../api/contentApi';
import Button from '../../components/ui/AtgButton';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PAGES = [
  { key: 'landing', label: 'Landing page' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'how-it-works', label: 'How it works' },
  { key: 'contact', label: 'Contact' },
  { key: 'privacy', label: 'Privacy policy' },
  { key: 'terms', label: 'Terms of service' },
];

export default function AdminSiteContent() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [activePage, setActivePage] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await contentApi.listContent();
      setBlocks(rows);
      setDraft(Object.fromEntries(rows.map((r) => [r.id, r.value])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onPage = useMemo(
    () => blocks.filter((b) => b.page === activePage).sort((a, b) => a.sortOrder - b.sortOrder),
    [blocks, activePage]
  );

  // Only edited blocks are sent, so saving one page cannot clobber another.
  const changed = useMemo(
    () => blocks.filter((b) => draft[b.id] !== undefined && draft[b.id] !== b.value),
    [blocks, draft]
  );

  const save = async () => {
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await contentApi.saveContent(changed.map((b) => ({ id: b.id, value: draft[b.id] })));
      toast.success(`Saved ${changed.length} block${changed.length === 1 ? '' : 's'}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    try {
      await contentApi.resetPage(activePage);
      toast.success('Restored to the shipped copy');
      await load();
    } catch {
      toast.error('Could not restore this page');
    }
  };

  const loadDefaults = async () => {
    try {
      await contentApi.seedDefaults();
      toast.success('Any missing content has been added');
      await load();
    } catch {
      toast.error('Could not load the defaults');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn text-white">
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Site Content</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            The copy on every public page. Text only — it is rendered as plain text, never as HTML.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadDefaults} className="py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer">
            Load missing defaults
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmReset(true)}
            className="py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Restore page
          </Button>
          <Button
            onClick={save}
            disabled={changed.length === 0 || saving}
            className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : changed.length > 0 ? `Save ${changed.length}` : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="px-8 pt-5 pb-5 flex flex-wrap gap-2 border-b border-slate-800">
        {PAGES.map((p) => {
          const dirtyOnPage = blocks.filter((b) => b.page === p.key && draft[b.id] !== b.value).length;
          return (
            <button
              key={p.key}
              onClick={() => setActivePage(p.key)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                activePage === p.key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {p.label}
              {dirtyOnPage > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  {dirtyOnPage}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading content…</p>}

      {error && !loading && (
        <div className="p-8 flex items-center gap-2 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="p-8 space-y-5">
          {onPage.length === 0 && (
            <p className="text-sm text-slate-400">
              No content rows for this page yet — use “Load missing defaults” to create them.
            </p>
          )}

          {onPage.map((b) => {
            const dirty = draft[b.id] !== b.value;
            const isLong = b.valueType === 'longtext' || b.valueType === 'markdown';
            return (
              <div key={b.id} className="grid md:grid-cols-3 gap-3 items-start pb-5 border-b border-slate-800/60 last:border-0">
                <div>
                  <span className="text-sm font-semibold text-slate-200">{b.label}</span>
                  <code className="block text-[11px] text-slate-500">{b.key}</code>
                  {b.valueType === 'markdown' && (
                    <span className="text-[10px] text-slate-500">
                      Markdown: ## for headings, - for bullets.
                    </span>
                  )}
                  {b.helpText && <p className="text-[11px] text-slate-500 mt-1">{b.helpText}</p>}
                </div>
                <div className="md:col-span-2">
                  {isLong ? (
                    <textarea
                      rows={b.valueType === 'markdown' ? 12 : 3}
                      value={draft[b.id] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                      className={`w-full py-2 px-3 rounded-xl bg-slate-800 border text-sm text-white focus:outline-none focus:border-blue-500 ${
                        dirty ? 'border-amber-500/60' : 'border-slate-700'
                      } ${b.valueType === 'markdown' ? 'font-mono text-[13px]' : ''}`}
                    />
                  ) : (
                    <input
                      value={draft[b.id] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                      className={`w-full py-2 px-3 rounded-xl bg-slate-800 border text-sm text-white focus:outline-none focus:border-blue-500 ${
                        dirty ? 'border-amber-500/60' : 'border-slate-700'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmReset}
        title="Restore this page?"
        message={`Every block on “${PAGES.find((p) => p.key === activePage)?.label}” goes back to the copy that ships in the code. Your edits to this page are lost.`}
        confirmText="Restore"
        confirmVariant="warning"
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
