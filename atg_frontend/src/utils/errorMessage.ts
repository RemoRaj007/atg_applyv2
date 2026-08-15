import type { TFunction } from 'i18next';

/**
 * Turns a thrown API error into a sentence in the user's selected language.
 *
 * The problem: apiClient copies the server's `message` onto `error.message`, and
 * ~50 components render that string directly. The API wrote it in English, so
 * selecting தமிழ் translated the page around the error but never the error
 * itself — "The database is missing a column this API expects" arrived in
 * English no matter what.
 *
 * Three sources, in order of how much we trust them:
 *
 *  1. `apiErrorCode` — the API's stable identifier, set by applyServerMessage.
 *     Preferred, because it survives rewording of the English sentence.
 *  2. LEGACY_MESSAGE_MAP — exact English text, for responses with no code. The
 *     backend and frontend deploy separately, so a new frontend will talk to an
 *     older API for as long as that rollout takes, and browsers cache bundles
 *     well beyond it. Matching the sentence covers that window.
 *  3. `error.message` — whatever we already had. Untranslated, but true and
 *     specific, which beats a generic translated line that says less.
 *
 * It never returns a raw key: a user shown "errors.DB_SCHEMA_MISSING_COLUMN" is
 * worse off than one shown an English sentence.
 */

// English sentences the API has sent from before it carried codes. Keys are the
// message text; values are the i18n key under the `errors` namespace.
const LEGACY_MESSAGE_MAP: Record<string, string> = {
  'The database is missing a table this API expects. A migration has not been applied to this environment.':
    'errors.DB_SCHEMA_MISSING_TABLE',
  'The database is missing a column this API expects. A migration has not been applied to this environment.':
    'errors.DB_SCHEMA_MISSING_COLUMN',
  'Internal server error': 'errors.INTERNAL',
};

// Messages apiClient itself generates for transport failures, which never reach
// the server and so can never carry a code.
const CLIENT_MESSAGE_MAP: Record<string, string> = {
  'The server took too long to respond. Please try again.': 'errors.TIMEOUT',
  'Could not reach the server. Check your connection and try again.': 'errors.NETWORK',
};

// A 500 response appends "(ref: <uuid>)" to the message so the user has
// something traceable to quote. That suffix has to come off before matching the
// sentence, then go back on after translating it.
const REF_SUFFIX = /\s*\(ref: [^)]+\)\s*$/;

const splitRef = (message: string): { text: string; ref: string } => {
  const match = message.match(REF_SUFFIX);
  return match ? { text: message.replace(REF_SUFFIX, ''), ref: match[0].trimEnd() } : { text: message, ref: '' };
};

export const resolveErrorMessage = (error: unknown, t: TFunction, fallback?: string): string => {
  const err = error as { apiErrorCode?: string; message?: string } | null | undefined;
  const rawMessage = typeof err?.message === 'string' && err.message.trim() ? err.message : '';
  const { text, ref } = splitRef(rawMessage);

  const withRef = (sentence: string) => (ref ? `${sentence} ${ref}` : sentence);

  const code = err?.apiErrorCode;
  if (code) {
    const key = `errors.${code}`;
    // defaultValue keeps an unrecognised code (a newer API than this bundle
    // knows about) rendering the server's own sentence rather than the key.
    const translated = t(key, { defaultValue: text || fallback || '' });
    if (translated) return withRef(translated);
  }

  const legacyKey = LEGACY_MESSAGE_MAP[text] ?? CLIENT_MESSAGE_MAP[text];
  if (legacyKey) return withRef(t(legacyKey, { defaultValue: text }));

  if (text) return withRef(text);
  return fallback ?? t('errors.UNKNOWN', { defaultValue: 'An unexpected error occurred.' });
};
