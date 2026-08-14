/**
 * Reads one cookie off the raw `Cookie` header.
 *
 * This exists so `cookie-parser` does not have to be mounted at all. Exactly one
 * handler in this codebase reads a cookie — POST /auth/refresh, for the refresh
 * token — and everything else authenticates with a Bearer header. Running a
 * cookie-parsing middleware in front of every request to serve that one handler
 * was both wasted work and misleading: it made every mutating route look
 * cookie-authenticated, which is what js/missing-token-validation reports.
 *
 * Signed cookies are not supported here because none are used; the refresh
 * cookie's integrity comes from the JWT signature inside it, not from the
 * cookie layer.
 */
const readCookie = (req, name) => {
  const header = req?.headers?.cookie;
  if (typeof header !== "string" || header === "") return undefined;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;

    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      // A malformed percent-escape is not worth a 500 — the caller treats a
      // missing cookie as "no session", which is the right answer here too.
      return raw;
    }
  }

  return undefined;
};

module.exports = readCookie;
