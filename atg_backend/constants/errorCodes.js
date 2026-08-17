// Stable, machine-readable identifiers for the failures a client may want to
// present differently from the raw English sentence the API happens to send.
//
// The problem these solve: the response body carried only `message`, an English
// string written for a developer reading logs. The frontend renders it verbatim,
// so a candidate who has selected தமிழ் still reads "The database is missing a
// column this API expects" in English. Translating on the client needs something
// stable to key off, and the message text is not it — rewording a sentence for
// clarity would silently break every translation keyed to the old wording.
//
// So the code is the contract and the message is prose. The English message
// stays exactly as it was: it remains the fallback for any client that does not
// recognise a code, including older deployed frontends.

const ERROR_CODES = Object.freeze({
  // Schema drift. These mean a migration was never applied to this environment,
  // not that the request was wrong — see PRISMA_CODE_MAP below.
  DB_SCHEMA_MISSING_TABLE: "DB_SCHEMA_MISSING_TABLE",
  DB_SCHEMA_MISSING_COLUMN: "DB_SCHEMA_MISSING_COLUMN",

  // Generic fallback for any 500 without a more specific cause.
  INTERNAL: "INTERNAL",

  // Common 4xx paths. Thrown deliberately by ApiError helpers, so they are
  // already phrased for the caller; the code only makes them translatable.
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT_DUPLICATE: "CONFLICT_DUPLICATE",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
});

// Prisma's own codes, mapped to ours. P2021/P2022 are the two worth naming:
// every query touching the drifted model fails, so a single unapplied migration
// reads as "the whole feature is 500ing" with nothing saying why.
const PRISMA_CODE_MAP = Object.freeze({
  P2021: ERROR_CODES.DB_SCHEMA_MISSING_TABLE,
  P2022: ERROR_CODES.DB_SCHEMA_MISSING_COLUMN,
});

// The English text for each code. This is the same wording the API sent before
// error codes existed, kept byte-identical on purpose: it is what a client
// without translations falls back to, and what the existing tests assert.
const ENGLISH_MESSAGES = Object.freeze({
  [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
    "The database is missing a table this API expects. A migration has not been applied to this environment.",
  [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
    "The database is missing a column this API expects. A migration has not been applied to this environment.",
  [ERROR_CODES.INTERNAL]: "Internal server error",
});

/**
 * Resolves the code for a thrown error.
 *
 * Precedence: an explicit `errorCode` set at the throw site wins, then Prisma's
 * own code, then INTERNAL for any remaining 5xx.
 *
 * A 4xx gets no code unless its throw site asked for one, and this is the
 * important part: deriving a code from the status alone would replace every
 * specific message with a generic translation of the status. "Job not found"
 * would reach the user as "The requested item could not be found." — correct in
 * every language and useless in all of them. Specificity beats translation when
 * the two conflict, so a 4xx keeps whatever the throw site wrote, and becomes
 * translatable one throw site at a time by adding `errorCode` there.
 */
const resolveErrorCode = (err, statusCode) => {
  if (err?.errorCode) return err.errorCode;
  if (err?.code && PRISMA_CODE_MAP[err.code]) return PRISMA_CODE_MAP[err.code];
  if (statusCode >= 500) return ERROR_CODES.INTERNAL;
  return null;
};

module.exports = {
  ERROR_CODES,
  PRISMA_CODE_MAP,
  ENGLISH_MESSAGES,
  resolveErrorCode,
};
