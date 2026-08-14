import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Eye, Mail, RotateCcw, Save } from 'lucide-react';

import { contentApi, type EmailTemplate } from '../../api/contentApi';
import Button from '../../components/ui/AtgButton';

// Sample values used only for the preview, so an admin can see the shape of the
// finished email without sending one.
const SAMPLE: Record<string, string> = {
  name: 'Ada Perera',
  email: 'ada@example.com',
  plan: 'Premium',
  siteName: 'ATG Apply',
  title: 'Senior Engineer @ Acme',
  status: 'completed',
  body: 'Your application has moved to the next stage.',
  resetLink: 'https://atgapply.atgconcordia.com/reset-password?token=…',
};

const renderPreview = (text: string) =>
  text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => SAMPLE[key] ?? match);

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = async (keepSelection = true) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await contentApi.listTemplates();
      setTemplates(rows);
      const next = (keepSelection && rows.find((t) => t.id === selectedId)) || rows[0];
      if (next) select(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setSubject(template.subject);
    setBody(template.body);
  };

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);
  const dirty = selected ? subject !== selected.subject || body !== selected.body : false;

  const variables: string[] = useMemo(() => {
    if (!selected?.variables) return [];
    try {
      const parsed = JSON.parse(selected.variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selected]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await contentApi.saveTemplate(selected.id, { subject, body });
      toast.success('Template saved');
      await load();
    } catch (err) {
      // The API rejects unknown placeholders and names them, so surface it as-is.
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!selected) return;
    try {
      await contentApi.resetTemplate(selected.id);
      toast.success('Restored to the shipped copy');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore');
    }
  };

  const insertVariable = (name: string) => {
    setBody((b) => `${b}{{${name}}}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn text-white">
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Email Templates</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            The wording of every automated email. Placeholders are filled in when the mail is sent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview((p) => !p)}
            className="py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Eye className="h-4 w-4" /> {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={reset}
            disabled={!selected}
            className="py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Restore
          </Button>
          <Button
            onClick={save}
            disabled={!dirty || saving}
            className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>
        </div>
      </div>

      {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading templates…</p>}

      {error && !loading && (
        <div className="p-8 flex items-center gap-2 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <p className="p-8 text-sm text-slate-400">
          No templates yet. Open Site Settings and choose “Load missing defaults”.
        </p>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="grid md:grid-cols-[260px_1fr]">
          <div className="border-r border-slate-800 p-4 space-y-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => select(t)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer border ${
                  t.id === selectedId
                    ? 'bg-blue-600/15 border-blue-500/40'
                    : 'bg-transparent border-transparent hover:bg-slate-850'
                }`}
              >
                <div className="text-sm font-semibold text-slate-200">{t.name}</div>
                <code className="text-[11px] text-slate-500">{t.key}</code>
                {!t.isActive && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">off</span>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="p-8 space-y-5">
              {selected.description && <p className="text-xs text-slate-500">{selected.description}</p>}

              {variables.length > 0 && !showPreview && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Available placeholders — click to insert
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {variables.map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono text-blue-300 hover:border-blue-500 cursor-pointer"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Subject</span>
                {showPreview ? (
                  <p className="mt-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white">
                    {renderPreview(subject)}
                  </p>
                ) : (
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              </label>

              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Body</span>
                {showPreview ? (
                  <pre className="mt-1 py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap font-sans">
                    {renderPreview(body)}
                  </pre>
                ) : (
                  <textarea
                    rows={14}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="mt-1 w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                )}
              </label>

              {showPreview && (
                <p className="text-[11px] text-slate-500">
                  Preview uses sample values. The real email is plain text, exactly as shown.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
