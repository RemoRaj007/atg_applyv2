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
