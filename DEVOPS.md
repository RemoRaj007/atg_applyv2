# DevOps / Deployment Guide

Audience: whoever provisions and operates the hosting infrastructure for
ATG Apply. For local development setup, see [SETUP.md](SETUP.md) instead.

## Architecture

Three runtime components, run as containers via `docker-compose.yml` at the
repo root:

| Service | Image | Purpose | Exposed port |
|---------|-------|---------|---------------|
| `db` | `mariadb:11` | Application database | not published (internal only) |
| `backend` | built from `atg_backend/Dockerfile` | Express API | `5000` |
| `frontend` | built from `atg_frontend/Dockerfile` (Nginx) | Static SPA build | `80` |

Data persists in named Docker volumes: `db_data` (MariaDB), `backend_uploads`
(user-uploaded files), `backend_logs`.

Deployment model: **single VPS, push-to-deploy over SSH**. GitHub Actions
builds/lints/build-tests the code on every push, then on `main` it SSHes into
the server, pulls the latest commit, and runs `docker compose up -d --build`.
There is no container registry involved — images are built directly on the
VPS.

## 1. Provision the server

Any VPS with at least 2 vCPU / 2GB RAM (Ubuntu 22.04 LTS recommended):

```bash
# Install Docker Engine + Compose plugin (see docs.docker.com for the current script)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # log out/in after this so `docker` works without sudo

# Confirm
docker --version
docker compose version
```

Open inbound ports: `22` (SSH), `80` (HTTP). Add `443` if/when you put TLS in
front of this stack (see "TLS" below — the current compose file only serves
plain HTTP).

## 2. Create a deploy user + SSH key for CI

```bash
# On the server, as a sudo-capable user
sudo adduser deploy
sudo usermod -aG docker deploy
su - deploy

# Generate a dedicated key pair for GitHub Actions (run on your own machine, not the server)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

Append `deploy_key.pub` to `/home/deploy/.ssh/authorized_keys` on the server.
Keep `deploy_key` (the private half) for the GitHub secret below — never
commit it anywhere.

## 3. Clone the repo and create the real env files on the server

```bash
su - deploy
git clone <this-repo-url> atg_apply
cd atg_apply

cp .env.example .env                             # MariaDB provisioning creds
cp atg_frontend/.env.example atg_frontend/.env    # set VITE_API_URL to the public API URL

# atg_backend/.env has no tracked template — create it by hand with the keys
# listed in SETUP.md's "Creating atg_backend/.env by hand" section.
nano atg_backend/.env
```

These three `.env` files are gitignored on purpose — they are created once,
by hand, directly on the server, and never touched by CI. `git pull` will
never overwrite them.

### Values that must differ from local dev

| File | Key | Production value |
|------|-----|-------------------|
| `atg_backend/.env` | `NODE_ENV` | `production` |
| `atg_backend/.env` | `JWT_SECRET` / `JWT_REFRESH_SECRET` | Unique strong values — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never reuse the dev secrets. |
| `atg_backend/.env` | `FRONTEND_URL` | The real public frontend origin(s), e.g. `https://app.yourdomain.com` |
| `atg_backend/.env` | `DB_HOST` | `db` (the compose service name — overridden automatically by `docker-compose.yml`, no need to edit) |
| `atg_backend/.env` | `EMAIL_*` | Real SMTP credentials — don't reuse a throwaway test inbox in production |
| `atg_frontend/.env` | `VITE_API_URL` | The real public API URL, e.g. `https://api.yourdomain.com/api` (baked into the build — changing it requires a rebuild) |
| `.env` (root) | `DB_ROOT_PASSWORD` / `DB_USER` / `DB_PASSWORD` | Strong values, generate with `openssl rand -hex 24`. Must match `DB_NAME`/`DB_USER`/`DB_PASSWORD` in `atg_backend/.env`. |

## 4. First deploy (manual)

```bash
cd atg_apply
docker compose up -d --build
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed     # optional demo data; skips if already seeded
docker compose ps
```

Visit `http://<server-ip>` — you should see the frontend, and
`http://<server-ip>:5000` should respond with the API health message.

## 5. Continuous deployment (GitHub Actions)

Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

- **On every push/PR to `main`**: installs deps, generates the Prisma client,
  lints and builds the frontend. This job must pass before deploy runs.
- **On push to `main` only**: SSHes into the server and runs
  `git pull --ff-only && docker compose up -d --build`, then applies
  migrations and (idempotent) seeding.

Configure these under **Settings → Secrets and variables → Actions** in the
GitHub repo:

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | `deploy` (or whichever user you created in step 2) |
| `DEPLOY_SSH_KEY` | Contents of the **private** key generated in step 2 |
| `DEPLOY_PORT` | SSH port, if not `22` |
| `DEPLOY_PATH` | Absolute path to the clone, e.g. `/home/deploy/atg_apply` |

The deploy job never creates or edits `.env` files on the server — it only
pulls code and rebuilds. If you add a new required env var, you must add it
to the server's `.env` files by hand before the next deploy.

## Operations

**Logs**
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

**Restart a service**
```bash
docker compose restart backend
```

**Run a one-off command in the backend container**
```bash
docker compose exec backend node prisma/seed.js --force   # wipes and reseeds — careful in prod
```

**Database backup**
```bash
docker compose exec db sh -c 'exec mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" atg_apply1' > backup_$(date +%F).sql
```

**Database restore**
```bash
cat backup_2026-07-23.sql | docker compose exec -T db sh -c 'exec mariadb -u root -p"$MARIADB_ROOT_PASSWORD" atg_apply1'
```

**Rollback a bad deploy**
```bash
cd /path/to/atg_apply
git log --oneline -5        # find the last good commit
git checkout <commit-sha>
docker compose up -d --build
```

## TLS / custom domain

`docker-compose.yml` serves plain HTTP on port 80. For a real production
domain, put a reverse proxy in front of it — [Caddy](https://caddyserver.com/)
is the simplest option (automatic Let's Encrypt certificates with a two-line
Caddyfile) — or use Nginx + certbot / Traefik if you prefer. This is
intentionally left out of the compose file since the domain/proxy choice is
environment-specific.

## Security checklist

- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` are unique to this environment, not copied from local dev.
- [ ] `.env`, `atg_backend/.env`, `atg_frontend/.env` are never committed (already covered by `.gitignore`) and have restrictive file permissions on the server (`chmod 600`).
- [ ] `NODE_ENV=production` is set in `atg_backend/.env`.
- [ ] MariaDB's port (`3306`) is not published to the host — confirm with `docker compose config` that `db` has no `ports:` entry (it shouldn't, by default).
- [ ] The `deploy` SSH user's key has no passphrase-less access beyond this server, and is scoped only to what CI needs.
