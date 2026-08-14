#!/usr/bin/env node
/**
 * Pull a sample of real postings from an Ever Jobs instance and write them to
 * disk — both the raw aggregator response and the rows the importer would
 * create — so the mapping can be eyeballed before anything is written to the
 * database.
 *
 * Nothing here touches Prisma: it imports the mapper only, so it is safe to run
 * against production credentials that are not even loaded.
 *
 *   # with Ever Jobs running on its default port
 *   EVER_JOBS_URL=http://localhost:3001 node scripts/fetch-ever-jobs-sample.js
 *
 *   # narrow it
 *   EVER_JOBS_URL=http://localhost:3001 node scripts/fetch-ever-jobs-sample.js \
 *     --term "software engineer" --sites remoteok,remotive --location "Colombo" --count 10
 *
 * Sources that need their own API keys (Adzuna, Reed, Jooble, USAJobs, …) are
 * configured on the Ever Jobs side. The keyless ones — remoteok, remotive,
 * jobicy, himalayas, arbeitnow, weworkremotely — need no setup at all, which
 * makes them the ones to start with.
 */

const fs = require("fs");
const path = require("path");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const baseUrl = (process.env.EVER_JOBS_URL || "http://localhost:3001").replace(/\/$/, "");
const term = arg("term", "software engineer");
const sites = arg("sites", "remoteok,remotive,jobicy").split(",").map((s) => s.trim()).filter(Boolean);
const count = Number(arg("count", 10));
const location = arg("location", "");
const outDir = arg("out", path.join(process.cwd(), "ever-jobs-sample"));

const query = {
  searchTerm: term,
  siteType: sites,
  resultsWanted: count,
  descriptionFormat: "markdown",
  ...(location ? { location } : {}),
};

(async () => {
  console.log(`→ ${baseUrl}/api/jobs/search`);
  console.log(`  ${JSON.stringify(query)}\n`);

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
    console.error(`✖ Could not reach Ever Jobs at ${baseUrl}: ${err.message}`);
    console.error("  Start it with `npm run start:dev` in the ever-jobs checkout (listens on 3001).");
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`✖ Ever Jobs answered ${response.status}`);
    console.error((await response.text()).slice(0, 500));
    process.exit(1);
  }

  const body = await response.json();
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "raw-response.json"), JSON.stringify(body, null, 2));

  // The importer's own mapper, so what this prints is exactly what an import
  // would write — not a second implementation that can drift from it.
  const { mapPosting, isImportable } = require("../modules/jobs/jobImport.service");
  const mapped = jobs.map(mapPosting);
  fs.writeFileSync(path.join(outDir, "mapped-rows.json"), JSON.stringify(mapped, null, 2));

  const bySite = jobs.reduce((acc, j) => ({ ...acc, [j.site || "unknown"]: (acc[j.site || "unknown"] || 0) + 1 }), {});

  console.log(`✔ ${jobs.length} postings (raw_count=${body.raw_count ?? "n/a"}, cached=${body.cached ?? "n/a"})`);
  console.log(`  by source: ${JSON.stringify(bySite)}`);
  console.log(`  importable: ${mapped.filter(isImportable).length} / ${mapped.length}`);
  console.log(`  with salary: ${mapped.filter((m) => m.salaryMin || m.salaryMax).length}`);
  console.log(`  remote: ${mapped.filter((m) => m.isRemote).length}`);
  console.log(`\n  ${path.join(outDir, "raw-response.json")}`);
  console.log(`  ${path.join(outDir, "mapped-rows.json")}`);

  if (jobs.length === 0) {
    console.log("\n  No postings came back. Every source failing at once usually means outbound");
    console.log("  requests are blocked (a proxy or firewall) — check the Ever Jobs logs, which");
    console.log("  name the failing source and its status code.");
  } else {
    console.log("\n  First mapped row:\n");
    console.log(JSON.stringify(mapped[0], null, 2));
  }
})();
