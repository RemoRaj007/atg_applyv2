// Longer than any error worth reading in a log line, short enough that a hostile
// upstream cannot flood the log table through PrismaLogTransport.
const MAX_LOGGED_LENGTH = 2000;

/**
 * Make untrusted text safe to put in a log message.
 *
 * Anything that reaches a logger from outside the process — an upstream API's
 * error body, a request field — can carry newlines, and a newline in a log
 * message lets the writer forge whatever line they like after it: a fake
 * "security: login succeeded" entry sitting in the audit trail as though the
 * app had written it. Carriage returns do the same to a console. Collapsing
 * them keeps one event on one line.
 *
 * This is for the message text only. Structured metadata that stays JSON never
 * gets parsed back out as log lines, but the value here is what ends up
 * rendered into them.
 */
const sanitizeForLog = (value) => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  // Control characters generally, not just CR/LF, and the Unicode line
  // separators a JSON body can carry: any of them can start a new line in a
  // log viewer, which is the whole trick.
  const collapsed = text.replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ");
  return collapsed.length > MAX_LOGGED_LENGTH
    ? `${collapsed.slice(0, MAX_LOGGED_LENGTH)}… [truncated]`
    : collapsed;
};

module.exports = { sanitizeForLog, MAX_LOGGED_LENGTH };
