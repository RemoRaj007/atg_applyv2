import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { profileSchemaApi } from '../../api/profileSchemaApi';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { useProfileDraft, useRememberedChapter } from './hooks/useProfileDraft';
import ProfileChapterNav from './ProfileChapterNav';
import ProfileSectionHeader from './ProfileSectionHeader';
import ProfileFieldRenderer from './ProfileFieldRenderer';
import RepeatableEntryList from './RepeatableEntryList';
import ProfileProgress from './ProfileProgress';
import SavedState from './SavedState';
import { fieldsInGroup, groupsInChapter, chapterTitle } from './profile.validation';

/**
 * The candidate profile builder.
 *
 * Replaces the monolithic eight-step CandidateProfile form. Everything on the
 * page comes from the schema the server returns, so the 20 chapters and their
 * questions are data — adding a question to the catalogue does not touch this
 * file. A single content column, a readable chapter navigator, quiet autosave,
 * and the chapter restored after a refresh.
 */
export default function ProfileBuilderPage() {
  const { t } = useTranslation();
  const toMessage = useErrorMessage();
  const {
    profile,
    loading,
    loadError,
    saveState,
    saveError,
    setFieldValue,
    valueFor,
    flushPending,
    refreshCompletion,
    reload,
  } = useProfileDraft();

  const chapters = profile?.chapters ?? [];
  const [activeCode, selectChapter] = useRememberedChapter(chapters[0]?.code ?? '00');

  const activeIndex = useMemo(
    () => Math.max(0, chapters.findIndex((c) => c.code === activeCode)),
    [chapters, activeCode]
  );
  const chapter = chapters[activeIndex];
  const completion = profile?.completion.find((c) => c.code === chapter?.code);

  // Leaving a chapter saves anything still inside its debounce window, then
  // re-reads completion so the navigator's status dots are honest.
  const goTo = useCallback(
    async (code: string) => {
      await flushPending();
      selectChapter(code);
      await refreshCompletion();
      window.scrollTo({ top: 0 });
    },
    [flushPending, selectChapter, refreshCompletion]
  );

  const removeEntry = useCallback(
    async (code: string, repeatIndex: number) => {
      try {
        await profileSchemaApi.removeEntry(code, repeatIndex);
        await reload();
      } catch (err) {
        toast.error(toMessage(err, 'Failed to remove the entry'));
      }
    },
    [reload, toMessage]
  );

  const submit = useCallback(async () => {
    await flushPending();
    try {
      await profileSchemaApi.submitForReview();
      toast.success(t('profileBuilder.submitted', { defaultValue: 'Profile submitted for review.' }));
      await refreshCompletion();
    } catch (err) {
      toast.error(toMessage(err, 'Failed to submit for review'));
    }
  }, [flushPending, refreshCompletion, t, toMessage]);

  if (loading) {
    return (
      <div className="p-12 text-base text-[#6E6E73]">{t('common.loading', { defaultValue: 'Loading…' })}</div>
    );
  }

  if (loadError) {
    return (
      <div className="p-12">
        <p role="alert" className="text-base text-[#D70015]">
          {loadError}
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 min-h-11 px-4 py-2 border border-[#D2D2D7] rounded-lg text-base hover:bg-[#F5F5F7]"
        >
          {t('common.retry', { defaultValue: 'Try again' })}
        </button>
      </div>
    );
  }

  if (!chapter) {
    // The schema has not been seeded in this environment. Say so plainly rather
    // than rendering an empty page that looks like a bug in the builder.
    return (
      <div className="p-12 text-base text-[#6E6E73]">
        {t('profileBuilder.noSchema', {
          defaultValue: 'The profile questions have not been set up for this environment yet.',
        })}
      </div>
    );
  }

  const groups = groupsInChapter(chapter.fields);
  const plainFields = chapter.fields.filter((f) => !f.repeatableGroup);

  return (
    <div className="bg-white text-[#1D1D1F] min-h-screen flex flex-col">
      {/* Sticky top line: chapter name, overall progress, saved state. */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#D2D2D7]">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <p className="text-base font-medium truncate">{chapterTitle(chapter.code, chapter.title, t)}</p>
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
              <ProfileProgress completion={profile?.completion ?? []} />
            </div>
            <SavedState state={saveState} error={saveError} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <ProfileChapterNav
          chapters={chapters}
          completion={profile?.completion ?? []}
          active={chapter.code}
          onSelect={goTo}
        />

        <main className="flex-1 overflow-y-auto">
          {/* A single content column, 720-820px, with generous whitespace and no
              surrounding card — the boundary is not doing any work here. */}
          <div className="max-w-[780px] mx-auto px-6 py-10">
            <ProfileSectionHeader chapter={chapter} completion={completion} />

            <div className="divide-y divide-[#D2D2D7]">
              {plainFields.map((field) => (
                <ProfileFieldRenderer
                  key={field.code}
                  field={field}
                  value={valueFor(field.code, 0)}
                  onChange={(value) => setFieldValue(field.code, 0, value)}
                />
              ))}
            </div>

            {groups.map((group) => (
              <div key={group} className="mt-10">
                <RepeatableEntryList
                  group={group}
                  fields={fieldsInGroup(chapter.fields, group)}
                  valueFor={valueFor}
                  onChange={setFieldValue}
                  onRemoveEntry={(index) => removeEntry(fieldsInGroup(chapter.fields, group)[0].code, index)}
                />
              </div>
            ))}

            <nav className="flex items-center justify-between gap-4 mt-12 pt-6 border-t border-[#D2D2D7]">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => goTo(chapters[activeIndex - 1].code)}
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2 border border-[#D2D2D7] rounded-lg text-base hover:bg-[#F5F5F7] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t('common.back', { defaultValue: 'Back' })}
              </button>

              {activeIndex < chapters.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(chapters[activeIndex + 1].code)}
                  className="inline-flex items-center gap-2 min-h-11 px-5 py-2 bg-[#0066CC] hover:bg-[#0055AA] text-white rounded-lg text-base font-medium transition-colors"
                >
                  {t('common.continue', { defaultValue: 'Continue' })}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  className="inline-flex items-center gap-2 min-h-11 px-5 py-2 bg-[#0066CC] hover:bg-[#0055AA] text-white rounded-lg text-base font-medium transition-colors"
                >
                  {t('profileBuilder.submit', { defaultValue: 'Submit for review' })}
                </button>
              )}
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
