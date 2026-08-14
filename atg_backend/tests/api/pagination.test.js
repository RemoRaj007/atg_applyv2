import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import { MAX_PAGE_SIZE } from "../../utils/pagination.js";

const app = await loadApp();

const ENDPOINTS = [
  { path: "/api/applications", key: "applications", model: "candidateApplication" },
  { path: "/api/jobs", key: "jobs", model: "job" },
  { path: "/api/users", key: "users", model: "user" },
];

describe("list endpoint pagination", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe.each(ENDPOINTS)("$path", ({ path, key, model }) => {
    it("still returns the plain array when no page is requested", async () => {
      prisma[model].findMany.mockResolvedValue([]);

      const res = await request(app).get(path).set(authHeader(ADMIN));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data[key])).toBe(true);
      // The unpaginated path must not pay for a second count() round trip.
      expect(prisma[model].count).not.toHaveBeenCalled();
      // And it must not slice: existing callers depend on getting every row.
      const args = prisma[model].findMany.mock.calls[0][0];
      expect(args.take).toBeUndefined();
      expect(args.skip).toBeUndefined();
    });

    it("slices and reports the total when a page is requested", async () => {
      prisma[model].findMany.mockResolvedValue([]);
      prisma[model].count.mockResolvedValue(812);

      const res = await request(app).get(`${path}?page=3&pageSize=10`).set(authHeader(ADMIN));

      expect(res.status).toBe(200);
      const args = prisma[model].findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
      expect(res.body.data.pagination).toMatchObject({
        total: 812,
        page: 3,
        pageSize: 10,
        totalPages: 82,
      });
    });

    it("caps pageSize so a client cannot request the whole table", async () => {
      prisma[model].findMany.mockResolvedValue([]);
      prisma[model].count.mockResolvedValue(50000);

      await request(app).get(`${path}?page=1&pageSize=99999`).set(authHeader(ADMIN));

      expect(prisma[model].findMany.mock.calls[0][0].take).toBe(MAX_PAGE_SIZE);
    });

    // The count must describe the same filtered set as the rows, or the page
    // arithmetic lies.
    it("counts with the same where clause it queries with", async () => {
      prisma[model].findMany.mockResolvedValue([]);
      prisma[model].count.mockResolvedValue(0);

      await request(app).get(`${path}?page=1`).set(authHeader(ADMIN));

      const findWhere = prisma[model].findMany.mock.calls[0][0].where;
      const countWhere = prisma[model].count.mock.calls[0][0].where;
      expect(countWhere).toEqual(findWhere);
    });
  });

  describe("/api/users filtering", () => {
    it("narrows by role in the database, not in the caller", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await request(app).get("/api/users?page=1&role=candidate").set(authHeader(ADMIN));

      expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ role: "candidate" });
    });

    it("ignores a role that is not a real role", async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await request(app).get("/api/users?role=superuser").set(authHeader(ADMIN));

      expect(prisma.user.findMany.mock.calls[0][0].where.role).toBeUndefined();
    });

    it("searches name, email and package case-insensitively", async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await request(app).get("/api/users?search=ada").set(authHeader(ADMIN));

      const { where } = prisma.user.findMany.mock.calls[0][0];
      expect(where.OR).toEqual([
        { name: { contains: "ada", mode: "insensitive" } },
        { email: { contains: "ada", mode: "insensitive" } },
        { pkg: { contains: "ada", mode: "insensitive" } },
      ]);
    });
  });
});
