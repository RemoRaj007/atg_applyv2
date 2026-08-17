import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lock, AlertTriangle, MessageSquarePlus, ShieldCheck } from 'lucide-react';

import { profileSchemaApi } from '../../api/profileSchemaApi';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { useProfileSchema } from './hooks/useProfileSchema';
import { chapterTitle, fieldLabel } from './profile.validation';
import type { ChapterStatus } from './profile.types';

const STATUS_STYLE: Record<ChapterStatus, string> = {
  complete: 'text-[#248A3D]',
  in_progress: 'text-[#F05A28]',
  needs_review: 'text-[#D70015]',
  not_started: 'text-[#6E6E73]',
};

/**
 * The operator's read-only view of a candidate's structured profile.
 *
 * Read-only is the design, not a limitation. An operator who thinks a fact is
 * wrong raises a correction request the candidate acts on; there is no write
 * path to a candidate's values anywhere in this component or the API behind it,
 * so a candidate's history cannot be quietly rewritten by staff.
 *
 * Restricted values never arrive here — the server withholds them — so the
 * lock below is describing a decision already enforced, not making one.
 */
export default function OperatorProfileView({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const toMessage = useErrorMessage();
  const { profile, loading, error } = useProfileSchema(userId);

  const [noteBody, setNoteBody] = useState('');
  const [correctionFor, setCorrectionFor] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const saveNote = async () => {
    if (!noteBody.trim()) return;
    setBusy(true);
    try {
      await profileSchemaApi.addNote(userId, noteBody.trim());
      setNoteBody('');
      toast.success(t('operatorProfile.noteSaved', { defaultValue: 'Note saved.' }));
    } catch (err) {
      toast.error(toMessage(err, 'Failed to save the note'));
    } finally {
      setBusy(false);
    }
  };

  const sendCorrection = async () => {
    if (!correctionFor || correctionReason.trim().length < 3) return;
    setBusy(true);
    try {
      await profileSchemaApi.requestCorrection(userId, correctionFor, correctionReason.trim());
      setCorrectionFor(null);
      setCorrectionReason('');
      toast.success(t('operatorProfile.correctionSent', { defaultValue: 'Correction requested.' }));
    } catch (err) {
      toast.error(toMessage(err, 'Failed to request the correction'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="p-6 text-base text-[#6E6E73]">{t('common.loading', { defaultValue: 'Loading…' })}</p>;
  if (error) return <p role="alert" className="p-6 text-base text-[#D70015]">{error}</p>;
  if (!profile) return null;

  const missing = profile.completion.filter((c) => c.requiredMissing.length > 0);

  return (
    <div className="bg-white text-[#1D1D1F]">
      {/* Missing and uncertain facts first: it is what an operator opens the
          profile to find out before preparing anything. */}
      {missing.length > 0 && (
        <div className="mb-6 border border-[#D2D2D7] rounded-xl p-4 bg-[#F5F5F7]">
          <p className="inline-flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="w-4 h-4 text-[#D70015]" aria-hidden="true" />
            {t('operatorProfile.missingHeading', { defaultValue: 'Missing required facts' })}
          </p>
          <ul className="mt-2 text-sm text-[#6E6E73] space-y-1">
            {missing.map((chapter) => (
              <li key={chapter.code}>
                {chapterTitle(chapter.code, chapter.title, t)} — {chapter.requiredMissing.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.chapters.map((chapter) => {
        const completion = profile.completion.find((c) => c.code === chapter.code);
        const answered = chapter.fields.filter((f) => (f.values ?? []).some((v) => v.value?.trim()));
        if (!answered.length && !chapter.fields.some((f) => f.gated)) return null;

        return (
          <section key={chapter.code} className="mb-8">
            <header className="flex items-baseline justify-between gap-4 pb-2 border-b border-[#D2D2D7]">
              <h3 className="text-lg font-semibold">{chapterTitle(chapter.code, chapter.title, t)}</h3>
              {completion && (
                <span className={`text-sm ${STATUS_STYLE[completion.status]}`}>
                  {completion.filled}/{completion.total}
                </span>
              )}
            </header>

            <dl className="divide-y divide-[#D2D2D7]">
              {chapter.fields.map((field) => {
                const entries = field.values ?? [];
                if (!entries.some((v) => v.value?.trim()) && !field.gated) return null;

                return (
                  <div key={field.code} className="py-3">
                    <dt className="text-sm text-[#6E6E73] flex items-center gap-2">
                      {fieldLabel(field.code, field.label, t)}
                      <span className="text-xs text-[#86868B]">({field.code})</span>
                      {/* Application-use and AI policy shown per value, so an
                          operator knows what a fact may be used for before they
                          use it. */}
                      {field.externalAiPolicy === 'NO' && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#6E6E73]">
                          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                          {t('operatorProfile.noAi', { defaultValue: 'no external AI' })}
                        </span>
                      )}
                    </dt>

                    <dd className="mt-1 text-base whitespace-pre-line">
                      {field.gated ? (
                        <span className="inline-flex items-center gap-2 text-sm text-[#6E6E73]">
                          <Lock className="w-4 h-4" aria-hidden="true" />
                          {t('operatorProfile.restricted', {
                            defaultValue: 'Restricted — request just-in-time for a named application.',
                          })}
                        </span>
                      ) : (
                        entries
                          .filter((v) => v.value?.trim())
                          .map((v) => (
                            <p key={v.repeatIndex} className="mb-1">
                              {entries.length > 1 && (
                                <span className="text-xs text-[#86868B] mr-2">#{v.repeatIndex + 1}</span>
                              )}
                              {v.value}
                            </p>
                          ))
                      )}
                    </dd>

                    {field.defaultApplicationUse && (
                      <p className="mt-1 text-xs text-[#86868B]">{field.defaultApplicationUse}</p>
                    )}

                    {!field.gated && (
                      <button
                        type="button"
                        onClick={() => setCorrectionFor(field.code)}
                        className="mt-2 text-sm text-[#0066CC] hover:underline"
                      >
                        {t('operatorProfile.requestCorrection', { defaultValue: 'Request correction' })}
                      </button>
                    )}
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}

      {correctionFor && (
        <div className="border border-[#D2D2D7] rounded-xl p-4 mb-6">
          <label htmlFor="correction-reason" className="block text-base font-medium mb-2">
            {t('operatorProfile.correctionFor', {
              defaultValue: 'Ask the candidate to correct {{code}}',
              code: correctionFor,
            })}
          </label>
          <textarea
            id="correction-reason"
            rows={3}
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-base outline-none focus:border-[#0066CC]"
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={busy || correctionReason.trim().length < 3}
              onClick={sendCorrection}
              className="min-h-11 px-4 py-2 bg-[#0066CC] hover:bg-[#0055AA] text-white rounded-lg text-base font-medium disabled:opacity-50"
            >
              {t('operatorProfile.sendCorrection', { defaultValue: 'Send request' })}
            </button>
            <button
              type="button"
              onClick={() => setCorrectionFor(null)}
              className="min-h-11 px-4 py-2 border border-[#D2D2D7] rounded-lg text-base"
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </div>
      )}

      {/* Private notes, visually and structurally separate from candidate facts
          above — they are stored in a different table and never returned to the
          candidate. */}
      <section className="border-t border-[#D2D2D7] pt-6">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
          <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
          {t('operatorProfile.notesHeading', { defaultValue: 'Private operator notes' })}
        </h3>
        <p className="text-sm text-[#6E6E73] mt-1">
          {t('operatorProfile.notesHint', { defaultValue: 'Only staff can see these. The candidate cannot.' })}
        </p>
        <textarea
          rows={3}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          className="w-full mt-3 px-4 py-3 border border-[#D2D2D7] rounded-lg text-base outline-none focus:border-[#0066CC]"
        />
        <button
          type="button"
          disabled={busy || !noteBody.trim()}
          onClick={saveNote}
          className="mt-3 min-h-11 px-4 py-2 border border-[#D2D2D7] rounded-lg text-base hover:bg-[#F5F5F7] disabled:opacity-50"
        >
          {t('operatorProfile.saveNote', { defaultValue: 'Save note' })}
        </button>
      </section>
    </div>
  );
}
