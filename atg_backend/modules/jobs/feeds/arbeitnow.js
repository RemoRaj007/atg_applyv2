const { base, toDate, fetchJson } = require("./common");

// Arbeitnow — official, keyless JSON feed of jobs in Germany and Europe from
// employers' applicant tracking systems. By default only roles offering visa
// sponsorship are taken: those are the European jobs a candidate applying from
// Sri Lanka can actually take up. ARBEITNOW_VISA_ONLY=false takes everything.

const MAX_PAGES = 3; // 100 jobs a page; a daily run needs no more

const isConfigured = () => process.env.ARBEITNOW_ENABLED !== "false";
const visaOnly = () => process.env.ARBEITNOW_VISA_ONLY !== "false";

const map = (job) =>
  base({
    source: "arbeitnow",
    externalId: job.slug,
    title: job.title,
    company: job.company_name,
    location: job.location,
    locationType: job.remote ? "Remote" : null,
    description: job.description,
    jobUrl: job.url,
    isRemote: Boolean(job.remote),
    datePosted: toDate(job.created_at),
    experience: Array.isArray(job.job_types) ? job.job_types.join(", ") : null,
  });

// Arbeitnow has no search parameter, so keywords filter client-side on the
// title and tags. With no keywords configured, every visa-sponsored role is kept.
const matches = (job, keywords) => {
  if (!keywords.length) return true;
  const hay = `${job.title} ${(job.tags || []).join(" ")}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
};

const fetchPostings = async ({ keywords, maxResults }) => {
  const out = [];
  for (let page = 1; page <= MAX_PAGES && out.length < maxResults; page++) {
    const params = new URLSearchParams({ page: String(page) });
    if (visaOnly()) params.set("visa_sponsorship", "true");
    const data = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?${params}`);
    const jobs = Array.isArray(data?.data) ? data.data : [];
    for (const job of jobs) {
      if (!matches(job, keywords)) continue;
      const mapped = map(job);
      mapped.skills = Array.isArray(job.tags) ? job.tags : [];
      out.push(mapped);
    }
    if (!jobs.length || !data?.links?.next) break;
  }
  return out.slice(0, maxResults);
};

module.exports = { name: "arbeitnow", label: "Arbeitnow (EU, visa sponsorship)", isConfigured, fetchPostings, map };
