#!/usr/bin/env node
/**
 * Pull a sample of real postings from an Ever Jobs instance and print them —
 * both the raw aggregator response and the rows the importer would create — so
 * the mapping can be eyeballed before anything is written to the database.
 *
 * Nothing here touches Prisma: it imports the mapper only, so it is safe to run
 * against an environment whose database credentials are not even loaded.
 *
 *   # with Ever Jobs running on its default port
 *   EVER_JOBS_URL=http://localhost:3001 node scripts/fetch-ever-jobs-sample.js
 *
 *   # narrow it, and keep a copy
 *   EVER_JOBS_URL=http://localhost:3001 node scripts/fetch-ever-jobs-sample.js \
 *     --term "software engineer" --sites remoteok,remotive --location "Colombo" \
 *     > sample.json
 *
 * The JSON payload goes to stdout and the human-readable summary to stderr, so
 * the redirect above captures the data and still prints the summary to your
 * terminal. Writing the file is left to the shell deliberately: the script has
 * no business choosing a path on disk for third-party content, and CodeQL is
 * right to flag it when a script does.
 *
 * Sources that need their own API keys (Adzuna, Reed, Jooble, USAJobs, …) are
 * configured on the Ever Jobs side. The keyless ones — remoteok, remotive,
 * jobicy, himalayas, arbeitnow, weworkremotely — need no setup at all, which
 * makes them the ones to start with.
 */

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const baseUrl = (process.env.EVER_JOBS_URL || "http://localhost:3001").replace(/\/$/, "");
const term = arg("term", "software engineer");
const sites = arg("sites", "remoteok,remotive,jobicy").split(",").map((s) => s.trim()).filter(Boolean);
const count = Number(arg("count", 10));
const location = arg("location", "");

const query = {
  searchTerm: term,
  siteType: sites,
  resultsWanted: count,
  descriptionFormat: "markdown",
  ...(location ? { location } : {}),
};

// stderr, so `> sample.json` captures only the JSON.
const log = (...args) => console.error(...args);

(async () => {
  log(`→ ${baseUrl}/api/jobs/search`);
  log(`  ${JSON.stringify(query)}\n`);

  let response;
  try {
    response = await fetch(`${baseUrl}/api/jobs/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EVER_JOBS_API_KEY ? { "X-API-Key": process.env.EVER_JOBS_API_KEY } : {}),
      },
      body: JSON.stringify(query),
      // A multi-source search waits on the slowest board.
      signal: AbortSignal.timeout(180000),
    });
  } catch (err) {
    log(`✖ Could not reach Ever Jobs at ${baseUrl}: ${err.message}`);
    log("  Start it with `npm run start:dev` in the ever-jobs checkout (listens on 3001).");
    process.exit(1);
  }

  if (!response.ok) {
    log(`✖ Ever Jobs answered ${response.status}`);
    log((await response.text()).slice(0, 500));
    process.exit(1);
  }

  const body = await response.json();
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];

  // The importer's own mapper, so what this prints is exactly what an import
  // would write — not a second implementation that can drift from it.
  const { mapPosting, isImportable } = require("../modules/jobs/jobImport.service");
  const mapped = jobs.map(mapPosting);

  const bySite = jobs.reduce((acc, j) => ({ ...acc, [j.site || "unknown"]: (acc[j.site || "unknown"] || 0) + 1 }), {});

  log(`✔ ${jobs.length} postings (raw_count=${body.raw_count ?? "n/a"}, cached=${body.cached ?? "n/a"})`);
  log(`  by source: ${JSON.stringify(bySite)}`);
  log(`  importable: ${mapped.filter(isImportable).length} / ${mapped.length}`);
  log(`  with salary: ${mapped.filter((m) => m.salaryMin || m.salaryMax).length}`);
  log(`  remote: ${mapped.filter((m) => m.isRemote).length}`);

  if (jobs.length === 0) {
    log("\n  No postings came back. Every source failing at once usually means outbound");
    log("  requests are blocked (a proxy or firewall) — check the Ever Jobs logs, which");
    log("  name the failing source and its status code.");
  } else {
    log("\n  Redirect stdout to keep the full sample, e.g. `… > sample.json`.");
  }

  process.stdout.write(JSON.stringify({ query, raw: body, mapped }, null, 2));
})();
