# ATG Apply

A job/scholarship application management platform. Candidates apply for jobs and
scholarships; operators triage and process applications; admins manage the
platform. Backend is a Node/Express API on MySQL/MariaDB via Prisma; frontend
is a React + Vite SPA.

## Tech stack

| Layer    | Stack |
|----------|-------|
| Backend  | Node.js, Express 5, Prisma 7 (MariaDB adapter), Argon2, JWT, Winston |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Database | MySQL / MariaDB |
| Infra    | Docker, Docker Compose, GitHub Actions |

## Project structure

```
atg_apply/
├── atg_backend/     Express API, Prisma schema/migrations, seed script
├── atg_frontend/    React + Vite SPA
├── setup.ps1        One-shot setup for a fresh PC (Windows)
├── setup.sh         One-shot setup for a fresh PC (macOS/Linux)
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

## Getting started

- **Setting this up on your own machine to develop or test?** → [SETUP.md](SETUP.md)
- **Provisioning a server / configuring CI deploys?** → [DEVOPS.md](DEVOPS.md)
- **Deploying the current Vercel + Supabase stack?** → [VERCEL.md](VERCEL.md)
- **Writing or planning tests?** → [TESTING.md](TESTING.md)
- **What the last audit found, and what's still open?** → [QA_REPORT.md](QA_REPORT.md)
- **What's missing or broken, and what to build next?** → [ROADMAP.md](ROADMAP.md)

Fastest path, once prerequisites are installed (see SETUP.md):

```bash
git clone <this-repo>
cd atg_apply
.\setup.ps1     # Windows
./setup.sh      # macOS/Linux

cd atg_backend && npm run dev     # http://localhost:5000
cd atg_frontend && npm run dev    # http://localhost:5173
```

## Environment variables

Never commit real `.env` files:

- `atg_backend/.env` — server port, DB connection, JWT secrets, SMTP, Apify
  key, Google client ID. No template is tracked for this one — create it by
  hand (see [SETUP.md](SETUP.md#4-manual-setup-if-you-skip-the-script-or-it-fails-partway)
  for the full list of keys).
- [atg_frontend/.env.example](atg_frontend/.env.example) — API base URL,
  feature flags, Google client ID
- [.env.example](.env.example) — Docker Compose's MariaDB provisioning
  variables (used only when deploying with `docker-compose.yml`)

## Available scripts

**Backend** (`atg_backend/`)

| Script | Description |
|--------|--------------|
| `npm run dev` / `npm start` | Run the API server |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo data (skips if DB already has users) |
| `npm run db:seed:force` | Wipe all tables and reseed |
| `npm run setup` | generate + migrate + seed in one go |
| `npm test` | Run the Vitest + Supertest suite (no database needed) |

**Frontend** (`atg_frontend/`)

| Script | Description |
|--------|--------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Oxlint |
