const crypto = require("crypto");
const { systemLogger } = require("../config/atg_logger");
const { ENGLISH_MESSAGES, PRISMA_CODE_MAP, resolveErrorCode } = require("../constants/errorCodes");
const { translateErrorCode, DEFAULT_LOCALE } = require("../i18n/errorMessages");

// Prisma's own error codes, for the failures that are worth naming rather than
// flattening into "Internal server error".
//
// P2021/P2022 are the ones that matter operationally: they mean the database is
// missing a table or a column the client expects — a migration that was never
// applied to this environment. Every query touching that model then fails, so a
// single unapplied migration reads as "the whole feature is 500ing", with
// nothing in the response to say why. The code names the drift without quoting
// the query, the connection string, or any row data.
//
// The wording now lives in constants/errorCodes.js so the response can also
// carry a stable `code` and be translated; this map is derived from it rather
// than duplicating the sentences, which would drift.
const PRISMA_MESSAGES = Object.fromEntries(
  Object.entries(PRISMA_CODE_MAP).map(([prismaCode, ourCode]) => [prismaCode, ENGLISH_MESSAGES[ourCode]])
);

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Correlates what the caller sees with the log line holding the stack. A 500
  // body is deliberately opaque, which left "I get a 500" and the logs with no
  // way to be matched up — especially on Vercel, where the logs cover every
  // request the deployment served.
  const errorId = crypto.randomUUID();

  if (statusCode >= 500) {
    systemLogger.error(message, {
      errorId,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      statusCode,
      prismaCode: err.code,
      stack: err.stack,
    });
  } else {
    systemLogger.warn(message, {
      errorId,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      statusCode,
    });
  }

  // 4xx messages are written for the caller and safe to return. A 500 message is
  // whatever the failing library said — Prisma, for instance, quotes the failing
  // query and the host it could not reach — so it is replaced with a generic
  // line outside development. The full detail is still in the logs above.
  const isClientError = statusCode < 500;
  const isDevelopment = process.env.NODE_ENV === "development";
  const namedCause = PRISMA_MESSAGES[err.code];

  const englishMessage = isClientError || isDevelopment ? message : namedCause || "Internal server error";

  // A stable identifier for the failure, so a client can show its own translated
  // sentence instead of rendering the English above verbatim — which is what
  // reached users who had selected another language.
  const code = resolveErrorCode(err, statusCode);

  // Answer in the language the caller asked for. `req.locale` is set by
  // locale.middleware; if that middleware is not mounted (unit tests
  // constructing a bare req, for instance) this falls back to English.
  //
  // English is deliberately taken from the throw site rather than from the
  // catalogue, even when a code is attached. The throw site is where the
  // wording was chosen, sometimes for reasons that matter: the login failure
  // says "Invalid email or password" identically for an unknown address and a
  // wrong password, and swapping in a catalogue sentence would quietly rewrite
  // a message whose exact form is a security property. Attaching a code must
  // add a translation, never change the English.
  const locale = req.locale || DEFAULT_LOCALE;
  const localizedMessage =
    locale === DEFAULT_LOCALE ? englishMessage : translateErrorCode(code, locale, englishMessage);

  const body = {
    status: false,
    message: localizedMessage,
    // Always the English text, regardless of locale. Support tickets, logs and
    // bug reports quote this field, and a sentence in a language the on-call
    // engineer cannot read is not a useful thing to paste into a search.
    messageEn: englishMessage,
    code: code || undefined,
    error: isDevelopment ? err.stack : undefined,
  };

  // Only on 500s: a 4xx is already self-explanatory, and an id on every
  // validation error is noise.
  if (!isClientError) body.errorId = errorId;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
