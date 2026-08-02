import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const entry = (overrides = {}) => ({
  id: 1,
  category: "security",
  level: "security",
  message: "Login succeeded",
  meta: { userId: 4 },
  userId: 4,
  createdAt: new Date("2026-08-01T10:00:00Z"),
  d_status: "active",
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

describe("GET /api/logs access", () => {
  it("requires a token", async () => {
    const res = await request(app).get("/api/logs");
    expect(res.status).toBe(401);
  });

  it("is closed to operators — security entries name the accounts behind them", async () => {
    const res = await request(app).get("/api/logs").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
    expect(prisma.logEntry.findMany).not.toHaveBeenCalled();
  });

  it("is closed to candidates", async () => {
    const res = await request(app).get("/api/logs").set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
  });

  it("is open to admins", async () => {
    prisma.logEntry.findMany.mockResolvedValue([entry()]);
    prisma.logEntry.count.mockResolvedValue(1);

    const res = await request(app).get("/api/logs").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });
});

describe("GET /api/logs filtering", () => {
  const listWhere = () => prisma.logEntry.findMany.mock.calls[0][0].where;

  it("only ever returns active rows, newest first", async () => {
    await request(app).get("/api/logs").set(authHeader(ADMIN));
    const call = prisma.logEntry.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ d_status: "active" });
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });

  it("filters by category, level and user", async () => {
    await request(app).get("/api/logs?category=security&level=error&userId=4").set(authHeader(ADMIN));
    expect(listWhere()).toMatchObject({ category: "security", level: "error", userId: 4 });
  });

  it("filters by a date range", async () => {
    await request(app)
      .get("/api/logs?from=2026-07-01T00:00:00Z&to=2026-08-01T00:00:00Z")
      .set(authHeader(ADMIN));

    const { createdAt } = listWhere();
    expect(createdAt.gte).toBeInstanceOf(Date);
    expect(createdAt.lte).toBeInstanceOf(Date);
  });

  it("searches the message case-insensitively", async () => {
    await request(app).get("/api/logs?search=login").set(authHeader(ADMIN));
    expect(listWhere().message).toEqual({ contains: "login", mode: "insensitive" });
  });

  it("rejects a category outside the known set", async () => {
    const res = await request(app).get("/api/logs?category=../../etc/passwd").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
    expect(prisma.logEntry.findMany).not.toHaveBeenCalled();
  });

  it("drops unknown filters rather than passing them to Prisma", async () => {
    await request(app).get("/api/logs?d_status=inactive&password=x").set(authHeader(ADMIN));
    const where = listWhere();
    expect(where.d_status).toBe("active");
    expect(where.password).toBeUndefined();
  });
});

describe("GET /api/logs pagination", () => {
  it("paginates by default, since the table grows without bound", async () => {
    await request(app).get("/api/logs").set(authHeader(ADMIN));
    expect(prisma.logEntry.findMany.mock.calls[0][0].take).toBe(50);
  });

  it("honours limit and offset", async () => {
    await request(app).get("/api/logs?limit=10&offset=20").set(authHeader(ADMIN));
    const call = prisma.logEntry.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
    expect(call.skip).toBe(20);
  });

  it("refuses a page size beyond the ceiling", async () => {
    const res = await request(app).get("/api/logs?limit=100000").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
  });

  it("reports the total so the UI can page through it", async () => {
    prisma.logEntry.findMany.mockResolvedValue([entry()]);
    prisma.logEntry.count.mockResolvedValue(4321);

    const res = await request(app).get("/api/logs?limit=1").set(authHeader(ADMIN));

    expect(res.body.data).toMatchObject({ total: 4321, limit: 1, offset: 0 });
  });
});

describe("GET /api/logs/summary", () => {
  it("counts by category and level over a trailing window", async () => {
    prisma.logEntry.groupBy
      .mockResolvedValueOnce([{ category: "security", _count: { _all: 12 } }])
      .mockResolvedValueOnce([{ level: "error", _count: { _all: 3 } }]);
    prisma.logEntry.count.mockResolvedValue(15);

    const res = await request(app).get("/api/logs/summary?days=7").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      days: 7,
      total: 15,
      byCategory: { security: 12 },
      byLevel: { error: 3 },
    });
  });

  it("is admin-only like the rest of the module", async () => {
    const res = await request(app).get("/api/logs/summary").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/logs/export", () => {
  it("returns a CSV attachment", async () => {
    prisma.logEntry.findMany.mockResolvedValue([entry()]);

    const res = await request(app).get("/api/logs/export").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.text.split("\n")[0]).toBe("ID,Timestamp,Category,Level,User ID,Message,Meta");
  });

  it("escapes a message containing a comma or a quote", async () => {
    prisma.logEntry.findMany.mockResolvedValue([entry({ message: 'Denied, role "candidate"', meta: null })]);

    const res = await request(app).get("/api/logs/export").set(authHeader(ADMIN));

    expect(res.text).toContain('"Denied, role ""candidate"""');
  });

  it("caps the export rather than streaming the whole table", async () => {
    prisma.logEntry.findMany.mockResolvedValue([]);
    await request(app).get("/api/logs/export").set(authHeader(ADMIN));
    expect(prisma.logEntry.findMany.mock.calls[0][0].take).toBe(200);
  });

  it("is admin-only", async () => {
    const res = await request(app).get("/api/logs/export").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });
});
