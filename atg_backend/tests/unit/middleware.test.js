import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import Joi from "joi";

vi.mock("../../config/db", async () => {
  const { prisma } = await import("../helpers/prismaMock.js");
  return { prisma };
});

const { default: authenticate } = await import("../../middlewares/permissions/atg_authenticate.middleware.js");
const { default: authorize } = await import("../../middlewares/permissions/authorize.middleware.js");
const { default: validate } = await import("../../middlewares/validations/validate.middleware.js");
const { default: errorHandler } = await import("../../middlewares/error.middleware.js");
const { default: notFound } = await import("../../middlewares/notFound.middleware.js");
const { default: ApiError } = await import("../../utils/ApiError.js");
const { resolveLocale } = await import("../../middlewares/locale.middleware.js");

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const mockReq = (overrides = {}) => ({ headers: {}, originalUrl: "/api/test", method: "GET", ...overrides });

describe("authenticate middleware", () => {
  it("populates req.user from a valid Bearer token", () => {
    const token = jwt.sign({ id: 7, email: "a@b.com", role: "candidate", companyId: null }, process.env.JWT_SECRET);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const next = vi.fn();

    authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: 7, email: "a@b.com", role: "candidate", companyId: null });
  });

  it("accepts a lowercase 'bearer' scheme", () => {
    const token = jwt.sign({ id: 7, role: "admin" }, process.env.JWT_SECRET);
    const req = mockReq({ headers: { authorization: `bearer ${token}` } });
    const next = vi.fn();
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("normalises the legacy 'customer' role to 'candidate'", () => {
    const token = jwt.sign({ id: 7, role: "customer" }, process.env.JWT_SECRET);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    authenticate(req, mockRes(), vi.fn());
    expect(req.user.role).toBe("candidate");
  });

  it("401s when no token is present", () => {
    const res = mockRes();
    const next = vi.fn();
    authenticate(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401s on a token signed with the wrong secret", () => {
    const forged = jwt.sign({ id: 1, role: "admin" }, "not-the-secret");
    const res = mockRes();
    authenticate(mockReq({ headers: { authorization: `Bearer ${forged}` } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid token" }));
  });

  it("rejects an alg=none token rather than trusting its claims", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: 1, role: "admin" })).toString("base64url");
    const res = mockRes();
    authenticate(mockReq({ headers: { authorization: `Bearer ${header}.${payload}.` } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("distinguishes an expired token in the message", () => {
    const expired = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "-1s" });
    const res = mockRes();
    authenticate(mockReq({ headers: { authorization: `Bearer ${expired}` } }), res, vi.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Token has expired" }));
  });
});

describe("authorize middleware", () => {
  it("calls next when the role is allowed", () => {
    const next = vi.fn();
    authorize("admin", "operator")(mockReq({ user: { id: 1, role: "operator" } }), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("403s when the role is not allowed", () => {
    const res = mockRes();
    const next = vi.fn();
    authorize("admin")(mockReq({ user: { id: 1, role: "candidate" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("403s when authenticate never ran", () => {
    const res = mockRes();
    authorize("admin")(mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("does not leak the allowed-role list or the caller's role in the response", () => {
    const res = mockRes();
    authorize("admin", "operator")(mockReq({ user: { id: 1, role: "candidate" } }), res, vi.fn());
    const body = res.json.mock.calls[0][0];
    expect(body.message).not.toMatch(/admin|operator|candidate/);
  });
});

describe("validate middleware", () => {
  const schema = Joi.object({ email: Joi.string().email().required(), age: Joi.number().integer() });

  it("passes and writes the coerced value back onto the request", () => {
    const req = mockReq({ body: { email: "a@b.com", age: "42" } });
    const next = vi.fn();
    validate(schema)(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body.age).toBe(42);
  });

  it("strips unknown keys so they cannot reach Prisma as mass assignment", () => {
    const req = mockReq({ body: { email: "a@b.com", role: "admin", appsTotal: 9999 } });
    validate(schema)(req, mockRes(), vi.fn());
    expect(req.body).toEqual({ email: "a@b.com" });
  });

  it("400s and reports every failure at once", () => {
    const res = mockRes();
    const next = vi.fn();
    validate(schema)(mockReq({ body: { email: "nope", age: "x" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/email/);
    expect(next).not.toHaveBeenCalled();
  });

  it("can validate a source other than the body", () => {
    const req = mockReq({ query: { email: "a@b.com" } });
    const next = vi.fn();
    validate(schema, "query")(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("error handler", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("uses the ApiError status and message", () => {
    const res = mockRes();
    errorHandler(ApiError.notFound("Job not found"), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: false, message: "Job not found" }));
  });

  it("defaults to 500 for an unexpected error", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("never leaks a stack trace outside development", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), mockReq(), res, vi.fn());
    expect(res.json.mock.calls[0][0].error).toBeUndefined();
  });

  it("never leaks an internal 500 message to the client", () => {
    const res = mockRes();
    const err = new Error("Invalid `prisma.user.findFirst()` invocation: connection string leaked");
    errorHandler(err, mockReq(), res, vi.fn());
    expect(res.json.mock.calls[0][0].message).toBe("Internal server error");
  });

  // The error body is what a user actually reads when a page fails. It used to
  // be English only, so a candidate who had selected தமிழ் still met an English
  // sentence — the "translation not done fully" report. These cover the code +
  // locale contract that lets the client, and the API itself, localize it.
  it("carries a stable code for Prisma schema drift", () => {
    const res = mockRes();
    const err = new Error("Invalid `prisma.job.findMany()` invocation");
    err.code = "P2022";
    errorHandler(err, mockReq(), res, vi.fn());
    expect(res.json.mock.calls[0][0].code).toBe("DB_SCHEMA_MISSING_COLUMN");
  });

  it("translates the message when the request asked for another language", () => {
    const res = mockRes();
    const err = new Error("Invalid `prisma.job.findMany()` invocation");
    err.code = "P2022";
    errorHandler(err, mockReq({ locale: "ta" }), res, vi.fn());
    const body = res.json.mock.calls[0][0];
    expect(body.message).toContain("தரவுத்தளத்தில் இல்லை");
    // The English text stays available under its own key, because logs and
    // support tickets quote it and must stay searchable.
    expect(body.messageEn).toBe(
      "The database is missing a column this API expects. A migration has not been applied to this environment."
    );
  });

  it("leaves the English message byte-identical when no language was requested", () => {
    const res = mockRes();
    const err = new Error("Invalid `prisma.job.findMany()` invocation");
    err.code = "P2022";
    errorHandler(err, mockReq(), res, vi.fn());
    expect(res.json.mock.calls[0][0].message).toBe(
      "The database is missing a column this API expects. A migration has not been applied to this environment."
    );
  });

  // Regression guard: an earlier draft derived the code from the HTTP status, so
  // every 404 answered "The requested item could not be found." and "Job not
  // found" was lost. A translated but vaguer message is a downgrade.
  it("does not flatten a specific 4xx message into a generic translated one", () => {
    const res = mockRes();
    errorHandler(ApiError.notFound("Job not found"), mockReq({ locale: "ta" }), res, vi.fn());
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe("Job not found");
    expect(body.code).toBeUndefined();
  });

  it("falls back to English for a language with no translation of that code", () => {
    const res = mockRes();
    const err = new Error("boom");
    err.code = "P2022";
    errorHandler(err, mockReq({ locale: "de" }), res, vi.fn());
    expect(res.json.mock.calls[0][0].message).toContain("The database is missing a column");
  });
});

describe("locale middleware", () => {
  it("picks the base language, ignoring the region", () => {
    expect(resolveLocale("ta-LK,ta;q=0.9,en;q=0.8")).toBe("ta");
  });

  it("honours quality order rather than document order", () => {
    expect(resolveLocale("en;q=0.2,si;q=0.9")).toBe("si");
  });

  it("falls back to English for an unsupported or absent language", () => {
    expect(resolveLocale("de-DE,de;q=0.9")).toBe("en");
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  // The header is attacker-controllable, so a malformed one must degrade to
  // English rather than throw on every single request.
  it("survives a malformed header", () => {
    expect(resolveLocale(";;;q=notanumber,,")).toBe("en");
    expect(resolveLocale("*")).toBe("en");
  });
});

describe("notFound middleware", () => {
  it("404s for an unmatched route", () => {
    const res = mockRes();
    notFound(mockReq({ originalUrl: "/api/nope" }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("does not reflect the raw request path back into the body", () => {
    const res = mockRes();
    notFound(mockReq({ originalUrl: "/api/<script>alert(1)</script>" }), res);
    expect(res.json.mock.calls[0][0].message).not.toContain("<script>");
  });
});
