import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

describe("stats endpoints", () => {
  beforeEach(() => {
    resetPrismaMock();
    rateLimit.reset();
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  });

  // These aggregate across every tenant's data.
  it.each([
    ["operator", OPERATOR],
    ["candidate", CANDIDATE],
  ])("refuses an %s", async (_label, user) => {
    const res = await request(app).get("/api/stats/admin/overview").set(authHeader(user));
    expect(res.status).toBe(403);
  });

  it("refuses an unauthenticated caller", async () => {
    const res = await request(app).get("/api/stats/admin/overview");
    expect(res.status).toBe(401);
  });

  it("returns the aggregate shape the dashboard reads", async () => {
    const res = await request(app).get("/api/stats/admin/overview").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      usersCount: expect.any(Number),
      jobsCount: expect.any(Number),
      companiesCount: expect.any(Number),
      totalRevenue: expect.any(Number),
    });
    // Counted in the database, never by pulling rows back to be counted here.
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1); // operators only
    expect(prisma.candidateApplication.findMany).not.toHaveBeenCalled();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  describe("revenue trend limit", () => {
    beforeEach(() => {
      prisma.payment.findMany.mockResolvedValue([]);
    });

    const takeFor = async (query) => {
      await request(app).get(`/api/stats/admin/revenue-trend${query}`).set(authHeader(ADMIN));
      return prisma.payment.findMany.mock.calls[0][0].take;
    };

    it("defaults when no limit is given", async () => {
      expect(await takeFor("")).toBe(200);
    });

    it("honours a limit within range", async () => {
      expect(await takeFor("?limit=50")).toBe(50);
    });

    // The value is attacker-supplied: it must be clamped, not merely defaulted.
    it.each([
      ["?limit=999999", 1000],
      ["?limit=-5", 200],
      ["?limit=abc", 200],
      ["?limit=0", 200],
    ])("clamps %s", async (query, expected) => {
      expect(await takeFor(query)).toBe(expected);
    });
  });

  it("rate limits the expensive aggregate endpoint", async () => {
    // The limiter is 30/minute; the 31st call must be refused.
    let lastStatus = 200;
    for (let i = 0; i < 31; i++) {
      const res = await request(app).get("/api/stats/admin/overview").set(authHeader(ADMIN));
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
