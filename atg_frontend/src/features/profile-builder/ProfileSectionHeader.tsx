import { useTranslation } from 'react-i18next';
import type { ChapterCompletion, ProfileChapter } from './profile.types';
import { chapterTitle } from './profile.validation';

/**
 * One section heading and a short explanation.
 *
 * Deliberately no rotating motivational quote panel: the brief rules it out,
 * and copy that changes while someone is typing is a distraction rather than
 * encouragement.
 */
export default function ProfileSectionHeader({
  chapter,
  completion,
}: {
  chapter: ProfileChapter;
  completion?: ChapterCompletion;
}) {
  const { t } = useTranslation();

  return (
    <header className="pb-6 border-b border-[#D2D2D7]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F05A28]">
        {t('profileBuilder.chapterNumber', {
          defaultValue: 'Chapter {{code}}',
          code: chapter.code,
        })}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1D1D1F]">
        {chapterTitle(chapter.code, chapter.title, t)}
      </h2>

      {chapter.description && (
        <p className="mt-3 text-base text-[#6E6E73] leading-relaxed">
          {t(`profileChapters.${chapter.code}.description`, { defaultValue: chapter.description })}
        </p>
      )}

      {completion && completion.requiredMissing.length > 0 && (
        <p className="mt-4 text-sm text-[#D70015]">
          {t('profileBuilder.requiredMissing', {
            defaultValue: 'Still needed here: {{fields}}',
            fields: completion.requiredMissing.join(', '),
          })}
        </p>
      )}

      {/* Most questions are optional and a chapter can be skipped — saying so
          up front is what stops a long profile reading as an obligation. */}
      <p className="mt-4 text-sm text-[#6E6E73]">
        {t('profileBuilder.optionalNote', {
          defaultValue: 'Most questions here are optional. Skip anything that does not apply and come back later.',
        })}
      </p>
    </header>
  );
}
