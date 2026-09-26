# Job feeds (automatic job import)

Jobs from public job APIs are pulled into ATG Apply **every day at 03:17 UTC**,
and on demand by an admin (`POST /api/jobs/sync-feeds`). Every imported job
arrives as **pending**: nothing from a public feed reaches candidates until an
operator approves it.

## Sources

| Source | Covers | Needs | Why this one |
| --- | --- | --- | --- |
| **Arbeitnow** | Germany and Europe, plus remote roles | nothing — keyless | Official free feed of jobs straight from employers' applicant tracking systems. Defaults to **visa-sponsored roles only**, which are the European jobs a candidate applying from Sri Lanka can actually take. |
| **Adzuna** | UK, Germany, France, Netherlands, Poland, Austria, Italy (configurable) | free app id + key | Official API across the major European markets, with advertised salaries. |
| **Jooble** | **Sri Lanka** (configurable, and works for Europe too) | free API key | An aggregator that indexes Sri Lankan job sites. It is the Sri Lanka source because Sri Lanka's own boards publish no API. |

**Arbeitnow runs from the first deploy.** The other two switch on when their
keys are set.

### Deliberately not used

- **topjobs.lk, XpressJobs, ikman.lk** — no public API. Scraping them would
  likely breach their terms and breaks whenever their pages change; Jooble
  already indexes Sri Lankan listings legitimately.
- **EURES** and the **German Bundesagentur für Arbeit** — neither publishes an
  official public API. The "EURES APIs" that turn up in searches are
  third-party scrapers.
- **Careerjet** — its API is an affiliate *display* API (per-visitor
  parameters, tracking redirects), not a feed meant for importing.

## Setup

On Vercel (backend project → Settings → Environment Variables), then redeploy:

| Variable | Required | Default | |
| --- | --- | --- | --- |
| `CRON_SECRET` | **yes, for the daily run** | — | Any long random string, e.g. `openssl rand -hex 32`. Vercel sends it with each cron call. **Without it the cron endpoint refuses every caller, including Vercel's scheduler, so nothing syncs automatically.** |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | for Adzuna | — | From developer.adzuna.com. |
| `ADZUNA_COUNTRIES` | no | `gb,de,fr,nl,pl,at,it` | Two-letter Adzuna market codes. |
| `JOOBLE_API_KEY` | for Jooble | — | From jooble.org/api/about. |
| `JOOBLE_LOCATIONS` | no | `Sri Lanka` | Comma-separated, e.g. `Sri Lanka,Colombo,Kandy`. |
| `JOOBLE_API_HOST` | no | `jooble.org` | If your key was issued for a country portal. |
| `ARBEITNOW_VISA_ONLY` | no | `true` | `false` takes every Arbeitnow role, not just visa-sponsored ones. |
| `ARBEITNOW_ENABLED` | no | `true` | `false` turns Arbeitnow off. |
| `JOB_SYNC_KEYWORDS` | no | *(see below)* | Comma-separated search terms, at most 10. |
| `JOB_SYNC_MAX_PER_SOURCE` | no | `100` | Jobs taken per source per run, capped at 300. |
| `JOB_SYNC_EXPIRE_DAYS` | no | `30` | Retire *pending* feed jobs no feed has returned for this many days. `0` turns it off. |

**What gets searched.** With `JOB_SYNC_KEYWORDS` unset, the sync searches for
the three job roles candidates on the platform have chosen most often, so it
fetches the jobs people here are actually looking for, with no list to
maintain. With no roles chosen yet, Adzuna and Jooble search without keywords
and return their most recent listings.

**Provider limits.** Adzuna's free tier allows only a few hundred calls a day;
a run makes at most 14 (`ADZUNA_MAX_CALLS`) whatever the countries × keywords.
Jooble is capped at 10 calls a run (`JOOBLE_MAX_CALLS`), and Arbeitnow at 3
pages.

## What a sync does

1. Fetches every configured source **in parallel**, each with its own timeout.
   A source that fails is reported and skipped — it never stops the others.
2. Maps each posting to a Job: HTML descriptions become plain text, only
   `http(s)` links are kept (a `javascript:` link from a feed would be stored
   XSS), and Adzuna's *estimated* salaries are dropped (showing an estimate as
   the job's pay would be a claim the employer never made).
3. Saves through the same code as the manual Ever Jobs import: a posting seen
   before is **updated, not duplicated** (matched on source + source id), and an
   operator's approve/reject decision is **never overwritten**.
4. Retires pending feed jobs that no feed has returned for
   `JOB_SYNC_EXPIRE_DAYS`, so the review queue doesn't fill with dead postings.
   **Approved jobs are never retired automatically** — that stays an
   operator's call.

The response and the activity log carry a per-source summary: fetched,
imported, updated, skipped, retired, and any source's error.

## Checking the feeds still work

The unit tests prove the adapters handle each provider's documented response
shape. `npm run jobs:check-feeds` (in `atg_backend/`) calls the live APIs,
writes nothing, and fails if a configured feed errors or maps to unusable jobs.
It also runs in GitHub Actions (`job-feeds-check.yml`) on feed changes and
every Monday, so a provider changing its response shape is noticed before the
daily sync quietly imports nothing. Add `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` and
`JOOBLE_API_KEY` as repository secrets to cover those two sources as well.
