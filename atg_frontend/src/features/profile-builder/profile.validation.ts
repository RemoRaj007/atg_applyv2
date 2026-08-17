import type { ProfileField } from '../../api/profileSchemaApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates one answer against the catalogue's validation column.
 *
 * A blank answer is never an error here: the catalogue's required questions are
 * enforced when a chapter is completed, not while the candidate is still typing
 * — the builder autosaves, so treating every empty field as invalid would show
 * errors on a chapter nobody has reached yet.
 */
export const validateField = (field: ProfileField, rawValue: string): string | null => {
  const value = (rawValue ?? '').trim();
  if (!value) return null;

  switch (field.validation?.format) {
    case 'email':
      return EMAIL.test(value) ? null : 'Enter a valid email address.';
    case 'url':
      try {
        const url = new URL(value);
        // A bare "example.com" parses as a URL with an unexpected protocol
        // rather than failing, so the protocol is checked explicitly.
        return url.protocol === 'http:' || url.protocol === 'https:'
          ? null
          : 'Enter a link starting with http:// or https://';
      } catch {
        return 'Enter a valid URL, including https://';
      }
    default:
      return null;
  }
};

/** Every validation error in a chapter, keyed by the answer's storage key. */
export const validateChapter = (
  fields: ProfileField[],
  valueFor: (field: ProfileField) => string[]
): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    valueFor(field).forEach((value, repeatIndex) => {
      const error = validateField(field, value);
      if (error) errors[`${field.code}#${repeatIndex}`] = error;
    });
  }
  return errors;
};

/** Required questions in a chapter that have no answer yet. */
export const missingRequired = (
  fields: ProfileField[],
  valueFor: (field: ProfileField) => string[]
): ProfileField[] =>
  fields.filter(field => field.isRequired && !valueFor(field).some(value => value && value.trim()));
