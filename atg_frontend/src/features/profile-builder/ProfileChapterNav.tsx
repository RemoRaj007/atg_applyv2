import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ProfileChapter } from '../../api/profileSchemaApi';

interface Props {
  chapters: ProfileChapter[];
  activeIndex: number;
  progress: Record<string, { answered: number; total: number; complete: boolean }>;
  onSelect: (index: number) => void;
}

/**
 * The 20 chapters of the catalogue. Long enough that it scrolls, so the chapter
 * number stays visible as an anchor while moving through it.
 */
const ProfileChapterNav: React.FC<Props> = ({ chapters, activeIndex, progress, onSelect }) => (
  <nav aria-label="Profile chapters" className="p-4">
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
      Chapters
    </h3>
    <ul className="space-y-1">
      {chapters.map((chapter, index) => {
        const isActive = index === activeIndex;
        const chapterProgress = progress[chapter.code];
        const complete = chapterProgress?.complete ?? false;
        const Icon = complete ? CheckCircle2 : Circle;

        return (
          <li key={chapter.code}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isActive ? 'step' : undefined}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm font-semibold cursor-pointer border ${
                isActive
                  ? 'bg-blue-950/80 text-blue-200 border-blue-800/60 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  complete ? 'text-emerald-400' : isActive ? 'text-blue-400' : 'text-slate-600'
                }`}
                aria-hidden="true"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-mono text-slate-500 mb-0.5">
                  {chapter.code}
                </span>
                <span className="block leading-snug">{chapter.title}</span>
                {chapterProgress && chapterProgress.total > 0 && (
                  <span className="block text-[10px] font-normal text-slate-500 mt-1">
                    {chapterProgress.answered} of {chapterProgress.total} answered
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);

export default ProfileChapterNav;
