#!/usr/bin/env node
// Calls every configured job feed for real, maps the results, and checks the
// mapping produced usable jobs — without touching any database.
//
//   npm run jobs:check-feeds
//
// The unit tests prove the adapters handle each provider's *documented* shape;
// this proves the live API still returns that shape. Arbeitnow needs no key, so
// it always runs; Adzuna and Jooble run when their keys are in the environment.
// Exits non-zero if a configured feed fails or maps to unusable jobs.
const feeds = require("../modules/jobs/feeds");
const { isImportable } = require("../modules/jobs/jobImport.service");
const { list } = require("../modules/jobs/feeds/common");

(async () => {
  const keywords = list(process.env.JOB_SYNC_KEYWORDS);
  let failed = false;

  for (const feed of feeds) {
    if (!feed.isConfigured()) {
      console.log(`skip  ${feed.name.padEnd(10)} not configured`);
      continue;
    }
    try {
      const jobs = await feed.fetchPostings({ keywords, maxResults: 25 });
      const usable = jobs.filter(isImportable);
      const withUrl = usable.filter((j) => j.jobUrl);
      const markup = usable.filter((j) => j.description && /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(j.description));
      const empty = usable.filter((j) => !j.description);
      console.log(`${usable.length ? "ok  " : "FAIL"}  ${feed.name.padEnd(10)} fetched ${jobs.length}, importable ${usable.length}, with link ${withUrl.length}, description: ${usable.length - markup.length - empty.length} clean, ${empty.length} empty, ${markup.length} still containing markup`);
      if (markup[0]) console.log(`      markup left in ${markup[0].externalId}: ${JSON.stringify(markup[0].description.slice(0, 160))}`);
      // Markup surviving conversion means candidates would read raw tags.
      if (markup.length) failed = true;
      if (usable[0]) {
        const { title, company, location, externalId, datePosted } = usable[0];
        console.log(`      e.g. "${title}" — ${company} — ${location ?? "no location"} — id ${externalId} — posted ${datePosted?.toISOString?.().slice(0, 10) ?? "?"}`);
      }
      // Zero importable jobs from a feed that answered means its shape changed
      // under us — exactly what this script exists to catch.
      if (jobs.length && !usable.length) failed = true;
      if (!jobs.length) console.log("      (no jobs returned — check keywords before assuming the feed broke)");
    } catch (err) {
      failed = true;
      console.log(`FAIL  ${feed.name.padEnd(10)} ${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
