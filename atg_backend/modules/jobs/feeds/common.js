const { htmlToText } = require("../../../utils/htmlToText");

// Shared by every feed adapter. Each adapter turns its provider's postings into
// the same shape jobImport.service's mapPosting produces, so the write path —
// dedupe on (externalSource, externalId), operator decisions preserved — is one
// piece of code for every source.

const FETCH_TIMEOUT_MS = Number(process.env.JOB_FEED_TIMEOUT_MS) || 15000;
// A feed response is untrusted input: a misbehaving or hostile endpoint must
// not be able to hand us an unbounded body.
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_DESCRIPTION = 20000;

const USER_AGENT = "ATG-Apply-JobSync/1.0 (+https://atgapply.atgconcordia.com)";

const clip = (value, max) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
};

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  // Unix seconds (Arbeitnow) or anything Date understands (ISO strings).
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Only http(s) links are stored. The URL is rendered as a link to candidates,
// so a `javascript:` or `data:` URL from a feed would be a stored XSS.
const safeUrl = (value) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const fetchJson = async (url, { method = "GET", headers = {}, body } = {}) => {
  const res = await fetch(url, {
    method,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    ...(body === undefined ? {} : { body }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    // Status only: the body can echo our query, key included.
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) throw new Error("response too large");
  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("response too large");
  return JSON.parse(text);
};

/** The fields every adapter fills the same way. */
const base = ({ source, externalId, title, company, location, locationType, description, jobUrl, isRemote, datePosted, salaryMin, salaryMax, salaryCurrency, salaryInterval, experience }) => ({
  title: clip(title, 255),
  company: clip(company, 255) || "Unknown",
  location: clip(location, 255),
  locationType: locationType || (isRemote ? "Remote" : location ? "Onsite" : null),
  description: clip(htmlToText(description) ?? "", MAX_DESCRIPTION),
  jobUrl: safeUrl(jobUrl),
  experience: clip(experience, 255),
  externalSource: source,
  externalId: externalId === null || externalId === undefined || externalId === "" ? null : String(externalId),
  isRemote: Boolean(isRemote),
  datePosted: datePosted ?? null,
  salaryMin: salaryMin ?? null,
  salaryMax: salaryMax ?? null,
  salaryCurrency: salaryMin || salaryMax ? salaryCurrency || null : null,
  salaryInterval: salaryMin || salaryMax ? salaryInterval || null : null,
  source,
  // Never `approved`: nothing from a public feed reaches candidates before an
  // operator has looked at it.
  status: "pending",
});

const list = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

module.exports = { base, clip, toDate, toAmount, safeUrl, fetchJson, list, USER_AGENT };
