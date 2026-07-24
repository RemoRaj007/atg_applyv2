# Deploying to Vercel + Supabase

This project's backend now targets Postgres (Supabase) via Prisma and runs as
a Vercel serverless function; the frontend deploys to Vercel (or Cloudflare
Pages) as a static Vite build. This replaces the previous MariaDB + Docker
Compose + VPS setup for production.

## 1. Supabase

1. Create a Supabase project and grab two connection strings from
   Project Settings → Database:
   - **Pooled** (port `6543`, `?pgbouncer=true`) — use this for `DATABASE_URL`
     in Vercel. Serverless functions spin up many concurrent instances; the
     pooler prevents exhausting Postgres' connection limit.
   - **Direct** (port `5432`) — only needed locally when running
     `prisma migrate dev`, since migrations require a non-pooled connection.
2. Generate the initial Postgres migration (the old MySQL migrations were
   deleted — they can't run against Postgres):
   ```bash
   cd atg_backend
   DATABASE_URL="<direct-connection-string>" npx prisma migrate dev --name init
   ```
3. Seed if needed: `npx prisma db seed`.

## 2. Backend (`atg_backend`) on Vercel

- Root Directory: `atg_backend`
- Framework Preset: Other
- The app is exported from `app.js` and served via `api/index.js`
  (Vercel serverless entrypoint); `vercel.json` rewrites all requests to it.
  `atg_server.js` (with `app.listen`) is for local dev only and isn't used
  on Vercel.
- Required environment variables:
  - `DATABASE_URL` — Supabase **pooled** connection string
  - `FRONTEND_URL` — your deployed frontend origin(s), comma-separated
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (see `.env.example`/SETUP.md for the full list: email, SMS, Google auth, Apify, etc.)
- Build command: `npm run db:generate` (runs `prisma generate`) — set this as
  the Vercel "Build Command" so the Prisma client is generated for the
  serverless bundle.

### Known gaps not yet migrated

- **File uploads**: `middlewares/upload.middleware.js` still writes to local
  disk (`atg_backend/uploads/`), which does not persist across Vercel
  invocations/deploys. Move this to Supabase Storage before relying on
  uploads in production.
- **Logging**: `config/atg_logger.js` still uses `winston-daily-rotate-file`,
  which writes to `atg_backend/logs/` — also non-persistent on Vercel. Logs
  will still show up via `console.log` output in Vercel's function logs, but
  file-based log retention/rotation won't work until this is swapped to
  console-only transports in production.
- **Long-running requests**: `apify-client` scrape calls in
  `modules/anonymous-discovery/` should be checked against Vercel's function
  execution time limit (10s Hobby / 60s+ Pro) if scrapes can run long.

## 3. Frontend (`atg_frontend`)

- Root Directory: `atg_frontend`
- Framework Preset: Vite
- Environment variable: `VITE_API_URL` → your backend's deployed URL + `/api`
  (e.g. `https://your-backend.vercel.app/api`)
