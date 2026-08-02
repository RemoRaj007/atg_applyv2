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

### Applying migrations to production — a required manual step

**Nothing in the deploy pipeline runs migrations.** Vercel's `postinstall` runs
`prisma generate` only, which regenerates the client but never touches the
database. Merging a PR that adds a migration therefore ships code that expects
columns the database does not have, and every query touching them fails at
runtime with `The column X does not exist in the current database`.

Migrations are also not run automatically on purpose: `prisma migrate deploy`
needs a **session-mode** (port `5432`) connection, while `DATABASE_URL` on Vercel
is the transaction pooler on port `6543`. Running migrations through a
transaction pooler is unreliable — it cannot hold the advisory locks Prisma uses.

Before running anything, **check the project ref in your connection string is
`jlfyewnowimoetemzhlt`.** The lookalike `atg-apply` project will happily accept
the migration and report success while production stays broken.

So whenever a change adds anything under `prisma/migrations/`, run this yourself
against production, before or immediately after merging:

```bash
cd atg_backend
DATABASE_URL="<session-pooler-string>" npx prisma migrate deploy
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
    restricts sign-in to a single organisation when set.
  - See the env block in [SETUP.md](SETUP.md#4-manual-setup-if-you-skip-the-script-or-it-fails-partway)
    for the full list: email, SMS, social sign-in, Apify, etc. (The root
    `.env.example` covers only the legacy Docker Compose database variables.)
- Build command: not required — `prisma generate` runs from the `postinstall`
  script in `atg_backend/package.json`.

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
