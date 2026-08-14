# Importing jobs from Ever Jobs

[Ever Jobs](https://github.com/ever-jobs/ever-jobs) is a NestJS aggregator that
fans one query out across 160+ job boards — LinkedIn, Indeed, Glassdoor,
RemoteOK, Adzuna, Jooble, Bayt, Naukri and the rest — and returns them in a
single normalised shape. `POST /api/jobs/import` pulls from an instance of it
and writes the results into the `Job` table.

It is **self-hosted**: there is no public endpoint, so you run it yourself and
point `EVER_JOBS_URL` at it.

## Running Ever Jobs

```bash
git clone https://github.com/ever-jobs/ever-jobs
cd ever-jobs
npm install
cp .env.example .env
npm run start:dev          # http://localhost:3001
# or: docker compose up -d
```

Swagger UI is at `/swg`, the OpenAPI JSON at `/swg-json`, and a Scalar reference
at `/docs`.

Then, in `atg_backend/.env`:

```
EVER_JOBS_URL=http://localhost:3001
# Only if you switched API-key auth on in that instance; it ships disabled.
EVER_JOBS_API_KEY=
```

## Sources

Sources fall into two groups, and it matters for setup:

- **Keyless** — `remoteok`, `remotive`, `jobicy`, `himalayas`, `arbeitnow`,
  `weworkremotely`, `landingjobs`, and others. Nothing to configure.
- **Key-holding** — `adzuna`, `reed`, `jooble`, `usajobs`, `careerjet`,
  `findwork`, `talroo`, `infojobs`, … Credentials go in the **Ever Jobs**
  environment, not ours. See its `docs/AUTHENTICATION.md`.

Ever Jobs adds sources continuously, so `siteType` is validated as free-form
strings rather than an enum — pinning a list here would reject sources the
instance already supports. `GET /api/sources/health` on that instance lists what
it currently has.

## Seeing the data before importing

```bash
EVER_JOBS_URL=http://localhost:3001 node scripts/fetch-ever-jobs-sample.js \
  --term "software engineer" --sites remoteok,remotive --count 10
```

Writes `raw-response.json` (exactly what the aggregator returned) and
`mapped-rows.json` (the rows an import would create). It calls the importer's own
mapper, so the preview cannot drift from what an import actually writes. Nothing
touches the database.

## The endpoint

```
POST /api/jobs/import      (admin only, 20/hour)

{
  "searchTerm": "software engineer",   // required
  "siteType": ["remoteok", "remotive"], // required, 1–20 sources
  "location": "Colombo",
  "country": "Sri Lanka",
  "isRemote": true,
  "jobType": ["fulltime"],
  "resultsWanted": 20,                  // max 200
  "hoursOld": 72,
  "descriptionFormat": "markdown"
}
```

Answers with a summary:

```json
{ "fetched": 20, "imported": 14, "updated": 5, "skipped": 1, "sources": ["remoteok"] }
```

## Field mapping

| Ever Jobs | `Job` column | Note |
| --- | --- | --- |
| `title` | `title` | required; a posting without one is skipped |
| `companyName` | `company` | falls back to `"Unknown"` |
| `location{city,state,country}` | `location` | joined, comma-separated |
| `isRemote` / `workFromHomeType` | `locationType`, `isRemote` | `workFromHomeType` wins, so "Hybrid" survives |
| `applyUrl` › `jobUrlDirect` › `jobUrl` | `jobUrl` | the apply URL is the one a candidate needs |
| `description` | `description` | clipped to 20 000 chars |
| `experienceRange` / `jobLevel` | `experience` | |
| `compensation{…}` | `salaryMin/Max/Currency/Interval` | |
| `datePosted` | `datePosted` | distinct from `createdAt`, which is import time |
| `site` + `id` | `externalSource` + `externalId` | the dedupe key |
| `skills[]` | `JobSkill` → `Skill` | matched on name; only genuinely new names create a row |

Not currently stored: `companyLogo`, `companyIndustry`, `companyNumEmployees`,
`emails`, `jobFunction`, `department`, `team`, `atsId`/`atsType`, `liveness`,
`legitimacy`. Add columns if any of them earn their place.

## Two decisions worth knowing

**Imports land as `pending`, never `approved`.** These are scraped from public
boards; an operator approves before candidates see them. Re-importing a posting
an operator has already approved or rejected refreshes its content but leaves
that decision alone.

**Dedupe is on `externalSource` + `externalId`, not `jobUrl`.** Tracking
parameters, redirects and mirrored postings all vary the URL for what is the
same job. The pair is stable at the origin, and a partial unique index enforces
it — rows created by hand have both columns NULL and are unaffected.

## Migration

`20260814140000_add_job_import_fields` adds the columns above. Apply it before
first use:

```bash
DATABASE_URL="<session-pooler-string>" npx prisma migrate deploy
```
