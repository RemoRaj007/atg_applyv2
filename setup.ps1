# ATG Apply — one-shot setup for a fresh PC (Windows / PowerShell)
#
# Installs dependencies, creates .env files from the .env.example templates,
# creates the MySQL/MariaDB database, applies migrations, and seeds a demo
# dataset (10 candidates, 5 operators, 20 jobs, 2 scholarships) if the
# database is empty.
#
# Usage:
#   .\setup.ps1
#
# Requirements: Node.js 20+, npm, and a running local MySQL/MariaDB server.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }

Write-Step "Checking prerequisites"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js is not installed or not on PATH. Install Node.js 20+ from https://nodejs.org and re-run this script."
}
Write-Ok "Node.js $(node --version)"
Write-Ok "npm $(npm --version)"

# ── Backend .env ──────────────────────────────────────────────────
# No template is tracked for this one (it holds real secrets) — create it by
# hand. See SETUP.md's "Creating atg_backend/.env by hand" for the full key list.
$backendEnv = Join-Path $root "atg_backend\.env"
if (-not (Test-Path $backendEnv)) {
  Write-Warn "atg_backend\.env is missing. Create it by hand before continuing (see SETUP.md) — migrations/seeding below will fail without it."
} else {
  Write-Ok "atg_backend\.env already exists (left untouched)."
}

# ── Frontend .env ─────────────────────────────────────────────────
$frontendEnv = Join-Path $root "atg_frontend\.env"
$frontendEnvExample = Join-Path $root "atg_frontend\.env.example"
if (-not (Test-Path $frontendEnv)) {
  Copy-Item $frontendEnvExample $frontendEnv
  Write-Ok "Created atg_frontend\.env from the example."
} else {
  Write-Ok "atg_frontend\.env already exists (left untouched)."
}

Write-Step "Installing backend dependencies"
Push-Location (Join-Path $root "atg_backend")
npm install
Pop-Location
Write-Ok "Backend dependencies installed."

Write-Step "Installing frontend dependencies"
Push-Location (Join-Path $root "atg_frontend")
npm install
Pop-Location
Write-Ok "Frontend dependencies installed."

Write-Step "Generating Prisma client"
Push-Location (Join-Path $root "atg_backend")
npm run db:generate

Write-Step "Applying database migrations"
try {
  npm run db:migrate
  Write-Ok "Migrations applied."
} catch {
  Write-Warn "Migration failed. Make sure MySQL/MariaDB is running and atg_backend\.env has correct DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME, then run: npm run db:migrate"
}

Write-Step "Seeding database (skipped automatically if it already has data)"
try {
  npm run db:seed
} catch {
  Write-Warn "Seeding failed — check the database connection and try: npm run db:seed"
}
Pop-Location

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "  Start the backend:  cd atg_backend; npm run dev"
Write-Host "  Start the frontend: cd atg_frontend; npm run dev"
Write-Host "  Default login (seeded accounts, password: Password123!): admin@atg.com, operator1@atg.com, candidate1@atg.com"
