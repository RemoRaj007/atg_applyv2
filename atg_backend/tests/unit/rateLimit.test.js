import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

import rateLimit from "../../middlewares/rateLimit.middleware.js";

// Driven through a real Express app rather than a hand-rolled mock res: the
// limiter is express-rate-limit, whose middleware is async and writes its
// headers through the framework.
const appWith = (options) => {
  const app = express();
  app.set("trust proxy", true);
  app.get("/api/auth/login", rateLimit(options), (req, res) => res.json({ ok: true }));
  return app;
};

beforeEach(() => {
  rateLimit.reset();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const app = appWith({ name: "t", max: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).get("/api/auth/login")).status).toBe(200);
    }

    const blocked = await request(app).get("/api/auth/login");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too many requests/i);
  });

  it("counts each client separately", async () => {
    const app = appWith({ name: "t", max: 1, windowMs: 60_000 });

    const first = await request(app).get("/api/auth/login").set("x-forwarded-for", "1.1.1.1");
    const second = await request(app).get("/api/auth/login").set("x-forwarded-for", "2.2.2.2");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("keeps separate budgets per limiter, so login cannot spend register's", async () => {
    const app = express();
    app.set("trust proxy", true);
    app.get("/login", rateLimit({ name: "login", max: 1, windowMs: 60_000 }), (req, res) => res.json({ ok: true }));
    app.get("/register", rateLimit({ name: "register", max: 1, windowMs: 60_000 }), (req, res) => res.json({ ok: true }));

    expect((await request(app).get("/login")).status).toBe(200);
    expect((await request(app).get("/register")).status).toBe(200);
  });

  it("keys off the first x-forwarded-for hop, not a caller-appended one", async () => {
    const app = appWith({ name: "t", max: 1, windowMs: 60_000 });

    await request(app).get("/api/auth/login").set("x-forwarded-for", "5.5.5.5");
    // Same real client, appending junk in an attempt to look like someone else.
    const blocked = await request(app).get("/api/auth/login").set("x-forwarded-for", "5.5.5.5, 6.6.6.6");

    expect(blocked.status).toBe(429);
  });

  it("starts a fresh window once the old one expires", async () => {
    const app = appWith({ name: "t", max: 1, windowMs: 150 });

    expect((await request(app).get("/api/auth/login")).status).toBe(200);
    expect((await request(app).get("/api/auth/login")).status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect((await request(app).get("/api/auth/login")).status).toBe(200);
  });

  it("advertises the budget so a client can back off", async () => {
    const app = appWith({ name: "t", max: 5, windowMs: 60_000 });

    const res = await request(app).get("/api/auth/login");

    expect(res.headers["ratelimit-limit"]).toBe("5");
    expect(res.headers["ratelimit-remaining"]).toBe("4");
  });

  it("sets Retry-After when it blocks", async () => {
    const app = appWith({ name: "t", max: 1, windowMs: 60_000 });

    await request(app).get("/api/auth/login");
    const blocked = await request(app).get("/api/auth/login");

    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("clears budgets on reset, so one suite cannot starve the next", async () => {
    const app = appWith({ name: "t", max: 1, windowMs: 60_000 });

    expect((await request(app).get("/api/auth/login")).status).toBe(200);
    expect((await request(app).get("/api/auth/login")).status).toBe(429);

    rateLimit.reset();

    expect((await request(app).get("/api/auth/login")).status).toBe(200);
  });
});
