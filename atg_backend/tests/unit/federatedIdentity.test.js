import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import path from "path";

// The security logger writes through Prisma. Without the mock in place the
// fire-and-forget write tries to reach a real database and prints a failure.
import { prisma } from "../helpers/prismaMock.js";

globalThis.__atgPrisma = prisma;

// The real module, not whatever another suite may have left in the shared
// CommonJS cache. Requiring it fresh also leaves the real module cached, which
// is what every other suite wants anyway.
const require_ = createRequire(path.join(process.cwd(), "tests/unit/federatedIdentity.test.js"));
const identityPath = require_.resolve("../../modules/auth/federated-identity.service.js");
delete require_.cache[identityPath];

const { verifyIdentityToken, MICROSOFT_CONSUMERS_TENANT } = require_(identityPath);

const CONFIG_KEYS = ["GOOGLE_CLIENT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_TENANT_ID"];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(CONFIG_KEYS.map((k) => [k, process.env[k]]));
  for (const key of CONFIG_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of CONFIG_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("verifyIdentityToken — input handling", () => {
  it.each(["google", "microsoft"])("rejects a missing %s token", async (provider) => {
    await expect(verifyIdentityToken(provider, undefined)).rejects.toMatchObject({ statusCode: 400 });
    await expect(verifyIdentityToken(provider, "")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects a provider it has no verifier for", async () => {
    await expect(verifyIdentityToken("facebook", "tok")).rejects.toMatchObject({ statusCode: 400 });
    // Not a prototype walk: "constructor" must not resolve to a verifier.
    await expect(verifyIdentityToken("constructor", "tok")).rejects.toMatchObject({ statusCode: 400 });
  });
});

// The audience check is the only thing stopping a token minted for a *different*
// app at the same IdP from being replayed against this one, and it needs the
// client id to run. An earlier Google implementation fell back to an
// unauthenticated tokeninfo lookup when the id was missing, which skipped that
// check entirely — so "unconfigured" has to fail, never degrade.
describe("verifyIdentityToken — fails closed when unconfigured", () => {
  it("refuses Google sign-in with no GOOGLE_CLIENT_ID", async () => {
    await expect(verifyIdentityToken("google", "some.token.value")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("not configured"),
    });
  });

  it("refuses Microsoft sign-in with no MICROSOFT_CLIENT_ID", async () => {
    await expect(verifyIdentityToken("microsoft", "some.token.value")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("not configured"),
    });
  });

  it.each(["   ", "\t"])("treats whitespace-only config (%j) as unconfigured", async (value) => {
    process.env.GOOGLE_CLIENT_ID = value;
    await expect(verifyIdentityToken("google", "some.token.value")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("not configured"),
    });
  });
});

describe("verifyIdentityToken — rejects malformed tokens opaquely", () => {
  it("answers 401 without leaking the underlying parse error", async () => {
    process.env.MICROSOFT_CLIENT_ID = "11111111-2222-3333-4444-555555555555";

    const err = await verifyIdentityToken("microsoft", "not-a-jwt").catch((e) => e);

    expect(err.statusCode).toBe(401);
    // A caller learns only that it failed — not which check failed, which would
    // otherwise be a probe for how tokens are validated here.
    expect(err.message).toBe("microsoft authentication failed. Invalid token.");
  });
});

describe("Microsoft consumer tenant", () => {
  // This constant decides whether a personal Microsoft account counts as having
  // a verified address, and so whether it may auto-link to an existing account.
  // A typo here silently turns that guard off, and nothing else would catch it.
  it("is the documented well-known consumers tenant id", () => {
    expect(MICROSOFT_CONSUMERS_TENANT).toBe("9188040d-6c67-4c5b-b112-36a304b66dad");
  });
});
