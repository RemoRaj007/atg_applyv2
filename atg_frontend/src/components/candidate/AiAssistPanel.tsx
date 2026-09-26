import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, Copy, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { aiApi, AiError } from '../../api/aiApi';
import type { AiDraft, AiFitExplanation, AiSharingPreview, AiStatus, AiTone } from '../../api/aiApi';
import { SUPPORTED_LANGUAGES } from '../ui/LanguageSelector';

interface Props {
  targetType: 'job' | 'scholarship';
  targetId: number;
}

/**
 * AI help for one job or scholarship: a draft cover letter or statement, and
 * (for jobs) a plain-language explanation of the fit score.
 *
 * Renders nothing unless the server reports AI as enabled, so a deployment
 * without a provider key simply has no AI UI rather than a broken one.
 *
 * Nothing leaves the platform until the candidate has seen exactly which
 * profile answers would be sent and ticked the consent box.
 */
export default function AiAssistPanel({ targetType, targetId }: Props) {
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<AiSharingPreview | null>(null);
  const [showShared, setShowShared] = useState(false);
  const [consent, setConsent] = useState(false);
  const [includeLimited, setIncludeLimited] = useState(false);
  const [tone, setTone] = useState<AiTone>('professional');
  const [language, setLanguage] = useState(() => {
    const code = i18n.language?.substring(0, 2) || 'en';
    return SUPPORTED_LANGUAGES.some((l) => l.code === code) ? code : 'en';
  });
  const [busy, setBusy] = useState<'draft' | 'fit' | null>(null);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [draftText, setDraftText] = useState('');
  const [fit, setFit] = useState<AiFitExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    aiApi
      .status()
      .then((s) => !cancelled && setStatus(s))
      // Not configured, not a candidate, or unreachable: in every case the
      // right UI is none at all.
      .catch(() => !cancelled && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open || preview) return;
    aiApi.preview().then(setPreview).catch((err: AiError) => setError(err.message));
  }, [open, preview]);

  if (!status?.enabled) return null;

  const remaining = draft?.remainingToday ?? fit?.remainingToday ?? status.remainingToday;
  const outOfQuota = remaining <= 0;
  const letterWord = targetType === 'scholarship' ? 'statement' : 'cover letter';

  const run = async (kind: 'draft' | 'fit') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'draft') {
        const result = await aiApi.draft({ targetType, targetId }, { tone, language, includeLimited });
        setDraft(result);
        setDraftText(result.draft);
      } else {
        setFit(await aiApi.explainFit(targetId, { language, includeLimited }));
      }
    } catch (err) {
      setError(err instanceof AiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy — select the text and copy it manually');
    }
  };

  return (
    <div className="border border-violet-800/50 rounded-2xl bg-violet-950/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-violet-200">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          AI assistant
        </span>
        <span className="flex items-center gap-2 text-[11px] text-slate-400">
          {remaining} of {status.dailyLimit} left today
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-xs text-slate-300">
          {/* What gets shared — the consent screen */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 space-y-2">
            <p className="flex items-center gap-1.5 font-bold text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              What the AI service would see
            </p>
            {!preview ? (
              <p className="text-slate-400">Checking your profile…</p>
            ) : (
              <ul className="space-y-1.5">
                <li>
                  The {targetType} details, and{' '}
                  <button type="button" className="underline decoration-dotted text-violet-300" onClick={() => setShowShared((v) => !v)}>
                    {preview.shared.length} profile answer{preview.shared.length === 1 ? '' : 's'}
                  </button>{' '}
                  your profile marks as shareable.
                  {showShared && preview.shared.length > 0 && (
                    <span className="block mt-1 text-slate-400">{preview.shared.map((f) => f.label).join(' · ')}</span>
                  )}
                </li>
                {preview.limited.length > 0 && (
                  <li>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={includeLimited} onChange={(e) => setIncludeLimited(e.target.checked)} />
                      <span>
                        Also include {preview.limited.length} limited detail{preview.limited.length === 1 ? '' : 's'}:{' '}
                        <span className="text-slate-400">{preview.limited.map((f) => f.label).join(' · ')}</span>
                      </span>
                    </label>
                  </li>
                )}
                <li className="text-slate-400">
                  {preview.neverShared} private answer{preview.neverShared === 1 ? ' is' : 's are'} never sent — health, identity documents, references and similar.
                  Your email and phone number are never sent.
                </li>
              </ul>
            )}
            <label className="flex items-start gap-2 pt-1 cursor-pointer text-slate-200">
              <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to send the details above to NVIDIA's AI service ({status.model.split('/').pop()}) for this request. They are not stored by ATG Apply.</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400">Tone</span>
              <select value={tone} onChange={(e) => setTone(e.target.value as AiTone)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200">
                <option value="professional">Professional</option>
                <option value="warm">Warm</option>
                <option value="concise">Concise</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400">Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.english}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!consent || !preview || busy !== null || outOfQuota}
              onClick={() => run('draft')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold disabled:opacity-40"
            >
              {busy === 'draft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />}
              {busy === 'draft' ? 'Writing — up to a minute…' : `Draft a ${letterWord}`}
            </button>
            {targetType === 'job' && (
              <button
                type="button"
                disabled={!consent || !preview || busy !== null || outOfQuota}
                onClick={() => run('fit')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-700 text-violet-200 hover:bg-violet-900/40 font-bold disabled:opacity-40"
              >
                {busy === 'fit' && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                Explain my fit
              </button>
            )}
          </div>
          {outOfQuota && <p className="text-amber-300">You've used today's AI requests. They reset over the next 24 hours.</p>}
          {error && (
            <p role="alert" className="text-rose-300">
              {error}
            </p>
          )}

          {fit && (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 space-y-2">
              <p className="font-bold text-slate-200">Your fit: {fit.fitScore}%</p>
              <p>{fit.explanation.summary}</p>
              {(
                [
                  ['Strengths', fit.explanation.strengths],
                  ['Gaps', fit.explanation.gaps],
                  ['What you could do', fit.explanation.actions],
                ] as const
              ).map(([title, items]) =>
                items.length ? (
                  <div key={title}>
                    <p className="font-semibold text-slate-400">{title}</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}

          {draft && (
            <div className="space-y-2">
              {/* The model can be confidently wrong. Say so where the text is. */}
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-950/40 border border-amber-800/50 p-2 text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  AI-drafted. Check every fact before you use it.
                  {draft.placeholders > 0 && ` ${draft.placeholders} gap${draft.placeholders === 1 ? '' : 's'} marked [ADD: …] need your details.`}
                  {draft.truncated && ' The draft was cut short — try again or shorten it.'}
                </span>
              </p>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={14}
                aria-label={`Draft ${letterWord}`}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button type="button" onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 font-bold">
                <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
