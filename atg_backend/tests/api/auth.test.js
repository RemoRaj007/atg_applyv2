import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { loadApp } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const activeUser = async (overrides = {}) => ({
  id: 4,
  email: "candidate@example.com",
  name: "Cand Idate",
  password: await argon2.hash("Password123!"),
  role: "candidate",
  companyId: null,
  pkg: "Trial",
  d_status: "active",
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  // The limiter's window is process-wide, so an earlier case would otherwise
  // spend the budget the next one needs.
  rateLimit.reset();
});

describe("POST /api/auth/register", () => {
  it("creates the account and returns a sanitized user plus an access token", async () => {
    const created = await activeUser();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(created);

    const res = await request(app).post("/api/auth/register").send({
      email: "candidate@example.com",
      name: "Cand Idate",
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("candidate@example.com");
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("never returns the password hash or a reset token", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(await activeUser({ resetPasswordToken: "secret-token" }));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });

    expect(JSON.stringify(res.body)).not.toContain("$argon2");
    expect(JSON.stringify(res.body)).not.toContain("secret-token");
  });

  it("stores an argon2 hash rather than the plaintext password", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(await activeUser());

    await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });

    const stored = prisma.user.create.mock.calls[0][0].data.password;
    expect(stored).toMatch(/^\$argon2/);
    expect(stored).not.toContain("Password123!");
  });

  it("sets an httpOnly refresh cookie and keeps the refresh token out of the body", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(await activeUser());

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(res.body.data.refreshToken).toBeUndefined();
  });

  it("rejects a weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", name: "Weak Pass", password: "alllowercase" });

    expect(res.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("409s when the email is taken", async () => {
    // findUnique, not findFirst: the address is checked regardless of d_status,
    // because a soft-deleted row still holds it.
    prisma.user.findUnique.mockResolvedValue(await activeUser());
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("409s — rather than hitting the unique constraint as a 500 — when a deactivated account holds the email", async () => {
    prisma.user.findUnique.mockResolvedValue(await activeUser({ d_status: "inactive" }));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/deactivated/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("ignores a self-assigned privileged role in the payload", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(await activeUser());

    await request(app).post("/api/auth/register").send({
      email: "candidate@example.com",
      name: "Cand Idate",
      password: "Password123!",
      role: "admin",
      appsTotal: 99999,
      isLegendary: true,
    });

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe("candidate");
    expect(data.appsTotal).toBeUndefined();
    expect(data.isLegendary).toBeUndefined();
  });

  const companySignup = {
    email: "hr@acme.com",
    name: "Hiring Manager",
    password: "Password123!",
    isCompany: true,
    companyName: "Acme",
  };

  it("creates the company and the user together", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: 11, name: "Acme" });
    prisma.user.create.mockResolvedValue(await activeUser({ role: "company", companyId: 11 }));

    const res = await request(app).post("/api/auth/register").send(companySignup);

    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalled();
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe("company");
    expect(data.companyId).toBe(11);
  });

  // The two writes used to be independent, so a failure on the user left the
  // company row behind — and the duplicate-company check then rejected every
  // retry, locking that name and email out of the platform for good.
  it("does not leave an orphan company behind when the user write fails", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: 11, name: "Acme" });
    prisma.user.create.mockRejectedValue(new Error("unique constraint"));

    const res = await request(app).post("/api/auth/register").send(companySignup);

    expect(res.status).toBe(500);
    // Both writes are inside one interactive transaction, so the company insert
    // is rolled back with it rather than being committed on its own.
    expect(prisma.$transaction).toHaveBeenCalled();
    const [transactionFn] = prisma.$transaction.mock.calls[0];
    expect(typeof transactionFn).toBe("function");
  });
});

describe("POST /api/auth/login", () => {
  it("returns a token pair for correct credentials", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser());
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.data.accessToken, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: 4, role: "candidate" });
  });

  it("gives the same opaque error for an unknown email and a wrong password", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const unknown = await request(app).post("/api/auth/login").send({ email: "nope@example.com", password: "Password123!" });

    prisma.user.findFirst.mockResolvedValue(await activeUser());
    const wrong = await request(app).post("/api/auth/login").send({ email: "candidate@example.com", password: "Wrong123!" });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
    expect(unknown.body.message).toBe("Invalid email or password");
  });

  it("rejects an SSO-only account without throwing on the null hash", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser({ password: null, provider: "google" }));
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("only ever matches an active account", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser());
    await request(app).post("/api/auth/login").send({ email: "candidate@example.com", password: "Password123!" });
    expect(prisma.user.findFirst.mock.calls[0][0].where).toMatchObject({ d_status: "active" });
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues a new access token from the refresh cookie", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser());
    const refreshToken = jwt.sign({ id: 4 }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

    const res = await request(app).post("/api/auth/refresh").set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("401s with no cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("rejects an access token presented as a refresh token", async () => {
    const accessToken = jwt.sign({ id: 4, role: "admin" }, process.env.JWT_SECRET);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", [`refreshToken=${accessToken}`]);
    expect(res.status).toBe(401);
  });

  it("401s once the account is deactivated, even with a still-valid token", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const refreshToken = jwt.sign({ id: 4 }, process.env.JWT_REFRESH_SECRET);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", [`refreshToken=${refreshToken}`]);
    expect(res.status).toBe(401);
  });
});

