# Local Setup Guide

Step-by-step instructions to get ATG Apply running on your computer for
development or testing.

## 1. What to install first

| Tool | Version | Check with |
|------|---------|------------|
| [Node.js](https://nodejs.org) | 20 LTS or newer | `node --version` |
| npm | comes with Node.js | `npm --version` |
| [Git](https://git-scm.com/) | any recent version | `git --version` |
| MySQL or MariaDB server | MySQL 8+ / MariaDB 10.6+ | can you connect with a DB client? |

You do **not** need Docker for local development — Docker is only used for
production deployment (see [DEVOPS.md](DEVOPS.md)).

If you don't already have MySQL/MariaDB installed:
- Windows: install [XAMPP](https://www.apachefriends.org/) or
  [MySQL Community Server](https://dev.mysql.com/downloads/mysql/), or run
  MariaDB via WSL.
- macOS: `brew install mariadb && brew services start mariadb`
- Linux: `sudo apt install mariadb-server && sudo systemctl start mariadb`

Make sure the server is **running** and you know a username/password that can
create databases (the default `root` user is fine for local dev).

## 2. Clone the repository

```bash
git clone <this-repo-url>
cd atg_apply
```

## 3. Run the setup script

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This script:
1. Checks Node.js/npm are installed.
2. Creates `atg_frontend/.env` from its `.env.example` template (only if it
   doesn't already exist). **`atg_backend/.env` has no template — create it
   by hand first**, see the key list below.
3. Runs `npm install` in both `atg_backend/` and `atg_frontend/`.
4. Generates the Prisma client.
5. Creates the database (if it doesn't exist) and applies migrations.
6. Seeds demo data — **automatically skipped if the database already has
   data**, so re-running the script is always safe.

If it stops with a database error, open `atg_backend/.env` and fix
`DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` to match your
local MySQL/MariaDB server, then re-run the script (or continue manually,
step 4 below).

### Creating atg_backend/.env by hand

Create `atg_backend/.env` with these keys (fill in real values — at minimum
`DB_PASSWORD` for your local MySQL/MariaDB, and generate the two JWT
secrets):

```ini
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=atg_apply1

# Generate each with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173,http://localhost:5174

APIFY_API_KEY=

SMS_API_URL=
SMS_SID=
SMS_USERNAME=
SMS_PASSWORD=

EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM="ATG Apply <no-reply@atgapply.com>"

GOOGLE_CLIENT_ID=
```

## 4. Manual setup (if you skip the script, or it fails partway)

```bash
# Backend
cd atg_backend
# create .env by hand first — see "Creating atg_backend/.env by hand" above
npm install
npm run db:generate           # generate Prisma client
npm run db:migrate            # create tables
npm run db:seed               # seed demo data (skips if DB already has data)

# Frontend (new terminal)
cd atg_frontend
cp .env.example .env
npm install
```

## 5. Start the app

```bash
# Terminal 1
cd atg_backend
npm run dev        # API on http://localhost:5000

# Terminal 2
cd atg_frontend
npm run dev         # SPA on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## 6. Log in and test

All seeded accounts share the password **`Password123!`**:

| Role | Email |
|------|-------|
| Admin | `admin@atg.com` |
| Operator | `operator1@atg.com` … `operator5@atg.com` |
| Candidate | `candidate1@atg.com` … `candidate10@atg.com` |

Quick sanity checks:
- `http://localhost:5000/` should respond with "ATG Apply Backend API … is
  running".
- Log in as `candidate1@atg.com` and confirm jobs/scholarships/applications
  show up.
- Log in as `operator1@atg.com` and confirm you can see candidate
  applications to process.

## 7. Re-seeding

The seed is idempotent: `npm run db:seed` (in `atg_backend/`) does nothing if
the database already has users. To wipe everything and start over with a
fresh dataset:

```bash
cd atg_backend
npm run db:seed:force
```

**Warning:** this deletes all existing data in your local database.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Database connection error` / server won't start | Confirm MySQL/MariaDB is running and the `DB_*` values in `atg_backend/.env` are correct. |
| Seed script errors with "table doesn't exist" | Run `npm run db:migrate` first. |
| Frontend can't reach the API / CORS errors | Check `VITE_API_URL` in `atg_frontend/.env` and `FRONTEND_URL` in `atg_backend/.env` match the ports you're actually using. |
| Changed `atg_frontend/.env` but nothing changed | Restart `npm run dev` — Vite only reads env files at startup. |
| Port 5000 or 5173 already in use | Change `PORT` in `atg_backend/.env`, or run `npm run dev -- --port <n>` for the frontend, and update the corresponding URL env vars. |
