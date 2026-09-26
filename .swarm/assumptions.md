# Assumptions

Every ASSUMED entry from every handoff lands here. Review at each release gate
and mark each row validated, open, or WRONG.

The WRONG rows are the most valuable in the project -- they are your only
honest sample of how your judgement fails.

| ID | Assumption | Lane | Date | Status | Notes |
|----|-----------|------|------|--------|-------|

| A-0001 | Users only ever hold one active session. | Security | 2026-08-22 | **CLOSED — was WRONG** | Confirmed wrong by code reading before it reached users. Replaced by the per-device RefreshSession table (D-0006, migration 20260823113000). Kept as the log's first genuine WRONG entry: the single-column design looked correct in isolation and only failed once someone asked what a second device would do. |
| A-0002 | The 3 accepted Prisma dev-tooling CVEs are genuinely unreachable at runtime. | Risk & Debt | 2026-08-22 | **CLOSED — moot** | No longer needs to hold: the CVEs are fixed via overrides (D-0015), so reachability is no longer the defence. |
| A-0003 | Rollback is possible on both platforms. Never actually executed. | DevOps/SRE | 2026-08-23 | OPEN | Untested rollback is not rollback. Also does not revert migrations — a migrating release is not fully undone by promoting the prior build. |
| A-0004 | No production error alerting exists; failures surface only when a user reports them or someone opens Vercel logs. | DevOps/SRE | 2026-08-23 | **OPEN — deploy automated, awaiting one secret** | Deploy is now `.github/workflows/uptime-monitor.yml`: add the CLOUDFLARE_API_TOKEN secret (and ALERT_WEBHOOK_URL) and it deploys, sets the webhook and calls the monitor to prove it answers. Still open until that run is green and one alert has actually arrived. |
| A-0005 | Migration warn-and-continue is the right default. A config gap lets a deploy ship code ahead of its schema. | DevOps/SRE | 2026-08-22 | OPEN | Deliberate (a broken deploy is worse than drift), but it means green builds do not imply healthy releases. |
| A-0006 | DeepSeek V4 Pro follows the "data, not instructions" fence well enough that injected postings rarely steer a draft. | AI/LLM | 2026-09-26 | **OPEN — untested** | Two eval cases attack it, but the eval has never been run: the sandbox cannot reach NVIDIA. Harmless if wrong (D-0013: output never acts), but it would degrade drafts. Run `ai-eval` once the secret exists. |
| A-0007 | A candidate reviews an AI draft before sending it, so an invented fact the eval misses is caught by a human. | AI/LLM | 2026-09-26 | OPEN | The UI warns and counts placeholders; it cannot make anyone read. The eval catches invented years/percentages only. |
| A-0008 | The production database does not contain `admin@atg.com` with the seed password. | Security | 2026-09-26 | **OPEN — could not verify** | If it does, production was admin-takeover-able by anyone for ~3 weeks via the demo button. Check the User table and `LogEntry` for admin logins from 2026-09-03 on. The Supabase connector failed to connect this session, so this was not checked. |
