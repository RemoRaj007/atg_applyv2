# Testing Strategy — ATG Apply

A reference for the testing types, methodologies, and tooling that apply to this
project, mapped onto the actual codebase (Express/Prisma API in `atg_backend/`,
React + Vite SPA in `atg_frontend/`).

> **Current state:** the repo has no automated test suite yet.
> `atg_backend/package.json` still ships the default
> `"test": "echo \"Error: no test specified\" && exit 1"`, and
> `atg_frontend` has `lint` and `build` but no `test` script. CI
> (`.github/workflows/deploy.yml`) runs install → `prisma generate` → lint →
> build, then deploys on `main`. Everything below marked *Not yet in place*
> describes the target, not what exists today. See
> [Adoption roadmap](#adoption-roadmap) for the suggested order.

---

## 1. Functional testing types

What the system does — behaviour against requirements.

| Type | What it verifies | Where it lands in this repo |
|---|---|---|
| **Unit** | Individual methods in isolation | `utils/` (`parseDuration`, `sanitizeUser`, `validators`, `csv`, `token.util`), and each module's `*.service.js` with Prisma mocked |
| **Component** | An isolated UI module | Single components under `atg_frontend/src/components/` rendered with mocked API/context |
| **Integration** | Connected modules working together | Route → middleware → controller → service → Prisma against a throwaway MariaDB |
| **System** | Whole application end-to-end | Browser drives the SPA against a running API + DB: register → complete profile → apply for a job → operator triages → payment recorded |
| **Sanity** | Narrow check on a specific fix | After a hotfix, exercise only the affected endpoint/screen |
| **Smoke** | Critical build stability | Boot the API, hit `/api` health + login, load the SPA shell. Gate for every deploy |
| **Regression** | Updates didn't break existing behaviour | The accumulated suite, run on every PR |
| **Interface** | Data transmission between layers | Contract of the JSON envelope from `utils/apiResponse.js` / `ApiError.js` vs. what `atg_frontend/src/api/` expects |
| **User acceptance (UAT)** | Client business expectations | Operator/admin walkthroughs of triage, requests, and scholarship flows before release |
| **Beta** | External end-users on prerelease | Limited candidate cohort on a staging deploy before opening applications |

**Highest-value units here** (pure, no I/O, easy first wins):
`utils/parseDuration.js`, `utils/sanitizeUser.js`, `utils/validators.js`,
`utils/csv.js`, `utils/token.util.js`, plus the permission checks under
`middlewares/permissions/` and the schemas under `middlewares/validations/`.

## 2. Non-functional testing types

How well the system does it.

| Type | Focus | Applied here |
|---|---|---|
| **Load** | Behaviour under expected traffic | Job listing + application submission at expected concurrent candidates |
| **Stress** | Past capacity limits | Push until Prisma's connection pool and the DB saturate; confirm failure is graceful, not corrupting |
| **Endurance** | Sustained load over time | Long soak to surface memory growth and leaked DB/file handles |
| **Spike** | Sudden traffic surge | An application deadline: everyone submits in the final hour |
| **Vulnerability** | Scanning for security flaws | `npm audit` in CI, dependency scanning, secret scanning |
| **Penetration** | Simulated active attack | Authenticated role-escalation attempts against operator/admin endpoints; upload abuse via `upload.middleware.js` |
| **Usability** | Friendliness and intuition | Candidate application flow — the longest, most abandonment-prone path |
| **Accessibility** | WCAG compliance | Keyboard nav, labels, and contrast across forms; automated axe pass plus manual screen-reader checks |
| **Compatibility** | Browsers and OS | Latest Chrome/Firefox/Safari/Edge, desktop + mobile viewports |
| **Localization** | Regional adaptation | `atg_frontend/src/i18n/` and `src/locales/` — every key present per locale, no layout breakage on longer strings |

**Project-specific hot spots:** CORS origin handling and `helmet` config in
`atg_backend/app.js`; JWT/refresh-cookie lifetimes; Argon2 password hashing
cost; file uploads (type/size limits, path traversal, and the two storage
backends in `middlewares/upload.middleware.js` — local disk for development,
Supabase Storage in production, since local disk does not persist across
serverless invocations). Both backends need coverage, not just the local one.

## 3. Architecture & structural testing

| Type | Focus | Applied here |
|---|---|---|
| **API** | Programmatic data transfer | Every route under `atg_backend/modules/*/**.routes.js`: status codes, response envelope, auth requirements, validation errors |
| **Database** | Schema, constraints, integrity | `atg_backend/prisma/` — migrations apply cleanly from empty, foreign keys and unique constraints hold, seed (`prisma/seed.js`) is idempotent |
| **UI** | Visual front-end | Rendering, routing (`src/routes/`), and role-gated navigation |
| **Security** | Privacy and authorization | Role/permission matrix: candidate vs. operator vs. admin on every endpoint. No unsanitized user object ever leaves the API |
| **Performance** | Speed and responsiveness | Endpoint latency budgets; N+1 query detection in list endpoints |
| **Scalability** | Growth handling | Pagination and indexing on the large tables (applications, users, jobs) |
| **Reliability** | Failure-free operation | Error handling via `middlewares/error.middleware.js`; no unhandled rejections |
| **Recovery** | Crash restoration | DB restore from backup; container restart via `docker-compose.yml` returns to a serving state |

## 4. Methodologies & approaches

- **Black box** — tests written against the API contract and UI behaviour only.
  The natural default for API and E2E tests here.
- **White box** — full code visibility, driving branch coverage. Use for
  permission middleware and validators, where the branches *are* the risk.
- **Grey box** — partial visibility: black-box requests, but assertions on
  database state afterwards. The right fit for most integration tests here.
- **Manual** — exploratory passes on new screens, UAT, accessibility checks
  that automation can't judge.
- **Automated** — everything that runs in CI on every PR.
- **Agile** — tests written inside the sprint that ships the feature, not after.
- **DevOps (CI/CD)** — extend `.github/workflows/deploy.yml` so tests run
  *before* the deploy job, and a red suite blocks the deploy.
- **Shift-left** — validation and permission tests written alongside the module,
  plus lint/typecheck locally before push.
- **Shift-right** — production monitoring: the Winston logger
  (`config/atg_logger.js`, `utils/PrismaLogTransport.js`) already collects
  runtime signal; add error-rate and latency alerting on top of it.
- **Exploratory** — unscripted bug hunting on each release candidate,
  time-boxed and charter-driven.

## 5. Test-driven frameworks

- **TDD** — tests first, then implementation. Best applied here to `utils/` and
  service-layer logic where the contract is clear up front.
- **BDD** — user-story-shaped specs (`Given a candidate with a complete
  profile / When they submit an application / Then …`). Fits the E2E layer.
- **ATDD** — acceptance criteria agreed with stakeholders before the sprint,
  encoded as the UAT checklist.

## 6. Tooling

Industry-standard options, with the recommendation for this stack in bold.

| Area | Options | Recommended here |
|---|---|---|
| Unit / integration | JUnit, NUnit, Jest, PyTest, Vitest | **Vitest** both sides — it already shares the frontend's Vite config, and it runs the CommonJS backend fine |
| Web UI automation | Selenium, Cypress, **Playwright**, Puppeteer | **Playwright** — cross-browser, and it's preinstalled in this project's CI-style environments |
| Component testing | React Testing Library | **React Testing Library** + Vitest + jsdom |
| Mobile | Appium, Espresso, XCUITest | n/a — no native app; use Playwright's mobile viewport emulation |
| API testing | Postman, SoapUI, RestAssured, Supertest | **Supertest** in CI (no live server needed); Postman collection for manual/QA use |
| Performance / load | Apache JMeter, Gatling, **k6** | **k6** — scripts are JavaScript, so they live next to the rest of the code |
| Test management | Jira, TestRail, Zephyr, Xray | GitHub Issues + PR checks while the suite is small |

## Test data & environments

- **Never test against production.** Integration and E2E runs need their own
  MariaDB — `docker-compose.yml` already provides the image; point tests at a
  separate database name and reset it between runs.
- Migrations first (`npx prisma migrate deploy`), then seed
  (`npm run db:seed`), then tests. `prisma/seed.js` supports `--force` for a
  deterministic reset.
- Secrets stay out of the repo. Test env vars come from CI secrets or a local
  untracked `.env.test`; `.env.example` documents the shape only.
- Uploads in tests write to a temp directory, never `atg_backend/uploads/`.

## Adoption roadmap

Ordered by value-per-effort against the current codebase:

1. **Smoke + API tests** on auth and applications (Vitest + Supertest) — the
   endpoints where a regression is most expensive.
2. **Unit tests** for `utils/` and `middlewares/permissions/` — pure functions
   and the authorization branches.
3. **CI gate** — add a `test` job to `.github/workflows/deploy.yml` that the
   `deploy` job depends on, so failures block the deploy.
4. **Component tests** for the application form and profile screens.
5. **E2E happy path** (Playwright): candidate applies → operator triages.
6. **Non-functional passes** — accessibility, then a k6 load profile for the
   submission-deadline spike.
