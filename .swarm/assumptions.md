# Assumptions

Every ASSUMED entry from every handoff lands here. Review at each release gate
and mark each row validated, open, or WRONG.

The WRONG rows are the most valuable in the project -- they are your only
honest sample of how your judgement fails.

| ID | Assumption | Lane | Date | Status | Notes |
|----|-----------|------|------|--------|-------|

| A-0001 | Users only ever hold one active session. Refresh rotation stores ONE jti per user, overwritten on every login (register/login/refresh/socialLogin), so signing in on a second device silently invalidates the first at its next refresh. | Security | 2026-08-22 | **OPEN — likely WRONG** | Verified in code, not yet in production behaviour. Candidates plausibly use phone + laptop. Fix is a Session table keyed per device (see D-0001 revisit). Symptom would be "keeps logging me out", not an error. |
| A-0002 | The 3 accepted Prisma dev-tooling CVEs are genuinely unreachable at runtime. | Risk & Debt | 2026-08-22 | OPEN | Rests on the chain being build-time only. Recheck if Prisma tooling is ever imported by app code. |
| A-0003 | Rollback is possible on both platforms. Never actually executed. | DevOps/SRE | 2026-08-23 | OPEN | Untested rollback is not rollback. Also does not revert migrations — a migrating release is not fully undone by promoting the prior build. |
| A-0004 | No production error alerting exists; failures surface only when a user reports them or someone opens Vercel logs. | DevOps/SRE | 2026-08-23 | OPEN — known gap | Today's DB outage was found by looking, not by being told. |
| A-0005 | Migration warn-and-continue is the right default. A config gap lets a deploy ship code ahead of its schema. | DevOps/SRE | 2026-08-22 | OPEN | Deliberate (a broken deploy is worse than drift), but it means green builds do not imply healthy releases. |
