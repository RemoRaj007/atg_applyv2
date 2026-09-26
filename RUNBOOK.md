# Runbook: ATG Apply (API + frontend)

Last verified: 2026-08-23

Every failure mode below is one this system has actually produced, not a
hypothetical. Written for whoever is looking at it cold.

## What this service does

ATG Apply is a job/scholarship application platform. Candidates build a profile
and staff prepare applications on their behalf. Two deployables: an Express +
Prisma API on Vercel (`atg_backend`, root directory `atg_backend`) and a React
SPA on Cloudflare Workers (`atgapplyv2`, static assets from `atg_frontend/dist`).
Data lives in Supabase Postgres (project ref `jlfyewnowimoetemzhlt`, ca-central-1).

## Health check

```bash
curl -s https://<api-host>/
```

- `ATG Apply Backend API (Postgres/Supabase via Prisma) is running` → API up **and** DB reachable.
- `Database connection error` → API up, **DB unreachable**. Go to the first alert below.

That route runs `SELECT 1` through Prisma, so it is a real dependency check, not a liveness ping.

## Dashboards and logs

- **API runtime logs** — Vercel → project `atg-applyv2` → **Logs** (top nav).
  Not the deployment build log. The build log will look clean while the app is
  failing; the runtime log carries the actual Prisma error.
- **Build logs** — Vercel → Deployments → select deployment.
- **Frontend builds** — Cloudflare dashboard → Workers → `atgapplyv2` → Builds.
- **Database** — Supabase dashboard → project `jlfyewnowimoetemzhlt`.

## Common alerts

### `Database connection error` on `/`

Means: the API cannot reach Postgres. Almost always credentials, not an outage.

Check, in order:
1. Vercel **runtime** logs for the underlying error. `28P01` = password authentication failed.
2. Whether the Supabase DB password was rotated without updating Vercel.
3. `DATABASE_URL` in Vercel env vars — must be the **transaction pooler**, port `6543`.

Fix: set `DATABASE_URL` to the current pooled string and redeploy. Copy the
connection string straight from the Supabase dashboard immediately after any
password reset rather than reassembling it by hand — a mistyped or stale
password is the single most common cause of this alert.

Escalate if: the string is confirmed correct and `28P01` persists — check
Supabase project status for a platform incident.

### Auth endpoints 500 while `/` is healthy

Means: DB is fine, but JWT signing/verification cannot initialise.

Check: `JWT_SECRET` and `JWT_REFRESH_SECRET` are both set in Vercel, for the
environment being hit (Production **and** Preview are configured separately).

Fix: set both, redeploy. The app fails loudly by name on boot when either is
missing — the log names the variable.

### Migrations skipped during build

Means: build printed a `!!!!` banner saying no session-mode connection string
was found, or that the DB was unreachable. **The deploy still succeeded**, so
the code is now ahead of the schema and any query touching a new column 500s.

Check the banner text:
- `No session-mode connection string` → none of `MIGRATE_DATABASE_URL`,
  `POSTGRES_URL_NON_POOLING`, `DIRECT_URL` is set in the **build** environment.
- `ENETUNREACH ... :5432` → the string points at the direct host
  `db.<ref>.supabase.co`, which Supabase serves **IPv6-only** unless the IPv4
  add-on is on. Most build runners cannot reach it.
- `password authentication failed` → stale password in that variable.

Fix: set `MIGRATE_DATABASE_URL` to the **session pooler** string (same host as
the runtime pooler, port `5432`, username in `postgres.<project-ref>` form).
It is checked first and is IPv4-reachable. Then redeploy.

Note the precedence: `MIGRATE_DATABASE_URL` > `POSTGRES_URL_NON_POOLING` >
`DIRECT_URL`. Setting `MIGRATE_DATABASE_URL` will not help if an earlier-broken
variable is the one you meant to fix — the resolver reports which name it used.

### CI fails with `npm ci` EUSAGE

Means: `package.json` and `package-lock.json` disagree. Blocks every backend job
at once (Build & Lint, Backend tests, Migration status), which makes it look
like a broader outage than it is.

