import type { ProfileField } from './profile.types';

/**
 * Client-side validation, mirroring what the server enforces.
 *
 * This copy exists to tell the candidate what is wrong next to the field, in
 * plain language. It is not the gate — the server validates independently,
 * because a browser can be bypassed.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const validateField = (
  field: ProfileField,
  value: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string | null => {
  const trimmed = (value ?? '').trim();

  if (field.required && !trimmed) {
    return t('profileBuilder.errorRequired', { defaultValue: 'This answer is needed to operate your profile.' });
  }
  if (!trimmed) return null;

  const format = field.validation?.format;

  if (format === 'email' && !EMAIL.test(trimmed)) {
    return t('profileBuilder.errorEmail', { defaultValue: 'Enter a valid email address.' });
  }

  if (format === 'url' || field.inputType === 'url') {
    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('scheme');
    } catch {
      return t('profileBuilder.errorUrl', {
        defaultValue: 'Enter a complete address beginning with http:// or https://',
      });
    }
  }

  // Matches the server's Joi bound. Stated rather than silently truncated: a
  // candidate who has written 20,000 characters should be told, not edited.
  if (trimmed.length > 20000) {
    return t('profileBuilder.errorTooLong', { defaultValue: 'This answer is too long to store. Please shorten it.' });
  }

  return null;
};

/**
 * Question wording, translated where a translation exists.
 *
 * The 231 catalogue questions are seeded into the database in English, because
 * the field codes — not the wording — are the stable contract. That left the
 * chrome translated while every actual question stayed English, which is half a
 * fix from the candidate's point of view.
 *
 * Keying off the field code lets a translation be supplied per question without
 * touching the schema, and the seeded English remains the fallback, so an
 * untranslated question still reads correctly rather than showing a key. The
 * same applies to chapter titles.
 */
export const fieldLabel = (
  code: string,
  fallback: string,
  t: (key: string, opts?: Record<string, unknown>) => string
) => t(`profileFields.${code}.label`, { defaultValue: fallback });

export const fieldHelp = (
  code: string,
  fallback: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string
) => (fallback ? t(`profileFields.${code}.help`, { defaultValue: fallback }) : null);

export const chapterTitle = (
  code: string,
  fallback: string,
  t: (key: string, opts?: Record<string, unknown>) => string
) => t(`profileChapters.${code}.title`, { defaultValue: fallback });

/** Fields belonging to one repeatable group, in catalogue order. */
export const fieldsInGroup = (fields: ProfileField[], group: string) =>
  fields.filter((f) => f.repeatableGroup === group).sort((a, b) => a.sortOrder - b.sortOrder);

/** The distinct repeatable groups present in a chapter, in first-appearance order. */
export const groupsInChapter = (fields: ProfileField[]): string[] => {
  const seen: string[] = [];
  for (const field of fields) {
    if (field.repeatableGroup && !seen.includes(field.repeatableGroup)) seen.push(field.repeatableGroup);
  }
  return seen;
};

/**
 * How many entries a repeatable group currently has, judged by the highest
 * repeatIndex that carries a value. Always at least one, so an untouched group
 * still shows a blank card to type into.
 */
export const entryCount = (fields: ProfileField[]): number => {
  let highest = 0;
  for (const field of fields) {
    for (const value of field.values ?? []) {
      if (value.value?.trim()) highest = Math.max(highest, value.repeatIndex);
    }
  }
  return highest + 1;
};
