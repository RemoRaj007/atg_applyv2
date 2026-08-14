/**
 * Imports job postings from an Ever Jobs instance (https://github.com/ever-jobs/ever-jobs),
 * a NestJS aggregator that fans a single query out across 160+ job boards and
 * returns them in one normalised shape.
 *
 * Ever Jobs is self-hosted — there is no public endpoint — so EVER_JOBS_URL must
 * point at your own deployment (it listens on 3001 by default). Sources that
 * need their own credentials (Adzuna, Reed, Jooble, USAJobs, …) are configured
 * on that side, not here; the keyless sources work with no configuration at all.
 *
 * Imported rows land as `pending`, never `approved`: this pulls from public job
 * boards, and nothing scraped should reach candidates without an operator
 * looking at it first.
 */

const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger, systemLogger } = require("../../config/atg_logger");

// Ever Jobs runs every requested source concurrently and waits on the slowest,
// so a multi-source search is legitimately slow. Its own default deadline is
// 120s; this sits just past it so the API answers before we give up on it.
const REQUEST_TIMEOUT_MS = Number(process.env.EVER_JOBS_TIMEOUT_MS || 130000);

// Guards against a single call trying to import thousands of rows: each posting
// is a write, and this runs inside one HTTP request.
const MAX_RESULTS_WANTED = 200;

const everJobsUrl = () => {
  const configured = (process.env.EVER_JOBS_URL || "").trim().replace(/\/$/, "");
  if (!configured) {
    throw ApiError.badRequest(
      "Job importing is not configured: set EVER_JOBS_URL to your Ever Jobs instance (see docs/JOB_IMPORT.md)."
    );
  }
  return configured;
};

/**
 * Ever Jobs reports a per-source failure by returning fewer jobs, not by
 * failing the request — a 201 with `count: 0` is what a blocked or rate-limited
 * source looks like. Surfacing the raw envelope lets the caller tell "no matches"
 * apart from "every source failed".
 */
const searchEverJobs = async (query) => {
  const url = `${everJobsUrl()}/api/jobs/search`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Only when the instance has API-key auth switched on; it ships disabled.
        ...(process.env.EVER_JOBS_API_KEY ? { "X-API-Key": process.env.EVER_JOBS_API_KEY } : {}),
      },
      body: JSON.stringify(query),
    });
  } catch (err) {
    const reason = err.name === "AbortError" ? "timed out" : "could not be reached";
    systemLogger.error(`Ever Jobs search ${reason}`, { url, message: err.message });
    throw ApiError.badGateway(`The job source (${url}) ${reason}.`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    systemLogger.error("Ever Jobs search failed", { url, status: response.status, body: body.slice(0, 500) });
    throw ApiError.badGateway(`The job source answered ${response.status}.`);
  }

  return response.json();
};

// Ever Jobs returns a structured location; the Job table stores one string.
const formatLocation = (location) => {
  if (!location) return null;
  const parts = [location.city, location.state, location.country].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

// jobType is an array ("fulltime", "contract", …) and workFromHomeType carries
// "Hybrid" where a source distinguishes it. `isRemote` alone cannot express
// hybrid, so it is only the fallback.
const formatLocationType = (post) => {
  if (post.workFromHomeType) return post.workFromHomeType;
  if (post.isRemote) return "Remote";
  return post.location ? "Onsite" : null;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Postings come from public boards, so a description can be arbitrarily long
// while the column is not. Truncate rather than reject: a clipped description is
// still useful to an operator deciding whether to approve the posting.
const MAX_DESCRIPTION = 20000;
const clip = (text, max) => {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
};

/**
 * One aggregated posting → the columns of our Job table.
 *
 * `externalSource` + `externalId` is the dedupe key. jobUrl is not usable as one:
 * tracking parameters, redirects and mirrored postings all vary it for what is
 * the same job.
 */
const mapPosting = (post) => ({
  title: clip(post.title, 255),
  company: clip(post.companyName, 255) || "Unknown",
  location: formatLocation(post.location),
  locationType: formatLocationType(post),
  description: clip(post.description, MAX_DESCRIPTION),
  jobUrl: post.applyUrl || post.jobUrlDirect || post.jobUrl || null,
  experience: clip(post.experienceRange || post.jobLevel, 255),
  externalSource: post.site || null,
  externalId: post.id ? String(post.id) : null,
  isRemote: Boolean(post.isRemote),
  datePosted: toDate(post.datePosted),
  salaryMin: post.compensation?.minAmount ?? null,
  salaryMax: post.compensation?.maxAmount ?? null,
  salaryCurrency: post.compensation?.currency || null,
  salaryInterval: post.compensation?.interval || null,
  source: "ever-jobs",
  // Never `approved`. See the note at the top of this file.
  status: "pending",
});

// A posting with no title or no stable identity cannot be deduped or shown, and
// is not worth a row.
const isImportable = (mapped) => Boolean(mapped.title && mapped.externalSource && mapped.externalId);

/**
 * Ever Jobs returns skills as free text (`["React", "TypeScript"]`). The Skill
 * catalog is keyed by name, so reuse a matching row and only create one when the
 * name is genuinely new — otherwise an import sprouts duplicates of the catalog.
 */
const attachSkills = async (jobId, skillNames) => {
  for (const raw of skillNames.slice(0, 20)) {
    const name = String(raw || "").trim();
    if (!name || name.length > 100) continue;

    const skill =
      (await prisma.skill.findUnique({ where: { name } })) ||
      (await prisma.skill.create({ data: { name } }));

    // The import is re-runnable, so the pair may already be linked.
    await prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId, skillId: skill.id } },
      update: { d_status: "active" },
      create: { jobId, skillId: skill.id },
    });
  }
};

/**
 * Fetch from Ever Jobs and write the results into the Job table.
 *
 * Re-runnable by design: a posting already imported is updated in place rather
 * than duplicated, and one that an operator has already approved or rejected
 * keeps that decision — re-importing must not quietly re-open a rejected job.
 */
const importJobs = async (query, requester) => {
  const resultsWanted = Math.min(Number(query.resultsWanted) || 20, MAX_RESULTS_WANTED);
  const payload = { ...query, resultsWanted };

  const result = await searchEverJobs(payload);
  const postings = Array.isArray(result?.jobs) ? result.jobs : [];

  const summary = {
    fetched: postings.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    sources: payload.siteType || [],
  };

  for (const post of postings) {
    const mapped = mapPosting(post);
    if (!isImportable(mapped)) {
      summary.skipped += 1;
      continue;
    }

    const existing = await prisma.job.findFirst({
      where: { externalSource: mapped.externalSource, externalId: mapped.externalId },
    });

    if (existing) {
      // status is deliberately absent: an operator's approve/reject decision
      // outlives a re-import of the same posting.
      const { status, ...refreshable } = mapped;
      await prisma.job.update({ where: { id: existing.id }, data: refreshable });
      summary.updated += 1;
      if (Array.isArray(post.skills)) await attachSkills(existing.id, post.skills);
      continue;
    }

    const created = await prisma.job.create({ data: mapped });
    summary.imported += 1;
    if (Array.isArray(post.skills)) await attachSkills(created.id, post.skills);
  }

  activityLogger.activity("Jobs imported from Ever Jobs", {
    ...summary,
    importedBy: requester?.id,
    searchTerm: payload.searchTerm,
  });

  return summary;
};

module.exports = { importJobs, mapPosting, formatLocation, formatLocationType, isImportable };
