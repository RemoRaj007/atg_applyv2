import { describe, it, expect, beforeEach, vi } from "vitest";

import rateLimit from "../../middlewares/rateLimit.middleware.js";

const mockRes = () => {
  const res = { headers: {} };
  res.setHeader = vi.fn((k, v) => {
    res.headers[k] = v;
  });
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const req = (ip = "1.2.3.4", headers = {}) => ({ ip, headers, originalUrl: "/api/auth/login", socket: {} });

beforeEach(() => {
  rateLimit.reset();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const limiter = rateLimit({ name: "t", max: 3, windowMs: 60_000 });
    const next = vi.fn();

    for (let i = 0; i < 3; i += 1) limiter(req(), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(3);

    const blocked = mockRes();
    limiter(req(), blocked, next);
    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("counts each client separately", () => {
    const limiter = rateLimit({ name: "t", max: 1, windowMs: 60_000 });
    const next = vi.fn();

    limiter(req("1.1.1.1"), mockRes(), next);
    limiter(req("2.2.2.2"), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("keeps separate budgets per limiter name, so login cannot spend register's", () => {
    const login = rateLimit({ name: "login", max: 1, windowMs: 60_000 });
    const register = rateLimit({ name: "register", max: 1, windowMs: 60_000 });
    const next = vi.fn();

    login(req(), mockRes(), next);
    register(req(), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("keys off the first x-forwarded-for hop, not a caller-appended one", () => {
    const limiter = rateLimit({ name: "t", max: 1, windowMs: 60_000 });
    const next = vi.fn();
    const blocked = mockRes();

    limiter(req("9.9.9.9", { "x-forwarded-for": "5.5.5.5" }), mockRes(), next);
    // Same real client, appending junk in an attempt to look like someone else.
    limiter(req("9.9.9.9", { "x-forwarded-for": "5.5.5.5, 6.6.6.6" }), blocked, next);

    expect(blocked.status).toHaveBeenCalledWith(429);
  });

  it("starts a fresh window once the old one expires", () => {
    vi.useFakeTimers();
    try {
      const limiter = rateLimit({ name: "t", max: 1, windowMs: 1000 });
      const next = vi.fn();

      limiter(req(), mockRes(), next);
      const blocked = mockRes();
      limiter(req(), blocked, next);
      expect(blocked.status).toHaveBeenCalledWith(429);

      vi.advanceTimersByTime(1001);
      limiter(req(), mockRes(), next);
      expect(next).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("advertises the budget so a client can back off", () => {
    const limiter = rateLimit({ name: "t", max: 5, windowMs: 60_000 });
    const res = mockRes();
    limiter(req(), res, vi.fn());

    expect(res.headers["RateLimit-Limit"]).toBe("5");
    expect(res.headers["RateLimit-Remaining"]).toBe("4");
  });

  it("sets Retry-After when it blocks", () => {
    const limiter = rateLimit({ name: "t", max: 1, windowMs: 60_000 });
    limiter(req(), mockRes(), vi.fn());

    const blocked = mockRes();
    limiter(req(), blocked, vi.fn());
    expect(Number(blocked.headers["Retry-After"])).toBeGreaterThan(0);
  });
});
