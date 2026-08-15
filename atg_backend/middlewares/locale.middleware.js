const { SUPPORTED_LOCALES, DEFAULT_LOCALE } = require("../i18n/errorMessages");

// Resolves the language to answer in, from the standard Accept-Language header.
//
// The frontend sets this header from i18n.language on every request, so the API
// answers in whatever the user picked in the language selector rather than in
// English. Clients that send nothing — curl, webhooks, older frontend builds —
// get the default, which keeps every existing response byte-identical.

// "ta-LK;q=0.9" → { tag: "ta-lk", quality: 0.9 }. Malformed q values sort last
// rather than throwing: a header is attacker-controllable input, and the worst
// outcome of a weird one should be English, not a 500 on every request.
const parseEntry = (raw) => {
  const [tag, ...params] = raw.trim().split(";");
  const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
  const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
  return {
    tag: tag.trim().toLowerCase(),
    quality: Number.isFinite(quality) ? quality : 0,
  };
};

/**
 * Picks the best supported locale for an Accept-Language header value.
 *
 * Matches the base subtag, so "ta-LK", "ta-IN" and "ta" all resolve to "ta" —
 * the catalogue is per-language, not per-region. "*" is ignored rather than
 * treated as a match, since it means "anything" and English is already the
 * default. Exported for direct unit testing without an Express request.
 */
const resolveLocale = (headerValue) => {
  if (typeof headerValue !== "string" || !headerValue.trim()) return DEFAULT_LOCALE;

  const candidates = headerValue
    .split(",")
    .map(parseEntry)
    .filter((entry) => entry.quality > 0 && entry.tag && entry.tag !== "*")
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of candidates) {
    const base = tag.split("-")[0];
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
};

const localeMiddleware = (req, _res, next) => {
  req.locale = resolveLocale(req.headers["accept-language"]);
  next();
};

module.exports = localeMiddleware;
module.exports.resolveLocale = resolveLocale;
