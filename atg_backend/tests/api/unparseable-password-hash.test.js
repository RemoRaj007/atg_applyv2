import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";

import { loadApp, authHeader, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

// `argon2.verify` throws — it does not return false — when the stored value is
// not a PHC string. A bcrypt hash parses and returns false, but a plaintext
// password, an empty string, or a hash truncated by a too-narrow column raises
// "pchstr must contain a $ as first char". That throw reached the error handler
// and became a 500, so one unusable row looked like the whole API was broken:
// the account could not log in, and could not change its password either.
const UNPARSEABLE = ["plaintext-password", "not-a-hash", "$2b$10$", "x"];

const userRow = (password) => ({
  id: CANDIDATE.id,
  email: "candidate@example.com",
  name: "Cand Idate",
  password,
  role: "candidate",
  companyId: null,
  d_status: "active",
});

describe("a stored password argon2 cannot parse", () => {
  it.each(UNPARSEABLE)("fails login as 401, not 500 (%s)", async (password) => {
    prisma.user.findFirst.mockResolvedValue(userRow(password));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it.each(UNPARSEABLE)("fails a password change as 400, not 500 (%s)", async (password) => {
    prisma.user.findFirst.mockResolvedValue(userRow(password));

    const res = await request(app)
      .put("/api/users/me/password")
      .set(authHeader(CANDIDATE))
      .send({ oldPassword: "Password123!", newPassword: "NewPassword123!" });

    expect(res.status).toBe(400);
    // A dead end, not a typo: the message has to point somewhere that can
    // actually set a fresh hash.
    expect(res.body.message).toMatch(/Forgot password/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each(UNPARSEABLE)("answers verify-password without throwing (%s)", async (password) => {
    prisma.user.findFirst.mockResolvedValue(userRow(password));

    const res = await request(app)
      .post("/api/users/me/verify-password")
      .set(authHeader(CANDIDATE))
      .send({ password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(false);
  });

  it("never echoes the stored value, which may be a plaintext password", async () => {
    prisma.user.findFirst.mockResolvedValue(userRow("hunter2-in-the-clear"));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });

  // The regression guard: a bcrypt hash was always handled correctly, and a
  // valid argon2 hash must keep working.
  it("still accepts a correct password against a real argon2 hash", async () => {
    prisma.user.findFirst.mockResolvedValue(userRow(await argon2.hash("Password123!")));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(200);
  });

  it("treats a bcrypt hash as a wrong password rather than an error", async () => {
    prisma.user.findFirst.mockResolvedValue(
      userRow("$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
  });
});

describe("500 responses", () => {
  it("carries an errorId that matches the log line, without leaking the cause", async () => {
    prisma.user.findFirst.mockRejectedValue(Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:5432"), {}));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
    expect(res.body.errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(res.body)).not.toContain("5432");
  });

  it("names an unapplied migration instead of flattening it to 'Internal server error'", async () => {
    // P2022 is what Prisma raises when the client expects a column the database
    // does not have — the signature of a migration that never ran here.
    prisma.user.findFirst.mockRejectedValue(
      Object.assign(new Error("The column `User.emailVerified` does not exist"), { code: "P2022" })
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/migration has not been applied/i);
    // The column name is in the logs, not the response.
    expect(res.body.message).not.toContain("emailVerified");
  });
});

// The admin "Create User Account" form. `email` is globally unique but every
// lookup filters on d_status, so a soft-deleted row holds the address while
// being invisible to an active-only check — the create then hit the unique
// constraint and answered 500.
describe("creating a user whose email is already held", () => {
  const ADMIN = { id: 1, role: "admin" };

  const payload = {
    email: "test2@gmail.com",
    name: "Test Two",
    password: "Password123!",
    role: "candidate",
  };

  it("409s with the reason when an active account holds the email", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, email: payload.email, d_status: "active" });

    const res = await request(app).post("/api/users").set(authHeader(ADMIN)).send(payload);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("409s, not 500, when a deactivated account holds the email", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, email: payload.email, d_status: "inactive" });

    const res = await request(app).post("/api/users").set(authHeader(ADMIN)).send(payload);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/deactivated/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates the account when the email is free", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 9, ...payload, d_status: "active" });

    const res = await request(app).post("/api/users").set(authHeader(ADMIN)).send(payload);

    expect(res.status).toBe(201);
  });
});
