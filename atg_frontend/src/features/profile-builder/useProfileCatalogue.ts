import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  profileSchemaApi,
  type ProfileChapter,
  type ProfileField,
  type ProfileValuePatch,
  type ProfileValues,
} from '../../api/profileSchemaApi';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Answers are held flat, keyed "CODE#entry", so a repeatable entry is addressable. */
const keyOf = (code: string, repeatIndex = 0) => `${code}#${repeatIndex}`;

const flatten = (values: ProfileValues): Record<string, string> => {
  const flat: Record<string, string> = {};
  for (const [code, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry != null) flat[keyOf(code, index)] = entry;
      });
    } else if (value != null) {
      flat[keyOf(code)] = value;
    }
  }
  return flat;
};

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Loads the 20-chapter catalogue and the candidate's answers, and autosaves
 * edits. Saves are patches of the changed codes only — never a full-profile
 * write — so two chapters edited in different tabs cannot clobber each other.
 */
export const useProfileCatalogue = () => {
  const [chapters, setChapters] = useState<ProfileChapter[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  /** Entry counts for repeatable groups, so "Add education" can grow a group. */
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});

  const pending = useRef<Map<string, ProfileValuePatch>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [schema, saved] = await Promise.all([
          profileSchemaApi.getSchema(),
          profileSchemaApi.getValues(),
        ]);
        if (cancelled) return;

        setChapters(schema.sections);
        setValues(flatten(saved.values));

        // A group shows as many entries as the candidate has already answered,
        // and at least one empty card to start from.
        const counts: Record<string, number> = {};
        for (const chapter of schema.sections) {
          for (const field of chapter.fields) {
            if (!field.repeatableGroup) continue;
            const answer = saved.values[field.code];
            const filled = Array.isArray(answer) ? answer.length : answer ? 1 : 0;
            counts[field.repeatableGroup] = Math.max(counts[field.repeatableGroup] ?? 1, filled || 1);
          }
        }
        setEntryCounts(counts);
      } catch {
        if (!cancelled) setLoadError('Your profile questions could not be loaded. Please refresh to try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    if (pending.current.size === 0) return;
    const batch = [...pending.current.values()];
    pending.current.clear();

    setSaveState('saving');
    try {
      await profileSchemaApi.saveValues(batch);
      if (mounted.current) setSaveState('saved');
    } catch {
      if (mounted.current) setSaveState('error');
      // Re-queue so the next edit retries this answer rather than dropping it.
      for (const item of batch) {
        if (!pending.current.has(keyOf(item.code, item.repeatIndex))) {
          pending.current.set(keyOf(item.code, item.repeatIndex), item);
        }
      }
      toast.error('Could not save your latest answer. It will be retried.');
    }
  }, []);

  const setValue = useCallback(
    (field: ProfileField, repeatIndex: number, value: string) => {
      const key = keyOf(field.code, repeatIndex);
      setValues(prev => ({ ...prev, [key]: value }));
      pending.current.set(key, { code: field.code, value, repeatIndex });

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  /** Saves immediately — used when leaving a chapter or the page. */
  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
  }, [flush]);

  const valueFor = useCallback(
    (field: ProfileField, repeatIndex = 0) => values[keyOf(field.code, repeatIndex)] ?? '',
    [values]
  );

  /** Every entry of a field, as an array — length 1 for ordinary questions. */
  const entriesFor = useCallback(
    (field: ProfileField): string[] => {
      const count = field.repeatableGroup ? (entryCounts[field.repeatableGroup] ?? 1) : 1;
      return Array.from({ length: count }, (_, index) => valueFor(field, index));
    },
    [entryCounts, valueFor]
  );

  const addEntry = useCallback((group: string) => {
    setEntryCounts(prev => ({ ...prev, [group]: (prev[group] ?? 1) + 1 }));
  }, []);

  const removeEntry = useCallback(
    async (group: string, fields: ProfileField[], repeatIndex: number) => {
      const groupFields = fields.filter(field => field.repeatableGroup === group);
      const count = entryCounts[group] ?? 1;

      // Entries are positional, so removing one from the middle shifts every
      // later entry down rather than leaving a hole the API would read as an
      // empty card forever.
      const patches: ProfileValuePatch[] = [];
      setValues(prev => {
        const next = { ...prev };
        for (const field of groupFields) {
          for (let index = repeatIndex; index < count - 1; index += 1) {
            const moved = next[keyOf(field.code, index + 1)] ?? '';
            next[keyOf(field.code, index)] = moved;
            patches.push({ code: field.code, value: moved, repeatIndex: index });
          }
          delete next[keyOf(field.code, count - 1)];
          patches.push({ code: field.code, value: '', repeatIndex: count - 1 });
        }
        return next;
      });

      setEntryCounts(prev => ({ ...prev, [group]: Math.max(1, (prev[group] ?? 1) - 1) }));

      if (patches.length > 0) {
        setSaveState('saving');
        try {
          await profileSchemaApi.saveValues(patches);
          if (mounted.current) setSaveState('saved');
        } catch {
          if (mounted.current) setSaveState('error');
          toast.error('Could not remove that entry.');
        }
      }
    },
    [entryCounts]
  );

  /** Per-chapter completion, computed client-side so it updates as you type. */
  const progress = useMemo(() => {
    const map: Record<string, { answered: number; total: number; complete: boolean }> = {};
    for (const chapter of chapters) {
      const answered = chapter.fields.filter(field =>
        entriesFor(field).some(entry => entry && entry.trim())
      ).length;
      const required = chapter.fields.filter(field => field.isRequired);
      const requiredAnswered = required.filter(field =>
        entriesFor(field).some(entry => entry && entry.trim())
      ).length;
      map[chapter.code] = {
        answered,
        total: chapter.fields.length,
        complete: required.length > 0 ? requiredAnswered === required.length : answered > 0,
      };
    }
    return map;
  }, [chapters, entriesFor]);

  const overallPercent = useMemo(() => {
    const total = chapters.reduce((sum, chapter) => sum + chapter.fields.length, 0);
    if (total === 0) return 0;
    const answered = Object.values(progress).reduce((sum, chapter) => sum + chapter.answered, 0);
    return Math.round((answered / total) * 100);
  }, [chapters, progress]);

  return {
    chapters,
    loading,
    loadError,
    saveState,
    setValue,
    saveNow,
    valueFor,
    entriesFor,
    entryCounts,
    addEntry,
    removeEntry,
    progress,
    overallPercent,
  };
};
