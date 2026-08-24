# Deploying to Vercel + Supabase

This project's backend now targets Postgres (Supabase) via Prisma and runs as
a Vercel serverless function; the frontend deploys to Vercel (or Cloudflare
Pages) as a static Vite build. This replaces the previous MariaDB + Docker
Compose + VPS setup for production.

## 1. Supabase

### Which project is production

> **Production is the Supabase project named `atg_applyv2`.**
>
> | | |
> | --- | --- |
> | Project name | `atg_applyv2` |
> | Project ref | `jlfyewnowimoetemzhlt` |
> | Region | `ca-central-1` |
> | API URL | `https://jlfyewnowimoetemzhlt.supabase.co` |
> | Pooler host | `aws-0-ca-central-1.pooler.supabase.com` |
>
> This account also contains an older, empty project named **`atg-apply`**
> (ref `xjezpwtjjuzixszmfrln`, `ap-south-1`) that is **not** used by anything.
> It is a leftover from an earlier attempt and is easy to mistake for the real
> thing — the names differ by one character. Migrations have been run against it
> by accident before, which looks like success while production stays broken.
> **Always confirm the ref in the connection string before running anything.**

1. Grab two connection strings from Project Settings → Database (or the
   **Connect** button in the dashboard header):
   - **Transaction pooler** (port `6543`) — use this for `DATABASE_URL` in
     Vercel. Serverless functions spin up many concurrent instances; the pooler
     prevents exhausting Postgres' connection limit. **This one cannot run
     migrations** — Prisma needs advisory locks that a transaction pooler does
     not hold across statements.
     ```
     postgresql://postgres.jlfyewnowimoetemzhlt:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres
     ```
   - **Session pooler** (same host, port `5432`) — use this for every migration
     command, both `prisma migrate dev` locally and `prisma migrate deploy`
     against production. See "Applying migrations to production" below.
     ```
     postgresql://postgres.jlfyewnowimoetemzhlt:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
     ```

   The **direct** connection (`db.<ref>.supabase.co:5432`) also works for
   migrations, but Supabase serves that host over IPv6 only unless the IPv4
   add-on is enabled, so it times out from most ISPs and CI runners. The session
   pooler above is the IPv4-reachable equivalent — note the username takes the
   `postgres.<project-ref>` form rather than plain `postgres`.

   Percent-encode special characters in the password (`@` → `%40`,
   `#` → `%23`), and single-quote the URL in your shell so `$` and `!` survive.
2. Apply the migrations that already exist in `prisma/migrations/` (the old
   MySQL migrations were deleted — they can't run against Postgres, so the
   Postgres baseline was regenerated and is committed):
   ```bash
   cd atg_backend
   DATABASE_URL="<session-pooler-string>" npx prisma migrate deploy
   ```
   Only run `prisma migrate dev` when you are *authoring* a new migration
   locally. It can reset the database, so never point it at production.
3. Seed if needed: `npx prisma db seed`.

### Applying migrations to production — now part of the build

The deploy pipeline applies migrations. Vercel runs the `vercel-build` script,
which is `prisma generate && node scripts/migrateOnDeploy.js`. Before this
existed, `postinstall` ran `prisma generate` alone — regenerating the client
without touching the database — so merging a PR that added a migration shipped
code expecting columns the database did not have, and every query touching them
answered `The column X does not exist in the current database` while the
deployment itself looked healthy.

**The connection matters, which is why this goes through a script rather than a
bare `prisma migrate deploy`.** Prisma holds an advisory lock for the duration of
a migration, and Supabase's transaction pooler (port `6543`) cannot hold one — it
hands each statement to a different backend. `DATABASE_URL` on Vercel *is* that
pooler, so it must not be used for migrations. `scripts/migrateOnDeploy.js`
therefore:

- resolves the connection from `MIGRATE_DATABASE_URL`, `POSTGRES_URL_NON_POOLING`
  or `DIRECT_URL`, in that order — never from `DATABASE_URL`;
- refuses a string that routes through a transaction pooler (port `6543`, or
  `pgbouncer=true`/`pool_timeout` in the query), rather than migrating through it;
- redacts the password before logging which connection it used;
- **warns without failing** when the connection is missing, is a pooler, or cannot
  be reached — a configuration gap must not block deploys that add no migration at
  all, which would be a worse outage than the drift it guards against. The warning
  is printed in a banner and tells you how to apply the migration by hand;
- **fails the build** only when a migration actually fails to apply against a
  database it already connected to, because half an applied migration is not
  something a redeploy fixes.

Because a missing variable only warns, the enforcing gate is the **Migration
status** check in `.github/workflows/deploy.yml`. That check is a no-op unless the
`MIGRATE_DATABASE_URL` repository secret is set — it exits 0 with a warning and a
green tick. Set that secret to the session pooler string; otherwise a PR adding a
migration passes CI without anything having verified production.

With the Supabase integration, `POSTGRES_URL_NON_POOLING` is already provided —
confirm it is exposed to this project's **build** environment.

One caveat: the integration usually sets `POSTGRES_URL_NON_POOLING` to the
*direct* host (`db.<ref>.supabase.co:5432`), which Supabase serves over IPv6 only
unless the IPv4 add-on is enabled, so it can time out from a build runner. That
surfaces as a failed build rather than a silent skip. If it happens, set
`MIGRATE_DATABASE_URL` to the IPv4-reachable **session pooler** string
(`aws-0-ca-central-1.pooler.supabase.com:5432`) — it is checked first and wins.