describe("password reset", () => {
  it("does not reveal whether an address is registered", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });

    prisma.user.findFirst.mockResolvedValue(await activeUser());
    const known = await request(app).post("/api/auth/forgot-password").send({ email: "candidate@example.com" });

    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
  });

  it("issues a high-entropy, time-limited token", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser());
    await request(app).post("/api/auth/forgot-password").send({ email: "candidate@example.com" });

    const { resetPasswordToken, resetPasswordExpires } = prisma.user.update.mock.calls[0][0].data;
    expect(resetPasswordToken).toMatch(/^[0-9a-f]{64}$/);
    expect(resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
    expect(resetPasswordExpires.getTime()).toBeLessThanOrEqual(Date.now() + 3600_000);
  });

  it("rejects an expired or unknown reset token", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/reset-password").send({ token: "deadbeef", password: "Password123!" });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("clears the token after a successful reset so it cannot be replayed", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser());
    const res = await request(app).post("/api/auth/reset-password").send({ token: "a".repeat(64), password: "NewPassword123!" });

    expect(res.status).toBe(200);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.resetPasswordToken).toBeNull();
    expect(data.resetPasswordExpires).toBeNull();
    expect(data.password).toMatch(/^\$argon2/);
  });

  it("enforces password strength on reset, not just on register", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({ token: "a".repeat(64), password: "weakpassword" });
    expect(res.status).toBe(400);
  });

  it("only accepts an unexpired token in the lookup", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await request(app).post("/api/auth/reset-password").send({ token: "a".repeat(64), password: "Password123!" });
    expect(prisma.user.findFirst.mock.calls[0][0].where.resetPasswordExpires).toEqual({ gt: expect.any(Date) });
  });
});

describe("POST /api/auth/register issues an email verification token", () => {
  it("stores a high-entropy, time-limited token on the new user", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(await activeUser());

    await request(app)
      .post("/api/auth/register")
      .send({ email: "candidate@example.com", name: "Cand Idate", password: "Password123!" });

    const { emailVerificationToken, emailVerificationExpires } = prisma.user.create.mock.calls[0][0].data;
    expect(emailVerificationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());
    expect(emailVerificationExpires.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 3600_000);
  });

  it("does not block login before the address is verified", async () => {
    // The account is unverified by construction (emailVerified defaults false),
    // and login must not care — see the "don't block" decision on this feature.
    prisma.user.findFirst.mockResolvedValue(await activeUser({ emailVerified: false }));
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "candidate@example.com", password: "Password123!" });
    expect(res.status).toBe(200);
  });
});

describe("email verification", () => {
  it("verifies and clears the token", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser({ emailVerified: false }));

    const res = await request(app).post("/api/auth/verify-email").send({ token: "a".repeat(64) });

    expect(res.status).toBe(200);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.emailVerified).toBe(true);
    expect(data.emailVerificationToken).toBeNull();
    expect(data.emailVerificationExpires).toBeNull();
  });

  it("rejects an expired or unknown token", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/verify-email").send({ token: "deadbeef" });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("only accepts an unexpired token in the lookup", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await request(app).post("/api/auth/verify-email").send({ token: "a".repeat(64) });
    expect(prisma.user.findFirst.mock.calls[0][0].where.emailVerificationExpires).toEqual({ gt: expect.any(Date) });
  });

  it("treats a second click on the same link as success, not an error", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser({ emailVerified: true }));
    const res = await request(app).post("/api/auth/verify-email").send({ token: "a".repeat(64) });
    expect(res.status).toBe(200);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not reveal whether an address is registered or already verified", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const unknown = await request(app).post("/api/auth/resend-verification").send({ email: "nobody@example.com" });

    prisma.user.findFirst.mockResolvedValue(await activeUser({ emailVerified: true }));
    const verified = await request(app).post("/api/auth/resend-verification").send({ email: "candidate@example.com" });

    expect(unknown.status).toBe(200);
    expect(verified.status).toBe(200);
    expect(unknown.body.message).toBe(verified.body.message);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("issues a fresh token for an unverified account", async () => {
    prisma.user.findFirst.mockResolvedValue(await activeUser({ emailVerified: false }));
    const res = await request(app).post("/api/auth/resend-verification").send({ email: "candidate@example.com" });

    expect(res.status).toBe(200);
    const { emailVerificationToken, emailVerificationExpires } = prisma.user.update.mock.calls[0][0].data;
    expect(emailVerificationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the refresh cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join()).toMatch(/refreshToken=;/);
  });
});

describe("social login", () => {
  it("requires an id token", async () => {
    const res = await request(app).post("/api/auth/google").send({});
    expect(res.status).toBe(400);
  });

  it("rejects a token it cannot verify with the provider", async () => {
    const res = await request(app).post("/api/auth/google").send({ credential: "not-a-real-token" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
