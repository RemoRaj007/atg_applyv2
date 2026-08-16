import { useTranslation } from 'react-i18next';
import type { ChapterCompletion } from './profile.types';

/**
 * Overall progress across the 20 chapters.
 *
 * Counted in chapters completed rather than as a percentage of 231 questions:
 * most of those questions are optional, so a "12% complete" figure would read
 * as failure to a candidate who has answered everything that applies to them.
 */
export default function ProfileProgress({ completion }: { completion: ChapterCompletion[] }) {
  const { t } = useTranslation();

  const started = completion.filter((c) => c.status !== 'not_started').length;
  const total = completion.length || 1;
  const percent = Math.round((started / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 w-32 rounded-full bg-[#D2D2D7] overflow-hidden"
        role="progressbar"
        aria-valuenow={started}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t('profileBuilder.progressLabel', { defaultValue: 'Profile progress' })}
      >
        <div className="h-full bg-[#F05A28] transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm text-[#6E6E73] whitespace-nowrap">
        {t('profileBuilder.progressCount', {
          defaultValue: '{{started}} of {{total}} chapters started',
          started,
          total,
        })}
      </span>
    </div>
  );
}