Fix: `cd atg_backend && npm install`, commit the regenerated lock file. Verify
with a clean `rm -rf node_modules && npm ci` before pushing.

### AI panel missing, or AI endpoints answer `503`

`GET /api/ai/status` says which. `enabled: false` means `NVIDIA_API_KEY` is not
set on Vercel — expected until it is. If it is set and calls still 503, check
the runtime log for **`AI provider rejected the API key — rotate NVIDIA_API_KEY`**:
the key was revoked or expired (NVIDIA API keys are time-limited). Generate a new
one at build.nvidia.com, replace the variable, redeploy.

A 503 saying the service is *busy* is NVIDIA rate-limiting the key; it clears on
its own. Repeated 504s mean the model is slower than `AI_TIMEOUT_MS` allows —
look at `latencyMs` in the `AiRequest` table before raising it, and never raise
it past the 60 s function limit in `vercel.json`.

### AI quality complaint ("it made something up")

Get the time and user, then read their `AiRequest` rows: model, prompt version
and which fields were sent. The generated text is not stored, by design, so ask
the candidate for it. Add it as a case in `atg_backend/evals/ai-cases.json`
**before** touching the prompt, and ship the fix with a before-and-after eval
run. See [AI.md](AI.md).

### No new jobs arriving from the feeds

Check the latest `Job feeds synced` entry in the activity log. Its `sources`
list gives each feed's result or error. No entry at all since the last 03:17
UTC means the cron never reached the API: `CRON_SECRET` is missing on Vercel
(the endpoint then refuses every caller — look for `Cron endpoint refused` in
the security log), or the project's cron jobs are paused. A source reporting
`HTTP 401`/`403` has a bad key. One reporting `ok` with 0 fetched usually means
the keywords match nothing. Run `npm run jobs:check-feeds` or the *Job feeds
check* workflow to test the live APIs without writing anything. See
[JOB_FEEDS.md](JOB_FEEDS.md).

## Restart / rollback

Both platforms roll back without a rebuild — prefer this to a forward fix during
an incident.

- **API (Vercel):** Deployments → last known good → **⋯ → Promote to Production**.
- **Frontend (Cloudflare):** Workers → `atgapplyv2` → Deployments → **Rollback**.

Verify after either: `curl -s https://<api-host>/` returns the running message,
then log in through the UI.

**Rollback does not revert database migrations.** A deploy that added a
migration is not fully undone by promoting the previous build. Check whether the
bad release migrated the schema before assuming rollback restored the old state.

## Dependencies

| Dependency | Breaks when unavailable |
|---|---|
| Supabase Postgres | Everything. `/` reports `Database connection error`. |
| Vercel | Entire API. Frontend loads but every request fails. |
| Cloudflare Workers | Frontend unreachable. API still serves. |
| Supabase Storage | Uploads and document links only. Core flows unaffected. |
| SMTP (`EMAIL_HOST`) | Verification and reset emails silently skipped — logged as a warning, not an error. |

## Do NOT

- Do not enable `VITE_ENABLE_DEMO_LOGIN` on any build pointed at a database with
  real candidates. It puts a working admin password one click from the login
  page — which is exactly what production shipped from 3 to 26 September 2026.
- Do not paste `NVIDIA_API_KEY` (or any key) into chat, tickets or commits. Treat
  a key that has been pasted anywhere as exposed and rotate it.

- **Do not point `DATABASE_URL` at port 5432 to "fix" a connection error.** The
  session pooler holds one backend per connection and serverless will exhaust it.
  6543 for runtime, 5432 for migrations only.
- **Do not run migrations through the transaction pooler (6543).** Prisma's
  advisory lock cannot be held across statements there; concurrent builds can
  interleave and corrupt migration state.
- **Do not run `npm run db:seed -- --force` against production.** It wipes every
  table and seeds accounts whose password is published in the repo.
- **Do not assume a green build means a healthy release.** Migration failures
  warn and let the deploy continue by design. Check `/` after deploying.
- **Do not fix a red CI by rerunning it.** The `npm ci` drift above fails
  identically every time; rerunning only delays the real fix.
