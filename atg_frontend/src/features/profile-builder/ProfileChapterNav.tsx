import { useTranslation } from 'react-i18next';
import type { ChapterCompletion, ChapterStatus, ProfileChapter } from './profile.types';
import { chapterTitle } from './profile.validation';

interface Props {
  chapters: ProfileChapter[];
  completion: ChapterCompletion[];
  active: string;
  onSelect: (code: string) => void;
}

// Complete / In progress / Not started / Needs review must be distinguishable
// without relying on colour alone, so each carries a word as well as a dot.
const STATUS_DOT: Record<ChapterStatus, string> = {
  complete: 'bg-[#248A3D]',
  in_progress: 'bg-[#F05A28]',
  needs_review: 'bg-[#D70015]',
  not_started: 'bg-[#D2D2D7]',
};

const STATUS_KEY: Record<ChapterStatus, { key: string; fallback: string }> = {
  complete: { key: 'profileBuilder.statusComplete', fallback: 'Complete' },
  in_progress: { key: 'profileBuilder.statusInProgress', fallback: 'In progress' },
  needs_review: { key: 'profileBuilder.statusNeedsReview', fallback: 'Needs review' },
  not_started: { key: 'profileBuilder.statusNotStarted', fallback: 'Not started' },
};

/**
 * The 280px chapter navigator, with 16px labels and 44px rows.
 *
 * On mobile the same list becomes a `<select>` — the brief asks for a large
 * chapter selector rather than a persistent sidebar at that width.
 */
export default function ProfileChapterNav({ chapters, completion, active, onSelect }: Props) {
  const { t } = useTranslation();
  const statusOf = (code: string): ChapterStatus =>
    completion.find((c) => c.code === code)?.status ?? 'not_started';

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden px-6 py-4 border-b border-[#D2D2D7]">
        <label htmlFor="chapter-select" className="block text-sm font-medium text-[#1D1D1F] mb-2">
          {t('profileBuilder.chapterLabel', { defaultValue: 'Chapter' })}
        </label>
        <select
          id="chapter-select"
          value={active}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full min-h-11 px-4 py-3 border border-[#D2D2D7] rounded-lg bg-white text-base text-[#1D1D1F]"
        >
          {chapters.map((chapter) => (
            <option key={chapter.code} value={chapter.code}>
              {chapter.code} · {chapterTitle(chapter.code, chapter.title, t)}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop */}
      <nav
        aria-label={t('profileBuilder.navLabel', { defaultValue: 'Profile chapters' })}
        className="hidden lg:block w-[280px] flex-shrink-0 border-r border-[#D2D2D7] overflow-y-auto"
      >
        <ul className="py-4">
          {chapters.map((chapter) => {
            const status = statusOf(chapter.code);
            const isActive = chapter.code === active;
            return (
              <li key={chapter.code}>
                <button
                  type="button"
                  onClick={() => onSelect(chapter.code)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`w-full text-left flex items-start gap-3 min-h-11 px-5 py-3 text-base transition-colors ${
                    isActive
                      ? 'bg-[#F5F5F7] font-semibold border-l-4 border-[#F05A28] pl-4'
                      : 'hover:bg-[#F5F5F7] border-l-4 border-transparent'
                  }`}
                >
                  <span
                    className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[#1D1D1F] leading-snug">{chapterTitle(chapter.code, chapter.title, t)}</span>
                    <span className="block text-xs text-[#6E6E73] mt-0.5">
                      {t(STATUS_KEY[status].key, { defaultValue: STATUS_KEY[status].fallback })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
