import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE, CANDIDATE_2, COMPANY, VISITOR } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const user = (overrides = {}) => ({
  id: CANDIDATE.id,
  email: "candidate@example.com",
  name: "Cand Idate",
  role: "candidate",
  companyId: null,
  pkg: "Trial",
  appsUsed: 0,
  appsTotal: 10,
  d_status: "active",
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

// The profile endpoint used to accept `password`, so anyone holding a stolen
// 15-minute access token could set a new one without knowing the current one —
// turning a short-lived leak into a permanent takeover. Changing your own
// password must go through PUT /me/password, which verifies the old one.
describe("password cannot be changed through the profile endpoint", () => {
  it("rejects a candidate setting their own password", async () => {
    prisma.user.findFirst.mockResolvedValue(user());

    const res = await request(app)
      .put(`/api/users/${CANDIDATE.id}`)
      .set(authHeader(CANDIDATE))
      .send({ password: "NewPassw0rd!" });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an admin setting their own password, despite the broader schema", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: ADMIN.id, role: "admin" }));

    const res = await request(app)
      .put(`/api/users/${ADMIN.id}`)
      .set(authHeader(ADMIN))
      .send({ password: "NewPassw0rd!" });

    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("still lets a candidate update ordinary profile fields", async () => {
    prisma.user.findFirst.mockResolvedValue(user());
    prisma.user.update.mockResolvedValue(user({ name: "New Name" }));

    const res = await request(app)
      .put(`/api/users/${CANDIDATE.id}`)
      .set(authHeader(CANDIDATE))
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("still lets an admin reset someone else's password", async () => {
    prisma.user.findFirst.mockResolvedValue(user());
    prisma.user.update.mockResolvedValue(user());

    const res = await request(app)
      .put(`/api/users/${CANDIDATE.id}`)
      .set(authHeader(ADMIN))
      .send({ password: "NewPassw0rd!" });

    expect(res.status).toBe(200);
    const written = prisma.user.update.mock.calls[0][0].data.password;
    expect(written).toMatch(/^\$argon2/);
  });
});

// The guard named `candidate` explicitly, so every other non-staff role fell
// through it — and profile values are where the CV, NIC and contact details are.
describe("profile values are readable only by their owner and staff", () => {
  it.each([
    ["a company", COMPANY],
    ["a visitor", VISITOR],
    ["another candidate", CANDIDATE_2],
  ])("refuses %s reading someone else's values", async (_label, requester) => {
    const res = await request(app)
      .get(`/api/profile-values/${CANDIDATE.id}`)
      .set(authHeader(requester));

    expect(res.status).toBe(403);
    expect(prisma.userProfileValue.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["an admin", ADMIN],
    ["an operator", OPERATOR],
  ])("allows %s to read any user's values", async (_label, requester) => {
    const res = await request(app)
      .get(`/api/profile-values/${CANDIDATE.id}`)
      .set(authHeader(requester));

    expect(res.status).toBe(200);
  });

  it("allows a candidate to read their own values", async () => {
    const res = await request(app)
      .get(`/api/profile-values/${CANDIDATE.id}`)
      .set(authHeader(CANDIDATE));

    expect(res.status).toBe(200);
  });

  it("rejects a non-numeric user id instead of coercing it", async () => {
    const res = await request(app).get("/api/profile-values/abc").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
  });
});

// POST /api/job-roles is open to any authenticated user by design (the "Other"
// free-text field). It used to spread the whole body into prisma.jobRole.create
// with no schema, so the caller chose their own row's `status`.
describe("job role creation is bounded", () => {
  const created = { id: 9, name: "Cooper", status: "pending", jobRoleSkills: [] };

  // The schema strips unknown keys (validate.middleware sets stripUnknown), so
  // the request succeeds — what matters is that the caller's `status` is gone by
  // the time the row is written.
  it("discards a caller-supplied status and files the role as pending", async () => {
    prisma.jobRole.findFirst.mockResolvedValue(null);
    prisma.jobRole.create.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/job-roles")
      .set(authHeader(CANDIDATE))
      .send({ name: "Cooper", status: "active" });

    expect(res.status).toBe(201);
    expect(prisma.jobRole.create.mock.calls[0][0].data.status).toBe("pending");
  });

  it("files a candidate's role as pending review", async () => {
    prisma.jobRole.findFirst.mockResolvedValue(null);
    prisma.jobRole.create.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/job-roles")
      .set(authHeader(CANDIDATE))
      .send({ name: "Cooper" });

    expect(res.status).toBe(201);
    expect(prisma.jobRole.create.mock.calls[0][0].data.status).toBe("pending");
  });

  it("activates a role an operator creates", async () => {
    prisma.jobRole.findFirst.mockResolvedValue(null);
    prisma.jobRole.create.mockResolvedValue({ ...created, status: "active" });

    const res = await request(app)
      .post("/api/job-roles")
      .set(authHeader(OPERATOR))
      .send({ name: "Cooper" });

    expect(res.status).toBe(201);
    expect(prisma.jobRole.create.mock.calls[0][0].data.status).toBe("active");
  });

  it("never passes an unknown field through to Prisma", async () => {
    prisma.jobRole.findFirst.mockResolvedValue(null);
    prisma.jobRole.create.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/job-roles")
      .set(authHeader(CANDIDATE))
      .send({ name: "Cooper", d_status: "inactive", id: 1 });

    expect(res.status).toBe(201);
    const written = prisma.jobRole.create.mock.calls[0][0].data;
    expect(written).not.toHaveProperty("d_status");
    expect(written).not.toHaveProperty("id");
  });

  it("rejects a name that is missing or too short", async () => {
    for (const body of [{}, { name: "x" }]) {
      const res = await request(app).post("/api/job-roles").set(authHeader(CANDIDATE)).send(body);
      expect(res.status).toBe(400);
    }
    expect(prisma.jobRole.create).not.toHaveBeenCalled();
  });
});
