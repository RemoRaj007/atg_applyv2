# Assumptions

Every ASSUMED entry from every handoff lands here. Review at each release gate
and mark each row validated, open, or WRONG.

The WRONG rows are the most valuable in the project -- they are your only
honest sample of how your judgement fails.

| ID | Assumption | Lane | Date | Status | Notes |
|----|-----------|------|------|--------|-------|

| A-0001 | Users only ever hold one active session. | Security | 2026-08-22 | **CLOSED — was WRONG** | Confirmed wrong by code reading before it reached users. Replaced by the per-device RefreshSession table (D-0006, migration 20260823113000). Kept as the log's first genuine WRONG entry: the single-column design looked correct in isolation and only failed once someone asked what a second device would do. |
| A-0002 | The 3 accepted Prisma dev-tooling CVEs are genuinely unreachable at runtime. | Risk & Debt | 2026-08-22 | OPEN | Rests on the chain being build-time only. Recheck if Prisma tooling is ever imported by app code. |
| A-0003 | Rollback is possible on both platforms. Never actually executed. | DevOps/SRE | 2026-08-23 | OPEN | Untested rollback is not rollback. Also does not revert migrations — a migrating release is not fully undone by promoting the prior build. |
| A-0004 | No production error alerting exists; failures surface only when a user reports them or someone opens Vercel logs. | DevOps/SRE | 2026-08-23 | **OPEN — fix written and provisioned, not yet deployed** | ops/uptime-monitor closes this, but it is not a monitor until it is deployed and verified (see its README). The KV namespace is created and HEALTH_URL is wired to the real API, so two commands remain: `wrangler secret put ALERT_WEBHOOK_URL` and `wrangler deploy`. Still open until both are run and an alert is confirmed to arrive — a deployed-but-unverified monitor is the failure mode this row exists to name. |
| A-0005 | Migration warn-and-continue is the right default. A config gap lets a deploy ship code ahead of its schema. | DevOps/SRE | 2026-08-22 | OPEN | Deliberate (a broken deploy is worse than drift), but it means green builds do not imply healthy releases. |
