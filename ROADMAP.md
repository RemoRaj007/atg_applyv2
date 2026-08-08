# ATG Apply — Gaps & Roadmap

An audit of what is missing, incomplete, or broken, and the order worth fixing
it in. Every item cites the file it was found in. Items marked **[fixed]** were
resolved in the commit that added this document.

Scope of the audit: all 19 backend modules, 45 frontend pages, the Prisma
schema, CI/deploy config, docs, and every link in the repo.

---

## Fixed in this pass

| Issue | Where |
|---|---|
| Any authenticated user could read any user's profile — including the argon2 password hash and live reset token | `atg_backend/modules/user-profile/user-profile.controller.js` |
| `sanitizeUser` left `resetPasswordToken` / `resetPasswordExpires` in login and refresh responses | `atg_backend/utils/sanitizeUser.js` |
| No `authorize()` on any job-forms route; `saveColumns` wipes a job's form before inserting | `atg_backend/modules/job-forms/job-form.routes.js` |
| `fs.appendFileSync` debug write broke every profile-entity create on Vercel's read-only FS | `user-profile.controller.js` |
| Job form silently dropped `jobUrl`, `fitReason`, `jobRoleId`, `experience`, `locationType`, `skills` | `modules/jobs/job.schema.js`, `job.service.js` |
| `PATCH /jobs/:id/approve` wrote any string to `Job.status` | `modules/jobs/job.routes.js` |
| 61 i18n keys missing from the `en` fallback — four public pages rendered raw key names | `atg_frontend/src/locales/en/translation.json` |

---

## P0 — Security

1. **No rate limiting anywhere.** `/api/auth/login` and `/api/auth/forgot-password`
   are unthrottled; no `express-rate-limit` in `atg_backend/package.json`.
2. **No account lockout.** `auth.service.js:75-95` logs failed logins but never
   counts them; no `failedAttempts` / `lockedUntil` in the schema.
3. **No email verification.** No field, no route, no UI — registration issues
   tokens immediately (`auth.service.js:71`).
4. **Google ID tokens are under-verified.** `auth.service.js:208-214` falls back
   to the `tokeninfo` endpoint with no `aud` check when `GOOGLE_CLIENT_ID` is
   unset, and `email_verified` is never checked at `:220`. An ID token minted
   for any other Google OAuth client is accepted. CI reaches this path —
   `.github/workflows/deploy.yml:43` passes no client ID to the build.
5. **Mock Google login ships in production source.** `AtgLogin.tsx:97-112`
   hand-forges an unsigned JWT when `VITE_GOOGLE_CLIENT_ID` is absent.
6. **Production CORS allows any localhost origin** with `credentials: true`
   (`app.js:60-63`), ungated by `NODE_ENV`. Any page on a user's machine can
   make authenticated calls against production.
7. **IDOR on profile values.** `profile-value.controller.js` `GET /:userId` has
   no ownership or role check. (Same class as the profile leak already fixed.)
8. **Uploads have no type restriction.** `upload.middleware.js:30-33` sets a
   10 MB limit but no `fileFilter`, and files land in a **public** Supabase
   bucket (`config/storage.js:31`) served with their own MIME type — an
   uploaded `.html` is served executable. Path traversal *is* handled.
9. **No refresh-token rotation or revocation.** `logout`
   (`auth.controller.js:38-41`) only clears the cookie, so a stolen refresh
   token stays valid for its full 7 days.
10. **Password-reset emails fall back to `http://localhost:5173`** when
    `FRONTEND_URL` is unset (`auth.service.js:147`). Tokens are single-use, so
    this silently locks the user out.
11. **PII in logs.** `authorize.middleware.js:5` logs the full `req.user` on
    every authorized request, and each line becomes a `LogEntry` row. Unbounded
    growth, no retention policy.
12. **Unvalidated DB strings in `href`.** `AdminCompanies.tsx:145` and
    `AtgAdminDashboard.tsx:684` — a stored `javascript:` value would execute.

## P1 — Correctness and broken features

13. **`prisma/migrations/` is empty** (only `migration_lock.toml`), so
    `npm run db:migrate` is a no-op. It is invoked in
    `.github/workflows/deploy.yml:64`, `SETUP.md:112`, `DEVOPS.md:96` and
    `docker-compose.yml:7` — meaning `npm run setup` cannot provision a
    database. Baseline a migration from the current schema.
14. **Public `/pricing` can never load admin-managed plans.**
    `payment-option.routes.js:9-21` wraps `authenticate` intending optional
    auth, but `atg_authenticate.middleware.js:17-19` responds 401 and returns,
    so the callback never runs. `PricingPage.tsx:103` swallows the error and
    renders hardcoded defaults — making all 497 lines of `AdminPaymentOptions.tsx`
    invisible to the public.
15. **`UserSkill` and `JobSkill` had no write API** — reachable only from
    `prisma/seed.js`. `JobSkill` is now written by the job form; **`UserSkill`
    still has none**, so the candidate side of fit-scoring works only on seeded
    data.
16. **`AIOperator.runFrequency` is decorative.** No cron, no scheduler, no
    `setInterval` anywhere in the backend — anonymous discovery only runs when
    someone clicks the button.
17. **Anonymous discovery returns fabricated jobs by default.**
    `anonymous-discovery.service.js:295-310` generates
    `https://mock-market-jobs.atgapply.com/job/N` URLs that the UI renders as
    live links (`AnonymousJobDiscovery.tsx:519`).
18. **Four orphan routes** ship working components nothing links to:
    `/operator/jobs/new`, `/candidate/docs`, `/operator/anonymous-discovery`,
    `/operator/team-capacity` (`routes/atg_index.tsx:118,126,129,160`). Add
    entries to `components/layout/navConfig.ts`.
