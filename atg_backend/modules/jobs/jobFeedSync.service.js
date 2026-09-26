const { prisma } = require("../../config/db");
const { activityLogger, systemLogger } = require("../../config/atg_logger");
const { saveMappedJobs, forLog } = require("./jobImport.service");
const feeds = require("./feeds");
const { list } = require("./feeds/common");

// Pulls new jobs from every configured feed (Adzuna, Arbeitnow, Jooble) into
// the Job table as `pending`, for an operator to approve. Runs daily from
// Vercel Cron (GET /api/cron/job-sync) and on demand by staff
// (POST /api/jobs/sync-feeds). See JOB_FEEDS.md.

const DAY_MS = 24 * 60 * 60 * 1000;

// Per source, per run. Bounds both the provider calls and the database writes
// so a run finishes well inside the 60s function limit.
const maxPerSource = () => Math.min(Number(process.env.JOB_SYNC_MAX_PER_SOURCE) || 100, 300);

// Pending feed jobs no feed has returned for this long are retired from the
// review queue. 0 turns retirement off.
const expireDays = () => {
  const n = Number(process.env.JOB_SYNC_EXPIRE_DAYS);
  return Number.isFinite(n) && n >= 0 ? n : 30;
};

/**
 * What to search for. JOB_SYNC_KEYWORDS wins when set; otherwise the job roles
 * candidates on this platform actually chose, most popular first — so the
 * sync fetches jobs people here want, without anyone maintaining a list.
 */
const resolveKeywords = async () => {
  const configured = list(process.env.JOB_SYNC_KEYWORDS);
  if (configured.length) return configured.slice(0, 10);

  try {
    const roles = await prisma.jobRole.findMany({
      where: { d_status: "active", status: "active" },
      select: { name: true, _count: { select: { userJobRoles: true } } },
      orderBy: { userJobRoles: { _count: "desc" } },
      take: 3,
    });
    return roles.filter((r) => r._count?.userJobRoles > 0).map((r) => r.name);
  } catch {
    return [];
  }
};

/**
 * Retire pending feed jobs that no sync has refreshed in `days`. Only jobs
 * still awaiting review: an approved job is an operator's decision and stays
 * put, and candidates never saw a pending one, so none can have applied.
 * saveMappedJobs updates a job every time a feed returns it, so updatedAt is
 * "last seen in a feed".
 */
const retireStale = async (days, sources) => {
  if (!days || !sources.length) return 0;
  const { count } = await prisma.job.updateMany({
    where: {
      status: "pending",
      d_status: "active",
      externalSource: { in: sources },
      updatedAt: { lt: new Date(Date.now() - days * DAY_MS) },
    },
    data: { d_status: "expired" },
  });
  return count;
};

const status = () =>
  feeds.map((feed) => ({ source: feed.name, label: feed.label, configured: feed.isConfigured() }));

const syncFeeds = async ({ trigger = "manual", requesterId = null } = {}) => {
  const started = Date.now();
  const keywords = await resolveKeywords();
  const limit = maxPerSource();
  const active = feeds.filter((feed) => feed.isConfigured());

  // Fetches run in parallel — they are network-bound and independent. Writes
  // then run one source at a time, so the database sees one writer.
  const fetched = await Promise.allSettled(active.map((feed) => feed.fetchPostings({ keywords, maxResults: limit })));

  const sources = [];
  for (let i = 0; i < active.length; i++) {
    const feed = active[i];
    const result = fetched[i];
    if (result.status === "rejected") {
      // One broken feed must never stop the others.
      const reason = forLog(result.reason?.message || "failed");
      systemLogger.error("Job feed failed", { source: feed.name, reason });
      sources.push({ source: feed.name, ok: false, error: reason });
      continue;
    }
    const counts = await saveMappedJobs(result.value);
    sources.push({ source: feed.name, ok: true, fetched: result.value.length, ...counts });
  }

  const retired = await retireStale(expireDays(), active.map((f) => f.name));

  const summary = {
    trigger,
    keywords,
    sources,
    skippedUnconfigured: feeds.filter((f) => !f.isConfigured()).map((f) => f.name),
    retired,
    durationMs: Date.now() - started,
  };
  activityLogger.activity("Job feeds synced", { ...summary, keywords: forLog(keywords.join(", ")), requesterId });
  return summary;
};

module.exports = { syncFeeds, status, resolveKeywords, retireStale };
