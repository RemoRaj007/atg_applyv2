import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();
const { htmlToText } = await import("../../utils/htmlToText.js");

// ─── Provider fixtures, in each API's documented response shape ────────────

const ARBEITNOW_PAGE = {
  data: [
    {
      slug: "backend-engineer-berlin-123",
      company_name: "Berlin Tech GmbH",
      title: "Backend Engineer (Node.js)",
      description: "<p>Build APIs &amp; services.</p><ul><li>Node.js</li><li>PostgreSQL</li></ul><script>steal()</script>",
      remote: false,
      url: "https://www.arbeitnow.com/jobs/companies/berlin-tech/backend-engineer-berlin-123",
      tags: ["Node.js", "PostgreSQL"],
      job_types: ["full time"],
      location: "Berlin",
      created_at: 1758844800,
    },
    {
      slug: "evil-link",
      company_name: "Evil Co",
      title: "Engineer",
      description: "x",
      url: "javascript:alert(document.cookie)",
      tags: [],
      job_types: [],
      location: "Remote",
      remote: true,
      created_at: 1758844800,
    },
  ],
  links: { next: null },
};

const ADZUNA_PAGE = {
  results: [
    {
      id: "4821",
      title: "Data Analyst",
      description: "Analyse sales data…",
      redirect_url: "https://www.adzuna.de/land/ad/4821",
      created: "2026-09-20T10:00:00Z",
      company: { display_name: "Munich Retail AG" },
      location: { display_name: "München, Bayern" },
      contract_time: "full_time",
      salary_min: 55000,
      salary_max: 65000,
      salary_is_predicted: "0",
    },
    {
      id: "4822",
      title: "Junior Analyst",
      description: "…",
      redirect_url: "https://www.adzuna.de/land/ad/4822",
      created: "2026-09-21T10:00:00Z",
      company: { display_name: "Estimate GmbH" },
      location: { display_name: "Hamburg" },
      salary_min: 40000,
      salary_max: 40000,
      salary_is_predicted: "1",
    },
  ],
};

const JOOBLE_PAGE = {
  totalCount: 1,
  jobs: [
    {
      id: 998877,
      title: "Software Engineer",
      location: "Colombo",
      snippet: "&nbsp;Join our <b>Colombo</b> team...",
      link: "https://jooble.org/desc/998877",
      company: "Lanka Software (Pvt) Ltd",
      updated: "2026-09-24T00:00:00.0000000",
      type: "Full-time",
    },
  ],
};

const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ "content-type": "application/json" }),
  text: async () => JSON.stringify(body),
});

let fetchMock;
// Exact hostnames, never substrings: "arbeitnow.com" is also a substring of
// "arbeitnow.com.evil.net", and CodeQL rightly flags that pattern anywhere.
const HOSTS = { arbeitnow: "www.arbeitnow.com", adzuna: "api.adzuna.com", jooble: "jooble.org" };
const hostOf = (url) => new URL(String(url)).hostname;
const callsTo = (feed) => fetchMock.mock.calls.filter(([url]) => hostOf(url) === HOSTS[feed]);
const createdJobs = () => prisma.job.create.mock.calls.map(([arg]) => arg.data);

const FEED_ENV = ["ADZUNA_APP_ID", "ADZUNA_APP_KEY", "ADZUNA_COUNTRIES", "JOOBLE_API_KEY", "JOOBLE_LOCATIONS", "ARBEITNOW_ENABLED", "ARBEITNOW_VISA_ONLY", "JOB_SYNC_KEYWORDS", "JOB_SYNC_EXPIRE_DAYS", "CRON_SECRET"];

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
  for (const k of FEED_ENV) delete process.env[k];
  fetchMock = vi.fn(async (url) => {
    const host = hostOf(url);
    if (host === HOSTS.arbeitnow) return json(ARBEITNOW_PAGE);
    if (host === HOSTS.adzuna) return json(ADZUNA_PAGE);
    if (host === HOSTS.jooble) return json(JOOBLE_PAGE);
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  prisma.job.create.mockImplementation(async ({ data }) => ({ id: Math.floor(Math.random() * 1e6), ...data }));
  prisma.skill.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
});

afterEach(() => vi.unstubAllGlobals());

const sync = () => request(app).post("/api/jobs/sync-feeds").set(authHeader(ADMIN));

// ─── Sources ───────────────────────────────────────────────────────────────

