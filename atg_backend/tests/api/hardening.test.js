import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import argon2 from "argon2";

import { loadApp, authHeader, CANDIDATE, ADMIN } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

beforeEach(() => {
  resetPrismaMock();
  // The limiter's window is process-wide, so an earlier case would otherwise
  // spend the budget the next one needs.
  rateLimit.reset();
});

describe("security headers", () => {
  it("ships the helmet defaults", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
  });

  it("does not advertise Express", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  const preflight = (origin) =>
    request(app)
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

  it("allows the configured production origin with credentials", async () => {
    const res = await preflight("https://app.example.com");
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows the Cloudflare Pages deploy hostnames", async () => {
    for (const origin of ["https://atgapplyv2.pages.dev", "https://abc123.atgapplyv2.pages.dev"]) {
      const res = await preflight(origin);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("refuses an unknown origin", async () => {
    const res = await preflight("https://evil.example.net");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("refuses a look-alike of an allowed origin", async () => {
    for (const origin of [
      "https://atgapplyv2.pages.dev.evil.net",
      "https://evil-atgapplyv2.pages.dev.attacker.com",
      "https://app.example.com.evil.net",
    ]) {
      const res = await preflight(origin);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    }
  });

  it("does not treat a hostname that merely starts with localhost as local", async () => {
    const res = await preflight("http://localhost.evil.net");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows localhost outside production, for local development", async () => {
    const res = await preflight("http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  // With credentials:true, a blanket localhost allowance in production means a
  // page on the victim's own machine can call the live API with their cookies.
  it("refuses localhost in production", async () => {
    vi.resetModules();
    process.env.NODE_ENV = "production";
    try {
      const prodApp = (await import("../../app.js")).default;
      const res = await request(prodApp)
        .options("/api/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "POST");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      process.env.NODE_ENV = "test";
      vi.resetModules();
    }
  });
});

// The refresh cookie is SameSite=None in production — it has to be, since the
// frontend and API are different sites — so a browser sends it cross-site.
// /auth/refresh and /auth/logout act on that cookie with no other credential,
// which makes them the only routes a cross-site page could drive. Everything
// else authenticates with a Bearer token, which no browser attaches on an
// attacker's behalf.
describe("CSRF on the cookie-authenticated routes", () => {
  // Refresh now checks the token's jti against the user's stored
  // refreshTokenId (rotation/revocation — see auth.service.js), so a fabricated
  // token needs a jti that matches the mocked user's record to be accepted.
  const REFRESH_JTI = "test-refresh-jti";
  const refreshCookie = (jti = REFRESH_JTI) => {
    const token = jwt.sign({ id: 4, role: "candidate", jti }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
    return `refreshToken=${token}`;
  };

  beforeEach(() => {
    prisma.user.findFirst.mockResolvedValue({
      id: 4,
      email: "candidate@example.com",
      role: "candidate",
      d_status: "active",
      refreshTokenId: REFRESH_JTI,
    });
  });

  it("refuses a refresh driven from an attacker's page", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "https://evil.example.net")
      .set("Cookie", refreshCookie());

    expect(res.status).toBe(403);
  });

  it("refuses a logout driven from an attacker's page", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "https://evil.example.net")
      .set("Cookie", refreshCookie());

    expect(res.status).toBe(403);
  });

  it("allows the real frontend origin", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "https://app.example.com")
      .set("Cookie", refreshCookie());

    expect(res.status).toBe(200);
  });

  it("falls back to Referer when Origin is stripped", async () => {
    const blocked = await request(app)
      .post("/api/auth/logout")
      .set("Referer", "https://evil.example.net/attack.html")
      .set("Cookie", refreshCookie());
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .post("/api/auth/logout")
      .set("Referer", "https://app.example.com/dashboard")
      .set("Cookie", refreshCookie());
    expect(allowed.status).toBe(200);
  });

  // curl, server-to-server and uptime probes send neither header, and they are
  // not the threat model — CSRF leverage requires a browser holding the cookie,
  // and browsers always send Origin here.
  it("allows a request that carries neither Origin nor Referer", async () => {
    const res = await request(app).post("/api/auth/logout").set("Cookie", refreshCookie());
    expect(res.status).toBe(200);
  });
});

describe("health endpoint", () => {
  it("reports ok when the database answers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.database.status).toBe("ok");
  });

  // 200-on-degraded is how an outage hides from an uptime probe.
  it("answers 503 when the database is unreachable", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.checks.database.status).toBe("error");
  });

  it("reports the auth configuration, so a deploy that cannot sign tokens is visible", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body.checks.auth.status).toBe("ok");
  });

  it("degrades, naming the variable, when a token secret is missing", async () => {
    const saved = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    try {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(503);
      expect(res.body.checks.auth).toMatchObject({ status: "error", missing: ["JWT_REFRESH_SECRET"] });
      // Names only. This endpoint is unauthenticated.
      expect(JSON.stringify(res.body)).not.toContain(saved);
    } finally {
      process.env.JWT_REFRESH_SECRET = saved;
    }
  });
});

