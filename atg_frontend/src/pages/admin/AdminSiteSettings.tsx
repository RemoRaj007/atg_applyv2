import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Palette, Save, Settings2, Share2, Mail, SlidersHorizontal } from 'lucide-react';

import { contentApi, type SiteSetting } from '../../api/contentApi';
import Button from '../../components/ui/AtgButton';

const GROUPS: { key: string; label: string; icon: typeof Settings2; blurb: string }[] = [
  { key: 'branding', label: 'Branding', icon: Palette, blurb: 'Name, tagline, logo and accent colour.' },
  { key: 'contact', label: 'Contact', icon: Mail, blurb: 'What the public site shows as your contact details.' },
  { key: 'social', label: 'Social links', icon: Share2, blurb: 'Shown in the footer. Leave blank to hide a network.' },
  { key: 'general', label: 'General', icon: Settings2, blurb: 'Sign-up availability and the site-wide banner.' },
  { key: 'limits', label: 'Limits', icon: SlidersHorizontal, blurb: 'Default quotas and capacities.' },
];

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState('branding');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await contentApi.listSettings();
      setSettings(rows);
      setDraft(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const inGroup = useMemo(
    () => settings.filter((s) => s.group === activeGroup).sort((a, b) => a.sortOrder - b.sortOrder),
    [settings, activeGroup]
  );

  // Only the rows the admin actually touched are sent, so a save cannot
  // overwrite a value someone else changed in another tab.
  const changed = useMemo(
    () => settings.filter((s) => draft[s.key] !== undefined && draft[s.key] !== s.value),
    [settings, draft]
  );

  const save = async () => {
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await contentApi.saveSettings(changed.map((s) => ({ key: s.key, value: draft[s.key] })));
      toast.success(`Saved ${changed.length} setting${changed.length === 1 ? '' : 's'}`);
      await load();
    } catch (err) {
      // The API validates per type and names the offending field.
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const loadDefaults = async () => {
    try {
      await contentApi.seedDefaults();
      toast.success('Any missing defaults have been added');
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
            <Settings2 className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Site Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Branding, contact details and toggles — changed here, live everywhere, no deploy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadDefaults} className="py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer">
            Load missing defaults
          </Button>
          <Button
            onClick={save}
            disabled={changed.length === 0 || saving}
            className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : changed.length > 0 ? `Save ${changed.length} change${changed.length === 1 ? '' : 's'}` : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="px-8 pt-5 flex flex-wrap gap-2 border-b border-slate-800 pb-5">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const count = settings.filter((s) => s.group === g.key).length;
          return (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                activeGroup === g.key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {g.label}
              <span className="text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading settings…</p>}

      {error && !loading && (
        <div className="p-8 flex items-center gap-2 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="p-8 space-y-5">
          <p className="text-xs text-slate-500">{GROUPS.find((g) => g.key === activeGroup)?.blurb}</p>

          {inGroup.length === 0 && (
            <p className="text-sm text-slate-400">
              Nothing in this group yet — use “Load missing defaults” to populate it.
            </p>
          )}

          {inGroup.map((setting) => (
            <SettingRow
              key={setting.key}
              setting={setting}
              value={draft[setting.key] ?? ''}
              dirty={draft[setting.key] !== setting.value}
              onChange={(value) => setDraft((d) => ({ ...d, [setting.key]: value }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  value,
  dirty,
  onChange,
}: {
  setting: SiteSetting;
  value: string;
  dirty: boolean;
  onChange: (value: string) => void;
}) {
  const inputClass = `w-full py-2 px-3 rounded-xl bg-slate-800 border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ${
    dirty ? 'border-amber-500/60' : 'border-slate-700'
  }`;

  return (
    <div className="grid md:grid-cols-3 gap-3 items-start pb-5 border-b border-slate-800/60 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{setting.label}</span>
          {setting.isPublic && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              public
            </span>
          )}
        </div>
        <code className="text-[11px] text-slate-500">{setting.key}</code>
        {setting.description && <p className="text-[11px] text-slate-500 mt-1">{setting.description}</p>}
      </div>

      <div className="md:col-span-2">
        {setting.valueType === 'boolean' ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} cursor-pointer`}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        ) : setting.valueType === 'longtext' ? (
          <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        ) : setting.valueType === 'color' ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#2563eb'}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-14 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
            />
            <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
          </div>
        ) : (
          <input
            type={setting.valueType === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={setting.valueType === 'url' ? 'https://…' : ''}
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}