describe("with no keys configured", () => {
  it("syncs Arbeitnow alone, since it needs no key, and reports the others as unconfigured", async () => {
    const res = await sync();

    expect(res.status).toBe(200);
    expect(callsTo("arbeitnow")).toHaveLength(1);
    expect(callsTo("adzuna")).toHaveLength(0);
    expect(callsTo("jooble")).toHaveLength(0);
    expect(res.body.data.skippedUnconfigured.sort()).toEqual(["adzuna", "jooble"]);
  });

  it("asks Arbeitnow only for visa-sponsored roles by default", async () => {
    await sync();
    expect(callsTo("arbeitnow")[0][0]).toContain("visa_sponsorship=true");
  });
});

describe("mapping and safety", () => {
  it("imports every posting as pending, never approved", async () => {
    await sync();
    expect(createdJobs().length).toBeGreaterThan(0);
    for (const job of createdJobs()) expect(job.status).toBe("pending");
  });

  it("turns HTML descriptions into readable text and drops scripts", async () => {
    await sync();
    const job = createdJobs().find((j) => j.externalId === "backend-engineer-berlin-123");
    expect(job.description).toBe("Build APIs & services.\n• Node.js\n• PostgreSQL");
    expect(job.description).not.toContain("steal");
  });

  // The link is rendered to candidates, so a javascript: URL would be stored XSS.
  it("drops non-http links rather than storing them", async () => {
    await sync();
    const evil = createdJobs().find((j) => j.externalId === "evil-link");
    expect(evil.jobUrl).toBeNull();
  });

  it("attaches Arbeitnow tags as skills and keeps them out of the Job columns", async () => {
    await sync();
    expect(createdJobs().every((j) => !("skills" in j))).toBe(true);
    expect(prisma.skill.create.mock.calls.map(([a]) => a.data.name)).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL"]));
  });

  it("drops Adzuna's estimated salaries and keeps advertised ones", async () => {
    process.env.ADZUNA_APP_ID = "id";
    process.env.ADZUNA_APP_KEY = "key";
    process.env.ADZUNA_COUNTRIES = "de";
    await sync();
    const real = createdJobs().find((j) => j.externalId === "de:4821");
    const estimated = createdJobs().find((j) => j.externalId === "de:4822");
    expect(real).toMatchObject({ salaryMin: 55000, salaryMax: 65000, salaryCurrency: "EUR", company: "Munich Retail AG" });
    expect(estimated).toMatchObject({ salaryMin: null, salaryMax: null, salaryCurrency: null });
  });

  it("searches Jooble for Sri Lanka by default, with the key only in the path", async () => {
    process.env.JOOBLE_API_KEY = "jooble-secret";
    await sync();
    const [url, init] = callsTo("jooble")[0];
    expect(url).toBe("https://jooble.org/api/jooble-secret");
    expect(JSON.parse(init.body).location).toBe("Sri Lanka");
    const job = createdJobs().find((j) => j.externalSource === "jooble");
    expect(job).toMatchObject({ externalId: "998877", location: "Colombo", company: "Lanka Software (Pvt) Ltd" });
    expect(job.description).toBe("Join our Colombo team...");
  });
});

describe("re-running", () => {
  it("updates a posting it has seen before instead of duplicating it, and keeps the operator's decision", async () => {
    prisma.job.findFirst.mockImplementation(async ({ where }) =>
      where.externalId === "backend-engineer-berlin-123" ? { id: 50, status: "rejected" } : null
    );
    const res = await sync();

    const update = prisma.job.update.mock.calls.find(([a]) => a.where.id === 50)[0];
    expect(update.data).not.toHaveProperty("status");
    expect(res.body.data.sources[0]).toMatchObject({ source: "arbeitnow", updated: 1 });
  });

  it("retires only pending, unrefreshed jobs from the synced sources", async () => {
    await sync();
    const { where, data } = prisma.job.updateMany.mock.calls[0][0];
    expect(data).toEqual({ d_status: "expired" });
    expect(where.status).toBe("pending");
    expect(where.externalSource).toEqual({ in: ["arbeitnow"] });
    const ageDays = (Date.now() - where.updatedAt.lt.getTime()) / 86400000;
    expect(Math.round(ageDays)).toBe(30);
  });

  it("does not retire anything when JOB_SYNC_EXPIRE_DAYS=0", async () => {
    process.env.JOB_SYNC_EXPIRE_DAYS = "0";
    await sync();
    expect(prisma.job.updateMany).not.toHaveBeenCalled();
  });
});

