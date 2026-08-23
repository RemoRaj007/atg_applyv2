# Decision Log

Append-only. Never edit or delete an entry -- the record of what you believed
and when is how you learn to predict better. To reverse a decision, add a new
entry that supersedes it, then set the old entry's Status field (the only edit
ever permitted).

Format:

## D-0001 — <decision, imperative>
Date: YYYY-MM-DD   Lane: <lane>   Status: accepted
Rationale: <one or two lines>
Rejected: <options not taken, and why>
Reversal cost: <low | medium | high — what undoing this would take>
Revisit when: <a condition, not a date>

---


## D-0001 — Rotate refresh tokens and revoke them server-side via a per-user jti
Date: 2026-08-22   Lane: Security   Status: accepted
Rationale: Logout previously only cleared the browser cookie; a stolen refresh
token stayed valid for its full 7-day life. Storing the jti of the one valid
token on User lets /refresh reject replay and lets logout/password-reset end a
session for real. Required for any honest answer to a SOC2/ISO 27001 auditor
asking "does logout revoke access?".
Rejected: (a) stateless-only — cannot revoke, which was the defect; (b) a
separate Session table — correct for multi-device, but a schema and query
change well beyond the fix, deferred to D-0002's revisit condition.
Reversal cost: low — drop the column and the jti check; tokens keep working.
Revisit when: multi-device support is needed (see A-0001), or session listing
("log out my other devices") is requested.

## D-0002 — Hash reset and verification tokens at rest with SHA-256, not Argon2
Date: 2026-08-22   Lane: Security   Status: accepted
Rationale: These are 32-byte crypto.randomBytes values, not user-chosen
passwords. Their entropy already defeats brute force, so the slow-hash property
Argon2 buys is irrelevant, while its cost would be paid on every verification
click. SHA-256 removes the DB-read-to-account-takeover path at no latency cost.
Rejected: Argon2 (latency for no threat-model gain); plaintext (the defect).
Reversal cost: low, but reverting re-opens the finding.
Revisit when: token generation ever moves to a lower-entropy or user-supplied value.

## D-0003 — Split Supabase connections: pooler 6543 at runtime, session 5432 for migrations
Date: 2026-08-22   Lane: DevOps/SRE   Status: accepted
Rationale: Serverless spawns many concurrent instances and exhausts direct
connections, so runtime needs the transaction pooler. But that pooler cannot
hold Prisma's advisory lock across statements, so migrations must use a session
connection. The direct host is IPv6-only and unreachable from build runners,
making the session pooler (not the direct host) the correct migration target.
Rejected: one connection string for both — fails in one direction or the other,
and did, repeatedly, before this was made explicit.
Reversal cost: high — this is the shape of every deploy and CI job.
Revisit when: leaving Supabase, or its IPv4 add-on is enabled project-wide.

## D-0004 — Model the profile questionnaire as DB rows, not frontend constants
Date: 2026-08-22   Lane: Architect   Status: accepted
Rationale: 20 chapters / 172 questions live in ProfileSection + ProfileColumn,
seeded from data/profile-catalog.csv. Lets the catalogue change without a
deploy. Repeatable groups (education, employment, project, reference) store one
copy of each question and separate entries by ProfileValue.repeatIndex, so a
candidate is not capped at the catalogue's fixed slot count.
Rejected: hard-coded steps (the previous eight-step form) — required a deploy per
wording change and capped repeatable entries structurally.
Reversal cost: high — answers are keyed by column id.
Revisit when: questions need per-candidate conditional branching.

## D-0005 — Accept the Prisma CLI dev-dependency CVEs rather than force-downgrade
Date: 2026-08-22   Lane: Risk & Debt   Status: accepted
Rationale: prisma / @prisma/config / deepmerge-ts carry high-severity advisories
whose only npm-offered fix is `--force` down to prisma@6.12.0 — a breaking major
downgrade from the pinned ^7.8.0. The chain is build-time tooling with no
untrusted input, so the downgrade's blast radius exceeds the risk it removes.
All runtime-reachable advisories were patched.
Rejected: `npm audit fix --force` (breaks the schema toolchain); ignoring audit
entirely (loses the signal for genuinely reachable CVEs).
Reversal cost: low.
Revisit when: Prisma ships a 7.x with the advisories cleared — recheck monthly.
