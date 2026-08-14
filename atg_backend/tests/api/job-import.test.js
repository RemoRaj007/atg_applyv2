import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

// One posting in the shape Ever Jobs actually returns — the field names below
// are from its JobPostDto and the response envelope its API answered with when
// this was written (count / jobs / cached / deduped / raw_count).
const posting = (overrides = {}) => ({
  id: "li-3693012711",
  site: "linkedin",
  title: "Software Engineer - Early Career",
  companyName: "Lockheed Martin",
  jobUrl: "https://www.linkedin.com/jobs/view/3693012711",
  location: { city: "Sunnyvale", state: "CA", country: "USA" },
  datePosted: "2025-02-07",
  isRemote: false,
  jobType: ["fulltime"],
  compensation: { interval: "yearly", minAmount: 85000, maxAmount: 130000, currency: "USD" },
  description: "By bringing together people that use...",
  skills: ["TypeScript", "React"],
  ...overrides,
});

const everJobsResponds = (body, { ok = true, status = 200 } = {}) => {
  global.fetch = vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
};

const search = (payload = {}) =>
  request(app)
    .post("/api/jobs/import")
    .set(authHeader(ADMIN))
    .send({ searchTerm: "software engineer", siteType: ["linkedin"], ...payload });

let realFetch;

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
  realFetch = global.fetch;
  process.env.EVER_JOBS_URL = "http://ever-jobs.internal:3001";
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.EVER_JOBS_URL;
  delete process.env.EVER_JOBS_API_KEY;
});

describe("POST /api/jobs/import — access", () => {
  it("is admin only: an operator cannot reach third-party boards on our behalf", async () => {
    everJobsResponds({ count: 0, jobs: [] });
    const res = await request(app)
      .post("/api/jobs/import")
      .set(authHeader(OPERATOR))
      .send({ searchTerm: "developer", siteType: ["linkedin"] });
    expect(res.status).toBe(403);
  });

  it("is closed to candidates", async () => {
    const res = await request(app)
      .post("/api/jobs/import")
      .set(authHeader(CANDIDATE))
      .send({ searchTerm: "developer", siteType: ["linkedin"] });
    expect(res.status).toBe(403);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/jobs/import").send({ searchTerm: "x", siteType: ["linkedin"] });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/jobs/import — configuration", () => {
  it("says what is missing when EVER_JOBS_URL is unset, rather than failing obscurely", async () => {
    delete process.env.EVER_JOBS_URL;
    const res = await search();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/EVER_JOBS_URL/);
  });

  it("reports an unreachable aggregator as 502, not as our own 500", async () => {
    global.fetch = vi.fn(async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { name: "FetchError" });
    });
    const res = await search();
    expect(res.status).toBe(502);
  });

  it("reports an aggregator error status as 502", async () => {
    everJobsResponds({ message: "boom" }, { ok: false, status: 500 });
    const res = await search();
    expect(res.status).toBe(502);
  });

  it("sends the API key only when one is configured", async () => {
    everJobsResponds({ count: 0, jobs: [] });
    await search();
    expect(global.fetch.mock.calls[0][1].headers["X-API-Key"]).toBeUndefined();

    process.env.EVER_JOBS_API_KEY = "secret-key";
    everJobsResponds({ count: 0, jobs: [] });
    await search();
    expect(global.fetch.mock.calls[0][1].headers["X-API-Key"]).toBe("secret-key");
  });
});

describe("POST /api/jobs/import — mapping", () => {
  it("maps an aggregated posting onto the Job columns", async () => {
    everJobsResponds({ count: 1, jobs: [posting()] });

    const res = await search();

    expect(res.status).toBe(200);
    const written = prisma.job.create.mock.calls[0][0].data;
    expect(written).toMatchObject({
      title: "Software Engineer - Early Career",
      company: "Lockheed Martin",
      location: "Sunnyvale, CA, USA",
      externalSource: "linkedin",
      externalId: "li-3693012711",
      isRemote: false,
      salaryMin: 85000,
      salaryMax: 130000,
      salaryCurrency: "USD",
      salaryInterval: "yearly",
      source: "ever-jobs",
    });
    expect(written.datePosted).toBeInstanceOf(Date);
  });

  it("imports as pending — a scraped posting never reaches candidates unreviewed", async () => {
    everJobsResponds({ count: 1, jobs: [posting()] });
    await search();
    expect(prisma.job.create.mock.calls[0][0].data.status).toBe("pending");
  });

  it("prefers the apply URL, which is the one a candidate needs", async () => {
    everJobsResponds({
      count: 1,
      jobs: [posting({ applyUrl: "https://apply.example.com/1", jobUrlDirect: "https://direct.example.com/1" })],
    });
    await search();
    expect(prisma.job.create.mock.calls[0][0].data.jobUrl).toBe("https://apply.example.com/1");
  });

  it("records hybrid roles, which isRemote alone cannot express", async () => {
    everJobsResponds({ count: 1, jobs: [posting({ isRemote: true, workFromHomeType: "Hybrid" })] });
    await search();
    expect(prisma.job.create.mock.calls[0][0].data.locationType).toBe("Hybrid");
  });

  it("skips a posting with no title or no stable identity", async () => {
    everJobsResponds({
      count: 3,
      jobs: [posting({ title: "" }), posting({ id: null }), posting({ site: null })],
    });

    const res = await search();

    expect(prisma.job.create).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({ fetched: 3, imported: 0, skipped: 3 });
  });

  it("survives a source that returns nothing", async () => {
    everJobsResponds({ count: 0, jobs: [], cached: false, raw_count: 0 });
    const res = await search();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ fetched: 0, imported: 0 });
  });
});

