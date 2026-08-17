import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Check, CloudOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/AtgButton';
import BackButton from '../../components/ui/BackButton';
import type { ProfileField } from '../../api/profileSchemaApi';
import { useProfileCatalogue } from './useProfileCatalogue';
import { validateChapter, missingRequired } from './profile.validation';
import ProfileChapterNav from './ProfileChapterNav';
import ProfileChapterView from './ProfileChapter';

/**
 * The candidate profile: the 20 chapters of the ATG Apply question catalogue,
 * served from the database rather than hard-coded, so re-seeding the catalogue
 * changes the questions without a deploy.
 */
const ProfileBuilderPage: React.FC = () => {
  const {
    chapters,
    loading,
    loadError,
    saveState,
    setValue,
    saveNow,
    entriesFor,
    entryCounts,
    addEntry,
    removeEntry,
    progress,
    overallPercent,
  } = useProfileCatalogue();

  const [activeIndex, setActiveIndex] = useState(0);
  const chapter = chapters[activeIndex];

  const errors = useMemo(
    () => (chapter ? validateChapter(chapter.fields, entriesFor) : {}),
    [chapter, entriesFor]
  );

  // An autosave in flight when the tab closes would be lost, so the pending
  // batch is flushed on the way out.
  useEffect(() => {
    const handler = () => void saveNow();
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      void saveNow();
    };
  }, [saveNow]);

  const goTo = async (index: number) => {
    await saveNow();
    setActiveIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = async () => {
    if (chapter) {
      const missing = missingRequired(chapter.fields, entriesFor);
      // Required questions block moving on, but only within the chapter the
      // candidate is actually on — the rest of the catalogue stays reachable.
      if (missing.length > 0) {
        toast.error(`Answer the required question${missing.length > 1 ? 's' : ''} before continuing.`);
        return;
      }
      if (Object.keys(errors).length > 0) {
        toast.error('Fix the highlighted answers before continuing.');
        return;
      }
    }
    await goTo(Math.min(activeIndex + 1, chapters.length - 1));
  };

  if (loading) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin mr-3" aria-hidden="true" />
        Loading your profile questions…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" aria-hidden="true" />
          <p className="text-slate-300">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen w-full flex flex-col text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-6 lg:px-8 py-5 flex flex-wrap gap-4 justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-5">
          <BackButton label="Back to Dashboard" to="/candidate" />
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-white">Candidate Profile Creator</h1>
            <p className="text-sm text-slate-400 mt-1">
              {chapters.length} chapters. Your answers save as you type.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div aria-live="polite" className="text-xs font-semibold min-w-[7rem] text-right">
            {saveState === 'saving' && (
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="text-emerald-400 inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-rose-400 inline-flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5" aria-hidden="true" /> Not saved
              </span>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Profile Strength
            </p>
            <div
              className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={overallPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
            >
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          <Button
            onClick={async () => {
              await saveNow();
              toast.success('Progress saved');
            }}
            variant="primary"
            className="bg-blue-600 hover:bg-blue-500 shadow-sm"
          >
            Save Progress
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 bg-slate-900 border-r border-slate-800 hidden md:block overflow-y-auto">
          <ProfileChapterNav
            chapters={chapters}
            activeIndex={activeIndex}
            progress={progress}
            onSelect={index => void goTo(index)}
          />
        </aside>

        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-10">
          <div className="max-w-3xl mx-auto">
            {chapter && (
              <>
                <div className="mb-8">
                  <p className="text-xs font-mono text-slate-500 mb-1">
                    Chapter {chapter.code} of {chapters[chapters.length - 1]?.code}
                  </p>
                  <h2 className="text-2xl font-bold text-white">{chapter.title}</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {chapter.fields.length} question{chapter.fields.length === 1 ? '' : 's'}. Only
                    questions marked with an asterisk are required.
                  </p>
                </div>

                {/* Mobile chapter picker — the sidebar is hidden below md. */}
                <div className="md:hidden mb-6">
                  <label htmlFor="chapter-select" className="sr-only">
                    Choose a chapter
                  </label>
                  <select
                    id="chapter-select"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100"
                    value={activeIndex}
                    onChange={event => void goTo(Number(event.target.value))}
                  >
                    {chapters.map((item, index) => (
                      <option key={item.code} value={index}>
                        {item.code} — {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <ProfileChapterView
                  chapter={chapter}
                  entriesFor={entriesFor}
                  entryCounts={entryCounts}
                  errors={errors}
                  onChange={(field: ProfileField, repeatIndex, value) =>
                    setValue(field, repeatIndex, value)
                  }
                  onAddEntry={addEntry}
                  onRemoveEntry={(group, repeatIndex) =>
                    void removeEntry(group, chapter.fields, repeatIndex)
                  }
                />

                <div className="flex justify-between items-center gap-4 mt-10 pt-6 border-t border-slate-800">
                  <Button
                    onClick={() => void goTo(Math.max(activeIndex - 1, 0))}
                    variant="outline"
                    disabled={activeIndex === 0}
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1 inline" aria-hidden="true" /> Previous
                  </Button>
                  <Button
                    onClick={() => void handleNext()}
                    variant="primary"
                    disabled={activeIndex === chapters.length - 1}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1 inline" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileBuilderPage;
