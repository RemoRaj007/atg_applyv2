import { useCallback, useEffect, useRef, useState } from 'react';
import { profileSchemaApi } from '../../../api/profileSchemaApi';
import type { ProfileResponse, SaveState } from '../profile.types';

const AUTOSAVE_DELAY_MS = 800;

/** Key under which the current chapter is remembered across a refresh. */
const CHAPTER_KEY = 'atg_profile_chapter';

const draftKey = (code: string, repeatIndex: number) => `${code}#${repeatIndex}`;

/**
 * Holds the profile, the in-flight edits, and the autosave loop.
 *
 * Autosave is debounced per field rather than per keystroke-batch: typing in
 * one box must not cancel the pending save of another, which is what a single
 * shared timer would do. Each field gets its own timer, so leaving a field
 * mid-sentence to edit a different one still saves both.
 */
export const useProfileDraft = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local edits, so a keystroke shows immediately without waiting for the server.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlight = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setProfile(await profileSchemaApi.me());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Clear pending timers on unmount so a save cannot fire into a dead component.
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    []
  );

  const flush = useCallback(async (code: string, repeatIndex: number, value: string) => {
    inFlight.current += 1;
    setSaveState('saving');
    try {
      await profileSchemaApi.patchFields([{ code, repeatIndex, value }]);
      setSaveError(null);
      inFlight.current -= 1;
      // Only claim "Saved" once nothing else is still in the air, otherwise a
      // fast typist sees Saved flash while later edits are still unsent.
      if (inFlight.current === 0) setSaveState('saved');
    } catch (err) {
      inFlight.current -= 1;
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaveState('error');
    }
  }, []);

  const setFieldValue = useCallback(
    (code: string, repeatIndex: number, value: string) => {
      const key = draftKey(code, repeatIndex);
      setDrafts((prev) => ({ ...prev, [key]: value }));

      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        delete timers.current[key];
        flush(code, repeatIndex, value);
      }, AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  /** Saves anything still waiting on its debounce — used when leaving a chapter. */
  const flushPending = useCallback(async () => {
    const pending = Object.keys(timers.current);
    if (!pending.length) return;
    for (const key of pending) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
      const [code, index] = key.split('#');
      await flush(code, Number(index), drafts[key] ?? '');
    }
  }, [drafts, flush]);

  /** Server value unless the user has typed something newer. */
  const valueFor = useCallback(
    (code: string, repeatIndex: number): string => {
      const key = draftKey(code, repeatIndex);
      if (key in drafts) return drafts[key];
      const field = profile?.chapters.flatMap((c) => c.fields).find((f) => f.code === code);
      return field?.values?.find((v) => v.repeatIndex === repeatIndex)?.value ?? '';
    },
    [drafts, profile]
  );

  /** Re-reads the profile so server-computed completion reflects the edits. */
  const refreshCompletion = useCallback(async () => {
    try {
      const next = await profileSchemaApi.me();
      setProfile(next);
      // Drop drafts the server has now confirmed, so valueFor stops shadowing.
      setDrafts({});
    } catch {
      // A failed refresh is not worth interrupting the user for: the values are
      // saved, only the progress figures are briefly stale.
    }
  }, []);

  return {
    profile,
    loading,
    loadError,
    saveState,
    saveError,
    setFieldValue,
    valueFor,
    flushPending,
    refreshCompletion,
    reload: load,
  };
};

/**
 * Remembers which chapter the candidate was in, so a refresh returns them to
 * where they were rather than to chapter 00 — the brief asks for the exact
 * chapter and saved state to be restored.
 */
export const useRememberedChapter = (fallback: string) => {
  const [chapter, setChapter] = useState<string>(() => {
    try {
      return localStorage.getItem(CHAPTER_KEY) || fallback;
    } catch {
      return fallback;
    }
  });

  const select = useCallback((code: string) => {
    setChapter(code);
    try {
      localStorage.setItem(CHAPTER_KEY, code);
    } catch {
      // Private browsing with storage disabled: losing the bookmark is fine,
      // failing to change chapter is not.
    }
  }, []);

  return [chapter, select] as const;
};
