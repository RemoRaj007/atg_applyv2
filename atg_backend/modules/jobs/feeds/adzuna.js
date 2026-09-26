const { base, toDate, toAmount, fetchJson, list } = require("./common");

// Adzuna — official API, free app id + key from developer.adzuna.com.
// One endpoint per country; the European markets are the default set here.
// Free-tier limits are low (tens of calls a minute, a few hundred a day), so a
// run makes at most MAX_CALLS requests however many countries and keywords are
// configured.

const DEFAULT_COUNTRIES = "gb,de,fr,nl,pl,at,it";
const PER_PAGE = 50; // Adzuna's maximum
const MAX_CALLS = Number(process.env.ADZUNA_MAX_CALLS) || 14;
const CURRENCY = { gb: "GBP", pl: "PLN", ch: "CHF" };

const config = () => ({
  appId: process.env.ADZUNA_APP_ID?.trim(),
  appKey: process.env.ADZUNA_APP_KEY?.trim(),
  countries: list(process.env.ADZUNA_COUNTRIES || DEFAULT_COUNTRIES)
    .map((c) => c.toLowerCase())
    .filter((c) => /^[a-z]{2}$/.test(c)),
});

const isConfigured = () => {
  const { appId, appKey } = config();
  return Boolean(appId && appKey);
};

const map = (job, country) =>
  base({
    source: "adzuna",
    // Adzuna ids are per market, so the country makes the key unambiguous.
    externalId: job.id ? `${country}:${job.id}` : null,
    title: job.title,
    company: job.company?.display_name,
    location: job.location?.display_name,
    description: job.description,
    jobUrl: job.redirect_url,
    isRemote: /\bremote\b/i.test(`${job.title} ${job.location?.display_name}`),
    datePosted: toDate(job.created),
    // Adzuna fills in an estimate when the ad has no salary. An estimate shown
    // to a candidate as the job's pay would be a claim the employer never made.
    salaryMin: job.salary_is_predicted === "1" ? null : toAmount(job.salary_min),
    salaryMax: job.salary_is_predicted === "1" ? null : toAmount(job.salary_max),
    salaryCurrency: CURRENCY[country] || "EUR",
    salaryInterval: "yearly",
    experience: [job.contract_time, job.contract_type].filter(Boolean).join(", ").replace(/_/g, " ") || null,
  });

const fetchPostings = async ({ keywords, maxResults }) => {
  const { appId, appKey, countries } = config();
  const searches = [];
  for (const country of countries) for (const what of keywords.length ? keywords : [""]) searches.push({ country, what });

  const out = [];
  for (const { country, what } of searches.slice(0, MAX_CALLS)) {
    if (out.length >= maxResults) break;
    const params = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: String(PER_PAGE), max_days_old: "14", "content-type": "application/json" });
    if (what) params.set("what", what);
    const data = await fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    for (const job of Array.isArray(data?.results) ? data.results : []) out.push(map(job, country));
  }
  return out.slice(0, maxResults);
};

module.exports = { name: "adzuna", label: "Adzuna (Europe)", isConfigured, fetchPostings, map, config };
