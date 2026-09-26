const { base, toDate, fetchJson, list } = require("./common");

// Jooble — official API, free key from jooble.org/api/about. An aggregator that
// indexes Sri Lankan job sites, which is why it is the Sri Lanka source here:
// topjobs.lk and XpressJobs publish no API, and scraping them would breach
// their terms.
//
// The key goes in the URL path (Jooble's design), so it must never be logged:
// fetchJson reports HTTP status only, never the URL or body.

const DEFAULT_LOCATIONS = "Sri Lanka";
const MAX_CALLS = Number(process.env.JOOBLE_MAX_CALLS) || 10;

const config = () => ({
  key: process.env.JOOBLE_API_KEY?.trim(),
  // Jooble serves country portals from different hosts; override if the key was
  // issued for a specific one.
  host: (process.env.JOOBLE_API_HOST?.trim() || "jooble.org").replace(/^https?:\/\//, "").replace(/\/+$/, ""),
  locations: list(process.env.JOOBLE_LOCATIONS || DEFAULT_LOCATIONS),
});

const isConfigured = () => Boolean(config().key);

const map = (job) =>
  base({
    source: "jooble",
    externalId: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.snippet,
    jobUrl: job.link,
    isRemote: /\bremote\b|work from home/i.test(`${job.title} ${job.location} ${job.type}`),
    datePosted: toDate(job.updated),
    experience: job.type || null,
  });

const fetchPostings = async ({ keywords, maxResults }) => {
  const { key, host, locations } = config();
  const out = [];
  let calls = 0;
  for (const location of locations) {
    for (const keyword of keywords.length ? keywords : [""]) {
      if (out.length >= maxResults || calls >= MAX_CALLS) break;
      calls++;
      const data = await fetchJson(`https://${host}/api/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keyword, location, page: "1" }),
      });
      for (const job of Array.isArray(data?.jobs) ? data.jobs : []) out.push(map(job));
    }
  }
  return out.slice(0, maxResults);
};

module.exports = { name: "jooble", label: "Jooble (Sri Lanka)", isConfigured, fetchPostings, map, config };