19. **`LogEntry` is write-only.** Every log line inserts a row
    (`utils/PrismaLogTransport.js`) but no route reads it.
    `atg_frontend/src/api/logApi.ts` calls `GET /logs`, which does not exist,
    and the module is imported by nothing. Either build the admin log viewer or
    delete both.
20. **Two stub pages** are shipped as `<ComingSoon/>`:
    `CandidateDocuments.tsx`, `CandidateSupport.tsx`.
21. **`VisitorDashboard.tsx`** (21 lines) is a static card with no data or links.
22. **Dead code:** `utils/apify.service.js` (imported once, never called),
    `src/i18n/translations.ts` (490 lines, imported by nothing),
    `application.schema.js:23-25` (`confirmApplySchema` never wired to a route).
23. **`axios` is required but not declared** in `atg_backend/package.json`
    (used in `sms.service.js`, `anonymous-discovery.service.js`); it resolves
    only transitively. Conversely `apify-client` is declared and never imported.

## P2 — Scale and robustness

24. **No pagination on any list endpoint.** Every `findMany` in
    `atg_backend/modules` is unbounded except one `take: 10`
    (`job.service.js:159`). `GET /api/jobs` additionally runs fit-scoring over
    the entire table on every candidate request. All search, sort and filter is
    client-side, so the browser downloads the full table each time.
25. **`request.service.js:19-40` issues one query per row** (N+1).
26. **Notification fan-out sends one synchronous SMTP message per user**
    inside the request (`notification.service.js:72,87`); a `notifyRoles(["candidate"])`
    on job approval will time out on Vercel as the user table grows. No queue.
27. **Missing validation on 11 modules' write routes** — companies, skills,
    jobRoles, profile-columns, profile-values, job-forms, payment-options,
    requests, user-profile (all 8), anonymous-discovery (all 5). `user-profile`
    `addEntity`/`updateEntity` spread `req.body` straight into Prisma.
28. **`jobRoles` `POST /`** is open to any authenticated user and accepts a
    client-supplied `status`, so a candidate can create an `active` role.
29. **Inconsistent response envelopes.** `user-profile.controller.js` returns
    `{message, record}` / `{error}` and `anonymous-discovery` returns a flat
    `{status, data}`, against the `{status, message, data}` from
    `utils/apiResponse.js` that the frontend's `handleApi` expects.
30. **~30 swallowed `.catch(() => {})`** across the services, plus five raw
    `console.error` calls that bypass Winston and never reach `LogEntry`.
31. **No request/correlation ID, no HTTP access log, no metrics or APM.**

## P3 — Product and quality

32. **Accessibility is effectively absent** — 5 ARIA attributes across 24k
    lines of frontend. Modals (`ConfirmModal.tsx`, `ViewModal.tsx`) have no
    `role="dialog"`, no focus trap, no Escape handling; tables have no scope or
    caption; icon-only buttons have no accessible name.
33. **No React error boundary** — a render throw whites out the whole app.
34. **Missing loading states** on `CandidateDashboard.tsx`,
    `OperatorDashboard.tsx`, and `PricingPage.tsx`.
35. **i18n coverage is thin.** Only 18 of 45 pages call `useTranslation`; the
    entire operator and admin surface is hardcoded English. The five non-EN
    locales (`fr, es, ru, ta, si`) lack all 91 app-shell keys and fall back to
    English; `en, ar, zh` lack the four public-page namespaces — now supplied
    for `en`, still absent for `ar` and `zh`.
36. **Zero automated tests.** See `TESTING.md` for the strategy and the
    suggested adoption order.
37. **No real payment gateway** — payments are manual bank-transfer slips
    reviewed by an operator.
38. **SMS is implemented but called from exactly one place**
    (`application.service.js:405`, staff only); candidates never receive SMS
    despite `User.phone` being collected.
39. **Emails are plain text only**, no templates, no branding, no unsubscribe.

## P4 — Documentation drift

40. `README.md` and `DEVOPS.md` still describe MySQL/MariaDB + Docker Compose
    as the deployment path, and `docker-compose.yml:12` still provisions
    `mariadb:11`, but the backend is Postgres-only (`@prisma/adapter-pg`).
    Following `DEVOPS.md` end to end produces a broken stack.
41. `VERCEL.md:48` points at `.env.example` for "email, SMS, Google auth,
    Apify" variables; that file contains only four `DB_*` Docker vars. There is
    no `atg_backend/.env.example` at all — the real list exists only in
    `SETUP.md:70-102`.
42. `README.md` links to neither `VERCEL.md` nor `TESTING.md`.

---

## Suggested order

1. **P0 security** — rate limiting, lockout, the Google verifier, CORS gating,
   the remaining IDOR, upload type restriction.
2. **Migration baseline** (#13) — nothing else schema-shaped is safe until this
   is sorted.
3. **Recover what is already built** — the four orphan routes (#18), the
   pricing endpoint (#14), `UserSkill` writes (#15). Cheapest value per hour.
4. **Validation sweep** (#27, #28) across the 11 unvalidated modules.
5. **Pagination** (#24) before the tables get large enough to matter.
6. **Tests** — start with the auth and applications endpoints per `TESTING.md`.
7. **Accessibility and i18n coverage** (#32, #35).

## Verified non-issues

- Every markdown link and anchor in the repo resolves.
- Every in-app `<Link>` / `navigate()` target has a matching route.
- `wrangler.jsonc`'s SPA fallback wants `dist/index.html`, which looks broken
  against Vite's `atg_index.html` entry — but `atg_frontend/package.json:8`
  copies it after every build. Confirmed present in a real build.
- Express route ordering is correct everywhere (specific routes registered
  before wildcards).
- There are zero `TODO`/`FIXME`/`HACK` comments and no commented-out route
  registrations.