describe("failure isolation", () => {
  it("keeps syncing the other sources when one fails, and reports which", async () => {
    process.env.JOOBLE_API_KEY = "k";
    fetchMock.mockImplementation(async (url) => {
      if (hostOf(url) === HOSTS.arbeitnow) return json({ message: "down" }, 503);
      return json(JOOBLE_PAGE);
    });

    const res = await sync();

    expect(res.status).toBe(200);
    const bySource = Object.fromEntries(res.body.data.sources.map((s) => [s.source, s]));
    expect(bySource.arbeitnow).toMatchObject({ ok: false, error: "HTTP 503" });
    expect(bySource.jooble).toMatchObject({ ok: true, imported: 1 });
  });

  it("never puts a provider key in a reported error", async () => {
    process.env.JOOBLE_API_KEY = "jooble-secret";
    fetchMock.mockImplementation(async () => json({}, 403));
    const res = await sync();
    expect(JSON.stringify(res.body)).not.toContain("jooble-secret");
  });
});

describe("keywords", () => {
  it("uses JOB_SYNC_KEYWORDS when set", async () => {
    process.env.JOB_SYNC_KEYWORDS = "nurse, accountant";
    process.env.ADZUNA_APP_ID = "id";
    process.env.ADZUNA_APP_KEY = "key";
    process.env.ADZUNA_COUNTRIES = "gb";
    await sync();
    expect(callsTo("adzuna").map(([u]) => new URL(u).searchParams.get("what"))).toEqual(["nurse", "accountant"]);
  });

  it("otherwise searches the job roles candidates here actually chose", async () => {
    prisma.jobRole.findMany.mockResolvedValue([
      { name: "Software Engineer", _count: { userJobRoles: 12 } },
      { name: "Nobody Wants This", _count: { userJobRoles: 0 } },
    ]);
    const res = await sync();
    expect(res.body.data.keywords).toEqual(["Software Engineer"]);
  });
});

// ─── Access ────────────────────────────────────────────────────────────────

describe("access", () => {
  it.each([["operator", OPERATOR], ["candidate", CANDIDATE]])("manual sync is admin-only — %s refused", async (_n, user) => {
    const res = await request(app).post("/api/jobs/sync-feeds").set(authHeader(user));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets operators see which feeds are configured", async () => {
    const res = await request(app).get("/api/jobs/feeds/status").set(authHeader(OPERATOR));
    expect(res.status).toBe(200);
    expect(res.body.data.feeds.map((f) => f.source)).toEqual(["adzuna", "arbeitnow", "jooble"]);
  });
});

describe("cron endpoint", () => {
  const cron = (auth) => {
    const r = request(app).get("/api/cron/job-sync");
    return auth ? r.set("Authorization", auth) : r;
  };

  // Fail closed: an unset secret must not mean "open to everyone".
  it("refuses every caller when CRON_SECRET is not configured", async () => {
    expect((await cron()).status).toBe(401);
    expect((await cron("Bearer ")).status).toBe(401);
    expect((await cron("Bearer undefined")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a wrong secret and runs with the right one", async () => {
    process.env.CRON_SECRET = "cron-s3cret-value";
    expect((await cron("Bearer wrong")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();

    const ok = await cron("Bearer cron-s3cret-value");
    expect(ok.status).toBe(200);
    expect(ok.body.data.trigger).toBe("cron");
  });
});

describe("htmlToText", () => {
  it("decodes numeric and named entities, and ignores control code points", () => {
    expect(htmlToText("A&#8211;B &euro;5 &#x41; &#7;x")).toBe("A–B €5 A x");
  });

  // Found by the live feed check: a quarter of real Arbeitnow descriptions
  // arrived entity-escaped and came out as literal <p> tags.
  it("converts entity-escaped HTML too, not just real tags", () => {
    expect(htmlToText("&lt;p&gt;We are hiring&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;")).toBe("We are hiring\n• Go");
  });

  it("keeps angle brackets that are prose, not markup", () => {
    expect(htmlToText("<p>Salary &lt; 50k and teams &gt; 5 people</p>")).toBe("Salary < 50k and teams > 5 people");
  });

  it("returns null for empty or non-string input", () => {
    expect(htmlToText("")).toBeNull();
    expect(htmlToText("<p> </p>")).toBeNull();
    expect(htmlToText(undefined)).toBeNull();
  });
});
