import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";
import { buildObjectKey } from "../../config/storage.js";

const app = await loadApp();

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

// The object key is interpolated into the Supabase request URL, so what the
// sanitiser lets through decides which path this API asks storage to write to.
describe("storage object keys", () => {
  const attempts = [
    "../../etc/passwd",
    "a/../../b.png",
    "file%2f..%2fx.png",
    "x.png?download=1",
    "x.png#frag",
    "sub/dir/file.png",
  ];

  it.each(attempts)("never lets %s reach the request URL", (originalname) => {
    let key;
    try {
      key = buildObjectKey({ originalname }, "photo");
    } catch {
      return; // refused outright, which is also a pass
    }
    expect(key).toMatch(/^[a-zA-Z0-9_-]{1,64}\/[a-zA-Z0-9._-]{1,160}$/);
    // Exactly one separator, and neither segment is a dot segment. `..` inside a
    // file name is harmless once it cannot be followed by a slash — what matters
    // is that the key cannot climb out of its folder.
    const segments = key.split("/");
    expect(segments).toHaveLength(2);
    expect(segments.every((seg) => seg !== "." && seg !== "..")).toBe(true);
  });

  it("keeps an ordinary filename recognisable", () => {
    const key = buildObjectKey({ originalname: "CV Final.pdf" }, "file");
    expect(key).toMatch(/^file\/[0-9a-f-]{36}-CV_Final\.pdf$/);
  });

  it("flattens a folder that would escape its segment", () => {
    const key = buildObjectKey({ originalname: "a.png" }, "../secrets");
    // "..", "/" and the rest each collapse to an underscore.
    expect(key.startsWith("___secrets/")).toBe(true);
  });
});

describe("CSRF origin check", () => {
  it("blocks a state-changing request from an untrusted origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example.com")
      .send({ email: "candidate@example.com", password: "Password123!" });

    expect(res.status).toBe(403);
  });

  it("allows a state-changing request from the production origin", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://atgapply.atgconcordia.com")
      .send({ email: "nobody@example.com", password: "Password123!" });

    // 401 rather than 403: it reached the handler and failed on credentials.
    expect(res.status).toBe(401);
  });

  it("leaves reads alone, whatever their origin", async () => {
    const res = await request(app).get("/api/health").set("Origin", "https://evil.example.com");
    expect(res.status).not.toBe(403);
  });

  it("allows a request with no Origin at all — curl, probes, server-to-server", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
  });
});

describe("multipart field names", () => {
  it("ignores a field name that is not a column, so the prototype cannot be written", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([]);

    const polluting = "__pro" + "to__";
    const res = await request(app)
      .post("/api/profile-values")
      .set(authHeader(CANDIDATE))
      .field(polluting, "polluted")
      .field("column_1", "ok");

    expect(res.status).not.toBe(500);
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });
});