describe("request body limits", () => {
  it("rejects a JSON body far beyond anything the app posts", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ message: "x".repeat(2 * 1024 * 1024) }));

    expect(res.status).toBe(413);
  });

  it("rejects malformed JSON with 400 rather than 500", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
  });
});

describe("input validation", () => {
  it("rejects an over-long contact message", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ name: "Ada", email: "ada@example.com", subject: "Hi", message: "x".repeat(5001) });
    expect(res.status).toBe(400);
  });

  it("rejects a job link request that is not a URL", async () => {
    const res = await request(app)
      .post("/api/applications/link-request")
      .set(authHeader(CANDIDATE))
      .send({ jobLinkRequest: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range feedback rating", async () => {
    const res = await request(app)
      .post("/api/applications/1/feedback")
      .set(authHeader(CANDIDATE))
      .send({ rating: 99, text: "x" });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown application status", async () => {
    const res = await request(app).patch("/api/applications/1").set(authHeader(ADMIN)).field("status", "superadmin");
    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric id path segment before it reaches Prisma", async () => {
    const res = await request(app).get("/api/applications/abc").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
    expect(prisma.candidateApplication.findFirst).not.toHaveBeenCalled();
  });
});

describe("error responses", () => {
  it("404s an unknown route without echoing the path", async () => {
    const res = await request(app).get("/api/<script>alert(1)</script>");
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("<script>");
  });

  it("reports a database outage as a 500 without leaking the driver error", async () => {
    prisma.user.findFirst.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));

    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "Password123!" });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(res.body)).not.toContain("5432");
  });

  it("keeps the health check honest when the database is unreachable", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("no connection"));
    const res = await request(app).get("/");
    expect(res.status).toBe(500);
  });
});

describe("brute force resistance", () => {
  it("rate limits repeated failed logins from one client", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    // Past the 20-failure budget. Only failures count now (the limiter skips
    // successful requests), which is why the budget is larger than it was.
    let lastStatus = 0;
    for (let i = 0; i < 22; i += 1) {
      const res = await request(app).post("/api/auth/login").send({ email: "victim@example.com", password: `guess${i}!A` });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });

  it("does not spend the login budget on successful sign-ins", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 4,
      email: "candidate@example.com",
      name: "Cand Idate",
      password: await argon2.hash("Password123!"),
      role: "candidate",
      companyId: null,
      d_status: "active",
    });

    // Comfortably past the budget. Everyone behind one office NAT shares a
    // client key here, so counting successes locked out people who had done
    // nothing wrong.
    let lastStatus = 0;
    for (let i = 0; i < 25; i += 1) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "candidate@example.com", password: "Password123!" });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(200);
  });

  it("rate limits password reset requests, which send mail on every call", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    let lastStatus = 0;
    for (let i = 0; i < 12; i += 1) {
      const res = await request(app).post("/api/auth/forgot-password").send({ email: `target${i}@example.com` });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});
