#!/usr/bin/env bash
# ATG Apply — one-shot setup for a fresh PC (macOS / Linux / Git Bash)
#
# Installs dependencies, creates .env files from the .env.example templates,
# creates the MySQL/MariaDB database, applies migrations, and seeds a demo
# dataset (10 candidates, 5 operators, 20 jobs, 2 scholarships) if the
# database is empty.
#
# Usage:
#   ./setup.sh
#
# Requirements: Node.js 20+, npm, and a running local MySQL/MariaDB server.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf "\n\033[36m==> %s\033[0m\n" "$1"; }
ok()   { printf "  \033[32mOK:\033[0m %s\n" "$1"; }
warn() { printf "  \033[33mWARN:\033[0m %s\n" "$1"; }

step "Checking prerequisites"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not on PATH. Install Node.js 20+ from https://nodejs.org and re-run this script." >&2
  exit 1
fi
ok "Node.js $(node --version)"
ok "npm $(npm --version)"

# ── Backend .env ──────────────────────────────────────────────────
# No template is tracked for this one (it holds real secrets) — create it by
# hand. See SETUP.md's "Creating atg_backend/.env by hand" for the full key list.
if [ ! -f "$ROOT_DIR/atg_backend/.env" ]; then
  warn "atg_backend/.env is missing. Create it by hand before continuing (see SETUP.md) — migrations/seeding below will fail without it."
else
  ok "atg_backend/.env already exists (left untouched)."
fi

# ── Frontend .env ─────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/atg_frontend/.env" ]; then
  cp "$ROOT_DIR/atg_frontend/.env.example" "$ROOT_DIR/atg_frontend/.env"
  ok "Created atg_frontend/.env from the example."
else
  ok "atg_frontend/.env already exists (left untouched)."
fi

step "Installing backend dependencies"
(cd "$ROOT_DIR/atg_backend" && npm install)
ok "Backend dependencies installed."

step "Installing frontend dependencies"
(cd "$ROOT_DIR/atg_frontend" && npm install)
ok "Frontend dependencies installed."

step "Generating Prisma client"
(cd "$ROOT_DIR/atg_backend" && npm run db:generate)

step "Applying database migrations"
if (cd "$ROOT_DIR/atg_backend" && npm run db:migrate); then
  ok "Migrations applied."
else
  warn "Migration failed. Make sure MySQL/MariaDB is running and atg_backend/.env has correct DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME, then run: npm run db:migrate"
fi

step "Seeding database (skipped automatically if it already has data)"
if ! (cd "$ROOT_DIR/atg_backend" && npm run db:seed); then
  warn "Seeding failed — check the database connection and try: npm run db:seed"
fi

printf "\n\033[32mSetup complete!\033[0m\n"
echo "  Start the backend:  cd atg_backend && npm run dev"
echo "  Start the frontend: cd atg_frontend && npm run dev"
echo "  Default login (seeded accounts, password: Password123!): admin@atg.com, operator1@atg.com, candidate1@atg.com"