Before pointing anything at production, **check the project ref in your
connection string is `jlfyewnowimoetemzhlt`.** The lookalike `atg-apply` project
will happily accept the migration and report success while production stays
broken.

To apply migrations by hand — to recover a deployment that shipped before this
script existed, or to migrate without redeploying:

```bash
cd atg_backend
DATABASE_URL="<session-pooler-string>" npx prisma migrate deploy
# or, using the same resolution rules as the build:
POSTGRES_URL_NON_POOLING="<session-pooler-string>" npm run db:migrate:deploy
```

To check whether production is up to date at any point:

```bash
cd atg_backend
DATABASE_URL="<session-pooler-string>" npx prisma migrate status
```

Note the ledger table `_prisma_migrations` is what Prisma uses to track which
migrations have run. If the schema was ever created by `prisma db push` or by
hand, that table will be missing or incomplete, and `migrate deploy` will try to
replay the baseline against tables that already exist. In that case reconcile
with `npx prisma migrate resolve --applied <migration_name>` for each migration
already reflected in the schema, rather than editing the table by hand.

## 2. Backend (`atg_backend`) on Vercel

- Root Directory: `atg_backend`
- Framework Preset: Other
- The app is exported from `app.js` and served via `api/index.js`
  (Vercel serverless entrypoint); `vercel.json` rewrites all requests to it.
  `atg_server.js` (with `app.listen`) is for local dev only and isn't used
  on Vercel.
- Required environment variables:
  - `DATABASE_URL` — Supabase **transaction pooler** string (port `6543`) for
    project ref `jlfyewnowimoetemzhlt`. Not the `atg-apply` project, and not the
    session pooler — see "Which project is production" above.
  - `FRONTEND_URL` — optional; extra frontend origin(s), comma-separated, added
    to the CORS allowlist. The production custom domain
    (`https://atgapply.atgconcordia.com`) and this project's generated Cloudflare
    hostnames (`<worker>.<subdomain>.workers.dev`, `<project>.pages.dev`) are
    already allowed by `app.js`, so leaving this unset does not break the
    deployed frontend. Set it when you add another origin — a preview deployment
    or a new custom domain. If you bind a new domain in Cloudflare, prefer adding
    it to `PRODUCTION_ORIGINS` in `app.js` so the allowlist stays in version
    control rather than living only in the dashboard.
  - `SUPABASE_URL` — `https://jlfyewnowimoetemzhlt.supabase.co` for production.
    The URL is public (it pairs with the publishable key), so it is safe to keep
    here; only the service-role key below is a secret. Check the ref matches the
    one in `DATABASE_URL` — pointing storage and the database at different
    projects is a failure that surfaces only once uploads are exercised.
  - `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API. Required for file
    uploads; keep it server-side only, it bypasses row-level security.
  - `SUPABASE_STORAGE_BUCKET` — optional, defaults to `uploads`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` — both required; login and registration
    fail without them. Note the name is `JWT_SECRET`, not `JWT_ACCESS_SECRET`
    (see `utils/token.util.js`). Optional: `JWT_ACCESS_EXPIRES_IN` (default
    `15m`), `JWT_REFRESH_EXPIRES_IN` (default `7d`).
  - `GOOGLE_CLIENT_ID` / `MICROSOFT_CLIENT_ID` — required only for the social
    sign-in providers you enable. `MICROSOFT_TENANT_ID` is optional and
    restricts sign-in to a single organisation when set. These are only half the
    configuration — the matching `VITE_*` ids go in Cloudflare's build settings,
    not GitHub secrets. [SOCIAL-SIGNIN.md](SOCIAL-SIGNIN.md) walks through both
    consoles and all six variables.
  - See the env block in [SETUP.md](SETUP.md#4-manual-setup-if-you-skip-the-script-or-it-fails-partway)
    for the full list: email, SMS, social sign-in, Apify, etc. (The root
    `.env.example` covers only the legacy Docker Compose database variables.)
- Build command: not required — Vercel runs the `vercel-build` script in
  `atg_backend/package.json`, which runs `prisma generate` and then applies
  pending migrations (see *Applying migrations to production* above).
- `POSTGRES_URL_NON_POOLING` must be available to the **build** environment, not
  just at runtime: the migration step fails the build without it.

### Cross-site auth

The frontend and API are on different sites (Cloudflare and Vercel), so the
refresh-token cookie is set with `SameSite=None; Secure` in production —
`SameSite=Lax` would make browsers withhold it, which breaks session restore on
reload and silently breaks every access-token refresh. This means production
auth requires HTTPS on both sides. Locally it stays `Lax`.

### File uploads

`middlewares/upload.middleware.js` streams uploads to Supabase Storage (bucket
`uploads`) via `config/storage.js`, because Vercel's filesystem is read-only
outside `/tmp` and is discarded between invocations. Read the resulting URL
through `utils/fileUrl.js` rather than building an `/uploads/...` path by hand.

When `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are absent the middleware falls
back to local disk, so local development needs no cloud setup. Rows written
before this migration hold relative `/uploads/...` paths and are still served by
the static mount in `app.js`.

### Known gaps not yet migrated

- **Long-running requests**: `apify-client` scrape calls in
  `modules/anonymous-discovery/` should be checked against Vercel's function
  execution time limit (10s Hobby / 60s+ Pro) if scrapes can run long.

## 3. Frontend (`atg_frontend`)

- Root Directory: `atg_frontend`
- Framework Preset: Vite
- Environment variable: `VITE_API_URL` → your backend's deployed URL + `/api`
  (e.g. `https://your-backend.vercel.app/api`)