describe("POST /api/jobs/import — re-running", () => {
  it("updates a posting already imported instead of duplicating it", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 77, externalSource: "linkedin", externalId: "li-3693012711" });
    everJobsResponds({ count: 1, jobs: [posting({ title: "Software Engineer II" })] });

    const res = await search();

    expect(prisma.job.create).not.toHaveBeenCalled();
    expect(prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 77 } })
    );
    expect(res.body.data).toMatchObject({ imported: 0, updated: 1 });
  });

  it("does not re-open a posting an operator already rejected", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 77, status: "rejected" });
    everJobsResponds({ count: 1, jobs: [posting()] });

    await search();

    // status is not among the refreshed columns at all.
    expect(prisma.job.update.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("dedupes on source+id rather than on the URL, which carries tracking parameters", async () => {
    everJobsResponds({ count: 1, jobs: [posting()] });
    await search();
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { externalSource: "linkedin", externalId: "li-3693012711" },
    });
  });
});

describe("POST /api/jobs/import — skills", () => {
  it("reuses an existing Skill row rather than growing a duplicate catalog", async () => {
    prisma.job.create.mockResolvedValue({ id: 5 });
    prisma.skill.findUnique.mockResolvedValue({ id: 3, name: "TypeScript" });
    everJobsResponds({ count: 1, jobs: [posting({ skills: ["TypeScript"] })] });

    await search();

    expect(prisma.skill.create).not.toHaveBeenCalled();
    expect(prisma.jobSkill.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId_skillId: { jobId: 5, skillId: 3 } } })
    );
  });

  it("creates a skill only when the name is genuinely new", async () => {
    prisma.job.create.mockResolvedValue({ id: 5 });
    prisma.skill.findUnique.mockResolvedValue(null);
    prisma.skill.create.mockResolvedValue({ id: 9, name: "Rust" });
    everJobsResponds({ count: 1, jobs: [posting({ skills: ["Rust"] })] });

    await search();

    expect(prisma.skill.create).toHaveBeenCalledWith({ data: { name: "Rust" } });
  });
});

describe("POST /api/jobs/import — request validation", () => {
  it("rejects a request with no source to search", async () => {
    const res = await request(app)
      .post("/api/jobs/import")
      .set(authHeader(ADMIN))
      .send({ searchTerm: "developer" });
    expect(res.status).toBe(400);
  });

  it("caps resultsWanted so one call cannot ask for thousands of writes", async () => {
    const res = await search({ resultsWanted: 5000 });
    expect(res.status).toBe(400);
  });

  it("passes the search through to the aggregator unchanged", async () => {
    everJobsResponds({ count: 0, jobs: [] });

    await search({ location: "Colombo", country: "Sri Lanka", resultsWanted: 5 });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://ever-jobs.internal:3001/api/jobs/search");
    expect(JSON.parse(options.body)).toMatchObject({
      searchTerm: "software engineer",
      siteType: ["linkedin"],
      location: "Colombo",
      country: "Sri Lanka",
      resultsWanted: 5,
    });
  });
});

describe("POST /api/jobs/import — logging", () => {
  it("flattens newlines out of logged values, which are persisted to LogEntry", async () => {
    // Winston writes through PrismaLogTransport, so a newline in a logged value
    // forges a whole row in the admin log viewer — not just noise on stdout.
    // The body is set directly rather than through everJobsResponds, which
    // JSON-encodes and would turn the newline into two harmless characters.
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "line one\nERROR forged line",
    }));

    await search({ searchTerm: "developer" });

    const logged = prisma.logEntry.create.mock.calls.map((call) => JSON.stringify(call[0])).join("\n");
    expect(logged).toContain("line one ERROR forged line");
    expect(logged).not.toContain("line one\\nERROR forged line");
  });

  it("caps a logged value so one response cannot flood the log", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "x".repeat(5000),
    }));

    await search();

    const meta = prisma.logEntry.create.mock.calls
      .map((call) => call[0].data.meta)
      .find((m) => m && typeof m.body === "string");
    expect(meta.body.length).toBeLessThanOrEqual(500);
  });
});
