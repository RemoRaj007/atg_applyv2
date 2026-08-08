# QA, Bug & Security Audit — ATG Apply

Full-pass audit of `atg_backend` (Express 5 / Prisma 7 / Postgres) and
`atg_frontend` (React 19 / Vite), covering access control, input validation,
authentication, file uploads, error handling, dependencies, and the build.

**Date:** 2026-08-02 · **Branch:** `claude/qa-security-testing-6bkww8`

| | |
|---|---|
| Automated tests before | 0 (`"test": "echo \"Error: no test specified\" && exit 1"`) |
| Automated tests after | **250**, all passing (`cd atg_backend && npm test`) |
| Findings | 22 (5 high, 9 medium, 8 low/informational) |
| Fixed in this branch | 18 |
| Documented, not fixed | 4 — see [Known, not fixed](#known-not-fixed) |

Every fixed finding has a regression test that fails against the previous code.

---

## High severity

### H1 — Operators could escalate themselves, or anyone, to admin
`PUT /api/users/:id` picked the broader `adminUpdateUserSchema` for *both* admins
and operators, and `user.service.update` let anyone with the operator role edit
any account. An operator could therefore:

- set `role: "admin"` on their own account (or any account),
- reset a sitting **admin's password** and take the account over,
- create a new admin through `POST /api/users`,
- soft-delete an admin through `DELETE /api/users/:id`.

Nothing beyond an operator login was needed. Fixed in
`modules/users/user.service.js`: operators may only manage
`candidate` / `company` / `visitor` accounts, and may not change a role or set
another account's password — admins keep full control. Self-service edits are
unaffected.

### H2 — Every operator could export every candidate's data
`application.controller.exportCsv` called `applicationService.exportAll()` with
no arguments. The service scopes the query to `requester.staffId` — but only
when it *has* a requester, so the guard silently never ran and the CSV returned
all applications platform-wide: candidate names, email addresses, application
status, and fit scores, for candidates the operator has no relationship with.
Fixed by passing `req.user` (`application.controller.js`).

### H3 — Any file type could be uploaded and served from the app's origin
`upload.middleware.js` set a size limit but no `fileFilter`, and `app.js` served
`/uploads` as plain static files. A candidate could upload `payload.html` or an
SVG through the profile-photo endpoint and get back a URL on the API's own
origin — stored XSS with a self-service delivery mechanism, and equally live from
the public Supabase bucket in production. Fixed with a MIME **and** extension
allowlist (both are client-controlled, so both are checked), plus
`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` and a
sandbox CSP on the static mount.

### H4 — No rate limiting anywhere
`/api/auth/login` accepted unlimited attempts, `/api/auth/forgot-password` sent
an email per request to any address supplied, and `/api/contact` relayed into the
team's inbox without an account. Added `middlewares/rateLimit.middleware.js`
(dependency-free fixed window) and wired per-endpoint budgets: login 10/15 min,
register and reset 10/hour, contact 10/hour, refresh 120/15 min.
**Caveat:** the counter is per warm serverless instance on Vercel, so it raises
the cost of an attack rather than capping it absolutely — a shared store is the
fix if a hard guarantee is needed. The file says so where it matters.

### H5 — 500 responses returned the raw driver error
`error.middleware.js` echoed `err.message` for every status. A Prisma failure
returns the failing query and the database host it could not reach, so an
outage handed the caller internal topology. 4xx messages are still returned
verbatim (they are written for the caller); 5xx is now a generic line, with the
full detail still logged.

---

## Medium severity

### M1 — Companies could read applications that were not theirs
`application.service.getById` guarded with
`requester.role === "company" && application.job && …`. Scholarship applications
and job-link requests carry no `job`, so the condition short-circuited and the
check never ran — a company account could read any candidate's scholarship
application by id. Now uses `application.job?.companyId !== requester.companyId`.

### M2 — The "public" pricing endpoint always returned 401
`payment-option.routes.js` wrapped `authenticate` and called the controller from
its `next` callback, but `authenticate` answers 401 itself and never calls
`next`. Anonymous visitors got 401 instead of the package catalogue. Added a
proper `optionalAuthenticate` middleware (exported from
`atg_authenticate.middleware.js`) that attaches `req.user` when a token is
present and carries on otherwise.

### M3 — Non-numeric ids reached Prisma and produced 500s
Every controller reads ids with `Number(req.params.id)`. `/api/applications/abc`
became `NaN`, which Prisma rejects as an invalid argument — a 500 plus a driver
message where a 400 belongs. Added
`middlewares/validations/objectId.middleware.js` and applied it to every route
with an id segment.

### M4 — `javascript:` URLs accepted as job links
`Joi.string().uri()` places no restriction on scheme, so a candidate could
submit `javascript:…` as a job link. The operator queue renders that value as a
clickable anchor. Schemes are now pinned to http/https, matching what
`job.schema.js` already did for `jobUrl`.

### M5 — Change requests could carry arbitrary database columns
`request.service.approve` did `JSON.parse(request.details)` and passed the result
straight to `userService.update` → Prisma, with no validation at any point and
no schema on `POST /api/requests` either. An operator could file an
innocuous-looking "quota bump" whose details set `role`, `d_status`, or a nested
relation write, and an admin approving it would apply exactly that. Added
`modules/requests/request.schema.js`, validated both at submission and again at
approval (the row may predate the schema).

### M6 — 403 responses published the permission matrix
`authorize` returned ``Role 'candidate' is not in [admin,operator]``, mapping the
role model one probe at a time. It also logged the full `req.user` object —
including the email address — to the database on **every** authorized request.
Both removed; the denial is still logged with full context.

### M7 — SSO-only accounts crashed the password endpoints
`changePassword` and `verifyPassword` call `argon2.verify(user.password, …)`.
Accounts created through Google/Microsoft have `password: null`, and argon2
throws on a null hash — an opaque 500. `login` already handled this; these two
did not. `changePassword` now explains how to set a password;
`verifyPassword` returns false.

### M8 — Unbounded JSON bodies
`express.json()` ran with no limit, so a single request could make the process
buffer an arbitrary payload. Capped at 256 KB — comfortably above the largest
legitimate body (a job description with requirements). Uploads go through multer
and are unaffected.

### M9 — Phone numbers in national format were rejected by the API only
Backend `isValidPhone` required `^\+?[1-9]…`, rejecting any number starting with
0. The frontend's `validatePhone` only counts digits (7–15), so `0771234567` —
the way numbers are printed throughout Sri Lanka — passed client-side validation
and then failed with a 400 from the API. Backend now accepts a leading zero;
length bounds unchanged.

---

## Low / informational

### L1 — Mass assignment on the profile routes *(fixed)*
`user-profile.controller.js` spread `req.body` straight into Prisma on
`updatePersonal`, `addEntity`, and `updateEntity`. `id`, `userId`, `createdAt`,
`updatedAt` and `d_status` are now stripped, so ownership and primary keys can
only come from the session.

### L2 — 404 handler reflected the request path *(fixed)*
`Route ${req.originalUrl} not found` echoed attacker-controlled text back into
the response body. Now a fixed string.

### L3 — `npm audit` *(reported, not auto-fixed)*
- **Backend:** 4 moderate, 1 high — all in the `prisma` CLI's dev-only
  dependency tree (`@hono/node-server`, `valibot`, `fast-uri`). Not reachable
  from the running server; clears with a `prisma` bump.
- **Frontend:** 1 low, 3 high — `postcss` (build-time), `dompurify` (transitive),
  and `react-router` ≥7.12 (an RSC-mode CSRF issue; this app does not use RSC).
  `npm audit fix` resolves postcss and dompurify without a breaking change.
A `npm audit --audit-level=high` step now runs in CI, advisory-only.

### L4 — CORS trusts any `http://localhost:*` origin, with credentials
Deliberate for local development, and a browser will not forge an `Origin`
header — but in production it means any page served from the user's own machine
can make credentialed calls and read the responses. Consider gating the
localhost branch on `NODE_ENV !== "production"`. **Not changed** — it would
break the current local-dev-against-prod-API workflow, which is a call for the
team. Look-alike origins (`https://app.example.com.evil.net`,
`https://atgapplyv2.pages.dev.evil.net`) are correctly rejected; there are tests
for that.

### L5 — Frontend token handling is sound
Access token in memory only, refresh token in an `httpOnly` `SameSite=None;
Secure` cookie, no `dangerouslySetInnerHTML` or `innerHTML` anywhere in `src/`,
`localStorage` used only for theme, language, and a remembered email address.
No action needed.

### L6 — Lint and build are clean
`npm run lint` reports 29 warnings, 0 errors (unused catch bindings, exhaustive-deps,
`only-export-components`). `npm run build` succeeds. The main bundle is
3.6 MB / 1.0 MB gzipped and three PNGs are ~1 MB each — worth code-splitting and
compressing, but not a defect.

### L7 — Password reset tokens are stored unhashed
`resetPasswordToken` is a 32-byte random hex string with a 1-hour expiry, held in
plaintext in the `User` row. Anyone with read access to that column can complete
a reset. Storing a SHA-256 of the token and comparing hashes would close it.
`sanitizeUser` already keeps it out of every API response.

### L8 — Seeded credentials are documented in the README
`Password123!` for all seeded accounts, admin included. Fine for local
development; make sure the seed never runs against production (the deploy
workflow currently runs `npm run db:seed` on the VPS after migrating — it is
idempotent and skips a non-empty database, but it is one flag away from
`--force`).

---

## Known, not fixed

| # | Finding | Why not |
|---|---|---|
| L3 | Dependency advisories | Version bumps deserve their own PR with a build verification; one is a breaking change |
| L4 | CORS localhost allowance | Tightening it changes a workflow the team relies on — their call |
| L7 | Unhashed reset tokens | Needs a migration and a rollout plan for tokens already issued |
| N1 | Quota check is a TOCTOU race | `create` and `confirmApply` read `appsUsed`, then increment in a separate statement. Concurrent requests can both pass the check and overshoot the quota. The fix is a conditional atomic update (`updateMany` with `appsUsed < appsTotal`) or a transaction — a behavioural change worth its own review |

Also worth a follow-up, in rough priority order: a `PaymentOption`-driven price
and `appsCount` on payment creation (today a candidate self-declares
`appsCount`, and approving the slip credits whatever they asked for); pagination
on `GET /api/users`, `/api/applications`, and `/api/jobs`, which all return every
row; and frontend component/E2E coverage, which this pass did not touch.

---

## What the test suite covers

`atg_backend/tests/` — Vitest + Supertest, no database required. The Prisma
client is mocked through `config/db.js`'s own warm-start cache, so the suite
drives the real Express app, real middleware, and real services.

```
tests/
├── setup.js                    Env the app reads at require time
├── helpers/
│   ├── prismaMock.js           Auto-mocking Prisma stand-in
│   └── app.js                  App loader + role fixtures / token minting
├── unit/
│   ├── utils.test.js           parseDuration, sanitizeUser, csv, fileUrl, validators, ApiError
│   ├── middleware.test.js      authenticate, authorize, validate, error, notFound
│   ├── rateLimit.test.js       Windows, per-client keys, header contract
│   └── storage.test.js         Object-key construction, path traversal, upload filter
└── api/
    ├── auth.test.js            Register, login, refresh, logout, reset, social
    ├── access-control.test.js  RBAC matrix, IDOR, privilege escalation, PII scoping
    ├── hardening.test.js       Headers, CORS, body limits, error leakage, rate limits
    └── workflow.test.js        Link-request → fit review → confirm, booking, payments, uploads
```

```bash
cd atg_backend
npm test              # 196 tests
npm run test:watch
```

CI runs the suite as a `test` job that `deploy` depends on, so a failure blocks
the deploy.

---

## Follow-up: admin capability gaps (second pass)

An inventory of what the `admin` role can reach in the UI versus what the API
lets it do turned up several capabilities with no way in:

| Capability | API | UI before | Now |
|---|---|---|---|
| Applications hub | admin sees all; `DELETE /applications/:id` is **admin-only** | none | `/admin/applications` |
| Scholarships | `DELETE /scholarships/:id` is **admin-only** | none | `/admin/scholarships` |
| Payments | `PATCH /payments/:id` confirms a payment and credits quota | none | `/admin/payments` |
| Job link desk | admin may submit fit reviews | none | `/admin/job-links` |
| Candidate directory | admin sees every user | only via User Management | `/admin/candidates` |
| Job discovery | `POST /anonymous-discovery/admin/run/:id` | none | `/admin/anonymous-discovery` |
| **Audit log** | **no endpoint existed** | `logApi` called a route that was never built | `/admin/logs` |

The audit log is the substantive one. `config/atg_logger.js` has been writing
every system, activity and security event into `LogEntry` through
`PrismaLogTransport` since the app was built, and nothing could read it — the
frontend even shipped a `logApi.list()` pointing at `/api/logs`, which returned
404. Added `modules/logs/` (list with filters + pagination, a 7-day summary, and
a CSV export), admin-only because security entries name the accounts behind
failed logins and denied authorizations. 20 tests cover the access rules,
filters, pagination ceiling, and CSV escaping.

The other rows are routing: the pages already branch on role — the router was
doing this for jobs, team capacity and reports, and simply had not been extended
to the rest.

---

## Follow-up: content management (third pass)

Four areas were requested; all four are in. One new backend module
(`modules/content/`) with three tables, three admin pages, and a public read
path the marketing site uses.

### What an admin can now change without a deploy

| Area | Where | Covers |
|---|---|---|
| **Site settings** | `/admin/site-settings` | Name, tagline, logo URL, accent colour, contact email/phone/address/hours, four social links, sign-up toggle, social-login toggle, site-wide banner, default quotas |
| **Site content** | `/admin/site-content` | Every headline and paragraph on Landing, Pricing, How it works, Contact, plus the full Privacy and Terms bodies in Markdown |
| **Email templates** | `/admin/email-templates` | Subject and body for welcome, password reset, reset-for-unknown-address, application status change, and the generic notification email — with a placeholder picker and a preview |
| **In-app catalogs** | existing pages | Jobs, scholarships, skills, job roles, profile schema, payment options, companies — all already had admin pages; the second pass made the missing ones reachable |

### Design decisions worth knowing

- **Text, never HTML.** Content is stored and rendered as plain text or
  Markdown, and no public page uses `dangerouslySetInnerHTML`. A compromised
  admin account cannot turn a content field into stored XSS.
- **URL settings are scheme-checked.** `javascript:` and `data:` are rejected at
  save time, and the footer re-checks before rendering a link — a social URL
  becomes an anchor the public clicks.
- **Email placeholders are allow-listed per template.** Saving `{{frist_name}}`
  fails with the typo named, rather than shipping it verbatim to a candidate.
  Subjects have CR/LF stripped at save *and* at send: an editable subject line is
  a header-injection primitive otherwise.
- **Public reads only return rows flagged `isPublic`.** Operational settings
  (quotas, capacities) stay admin-only, and the page name is validated against a
  fixed list before it becomes a query.
- **Shipped copy is always the fallback.** `usePageContent(page, defaults)` takes
  the bundled strings as its initial state and overlays what the API returns, so
  a failed request or an unseeded database renders the current copy rather than
  a blank page. Same for email: `sendTemplatedEmail` falls back to the literal
  copy each service already had.
- **Defaults seed themselves.** `seedDefaults()` runs on boot and upserts with an
  empty `update`, so it adds what is missing and never overwrites an edit. There
  is also a button in the admin UI.

### Wired vs. not

The public pages are driven by `react-i18next` across **8 locales**. The CMS is
layered *over* that as an override rather than replacing it, so translations are
not lost. Currently reading from the CMS: the **landing hero**, the **footer**
(site name, support email, social links), and the **site-wide banner** (new — it
appears on every marketing page and both signed-in layouts). The remaining
pages still render their i18n strings; their content rows exist and are editable,
but the components have not been switched over. Finishing that is mechanical —
swap `t('key')` for `content('key')` per page — but it needs a decision first on
how an English-only CMS override should interact with the other seven locales.

### Migration

`prisma/migrations/20260802000000_add_content_management/` adds `SiteSetting`,
`ContentBlock` and `EmailTemplate`. Production migrations are a manual step in
this project (see VERCEL.md), so this must be applied before the branch is
deployed:

```bash
cd atg_backend
DATABASE_URL="<session-pooler-string>" npx prisma migrate deploy
```

Until it runs, the content endpoints error and every page falls back to its
shipped copy — the app keeps working, it simply is not editable yet.
