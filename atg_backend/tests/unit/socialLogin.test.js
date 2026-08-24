import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRequire } from "module";
import path from "path";

import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";

globalThis.__atgPrisma = prisma;

// auth.service destructures verifyIdentityToken at require time, so the stub has
// to be in require.cache before *that copy* of the service is built — vi.mock
// does not reach the app's CommonJS graph (see tests/helpers/app.js).
//
// Suites share one process and one require cache, so this cannot simply install
// a stub and leave: whichever file loads first would decide what every other
// file gets. Instead we build a private copy of auth.service against the stub,
// then put the cache back exactly as we found it. Our `svc` reference keeps the
// stubbed copy; every other suite still resolves the real modules.
const require_ = createRequire(path.join(process.cwd(), "tests/unit/socialLogin.test.js"));
const identityPath = require_.resolve("../../modules/auth/federated-identity.service.js");
const authPath = require_.resolve("../../modules/auth/auth.service.js");

const verifyIdentityToken = vi.fn();

const restore = (key, previous) => {
  if (previous) require_.cache[key] = previous;
  else delete require_.cache[key];
};

const previousAuth = require_.cache[authPath];
const previousIdentity = require_.cache[identityPath];

delete require_.cache[authPath];
require_.cache[identityPath] = {
  id: identityPath,
  filename: identityPath,
  loaded: true,
  exports: { verifyIdentityToken, MICROSOFT_CONSUMERS_TENANT: "9188040d-6c67-4c5b-b112-36a304b66dad" },
};

const svc = require_(authPath);

restore(authPath, previousAuth);
restore(identityPath, previousIdentity);

const { googleLogin, microsoftLogin } = svc;

// What the IdP asserted. The verifier has already checked the signature,
// audience, and issuer by the time socialLogin sees this — these tests are about
// what the service does with a *valid* assertion, which is where account linking
// can go wrong.
const identity = (overrides = {}) => ({
  provider: "google",
  externalId: "google-sub-1",
  email: "candidate@example.com",
  emailVerified: true,
  name: "Cand Idate",
  picture: "https://cdn.example.com/a.jpg",
  ...overrides,
});

const storedUser = (overrides = {}) => ({
  id: 4,
  email: "candidate@example.com",
  name: "Cand Idate",
  password: "$argon2id$v=19$m=65536,t=3,p=4$abcdefgh$ijklmnop",
  role: "candidate",
  companyId: null,
  company: null,
  pkg: "Trial",
  d_status: "active",
  provider: null,
  externalId: null,
  emailVerified: false,
  // Non-null by default so the photo-backfill branch stays out of the way of
  // tests that are about something else; the backfill has its own cases below.
  profilePhoto: "https://cdn.example.com/existing.jpg",
  ...overrides,
});

// The service issues two findFirst queries with different shapes. Keying off the
// where clause rather than call order keeps these tests from breaking the moment
// a lookup is added or reordered.
const onLookup = ({ byIdentity = null, byEmail = null } = {}) => {
  prisma.user.findFirst.mockImplementation(async ({ where }) =>
    where.externalId !== undefined ? byIdentity : byEmail
  );
};

const emailLookups = () =>
  prisma.user.findFirst.mock.calls.filter(([args]) => args.where.externalId === undefined);

beforeEach(() => {
  resetPrismaMock();
  verifyIdentityToken.mockReset();
});

describe("socialLogin — returning users", () => {
  it("resolves by (provider, externalId) rather than by email", async () => {
    verifyIdentityToken.mockResolvedValue(identity({ email: "new-address@example.com" }));
    // Same person, but they changed their address at the IdP since signing up.
    onLookup({ byIdentity: storedUser({ provider: "google", externalId: "google-sub-1" }) });

    const result = await googleLogin({ idToken: "tok" });

    expect(result.user.id).toBe(4);
    // The email lookup is a *linking* step. Running it for an already-linked
    // account would let a changed IdP address silently match someone else's row.
    expect(emailLookups()).toHaveLength(0);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("opens a refresh session for the device that signed in", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({ byIdentity: storedUser({ provider: "google", externalId: "google-sub-1" }) });

    const result = await googleLogin({ idToken: "tok" }, { userAgent: "Firefox/141.0" });

    expect(result.refreshToken).toBeTruthy();
    expect(prisma.refreshSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 4, userAgent: "Firefox/141.0" }),
      })
    );
  });

  it("never returns the stored password hash", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({ byIdentity: storedUser({ provider: "google", externalId: "google-sub-1" }) });

    const result = await googleLogin({ idToken: "tok" });

    expect(JSON.stringify(result.user)).not.toContain("$argon2");
  });
});

describe("socialLogin — linking to an existing account", () => {
  it("links a verified identity to the existing password account for that address", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    const existing = storedUser();
    onLookup({ byEmail: existing });
    prisma.user.update.mockResolvedValue({ ...existing, provider: "google", externalId: "google-sub-1" });

    const result = await googleLogin({ idToken: "tok" });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: expect.objectContaining({
          provider: "google",
          externalId: "google-sub-1",
          emailVerified: true,
        }),
      })
    );
    expect(result.user.id).toBe(4);
  });

  // The whole reason emailVerified is threaded through from the verifier. An IdP
  // that lets a user assert an arbitrary unverified address would otherwise hand
  // over any local account just by claiming its email.
  it("refuses to link an UNVERIFIED identity to an existing account", async () => {
    verifyIdentityToken.mockResolvedValue(identity({ emailVerified: false }));
    onLookup({ byEmail: storedUser() });

    await expect(googleLogin({ idToken: "tok" })).rejects.toMatchObject({ statusCode: 401 });

    expect(emailLookups()).toHaveLength(0);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not overwrite a profile photo the user already has", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({
      byIdentity: storedUser({
        provider: "google",
        externalId: "google-sub-1",
        profilePhoto: "https://cdn.example.com/theirs.jpg",
      }),
    });

    await googleLogin({ idToken: "tok" });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("backfills a missing profile photo from the provider", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    const linked = storedUser({ provider: "google", externalId: "google-sub-1", profilePhoto: null });
    onLookup({ byIdentity: linked });
    prisma.user.update.mockResolvedValue({ ...linked, profilePhoto: identity().picture });

    const result = await googleLogin({ idToken: "tok" });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: { profilePhoto: "https://cdn.example.com/a.jpg" },
      })
    );
    expect(result.user.profilePhoto).toBe("https://cdn.example.com/a.jpg");
  });
});

describe("socialLogin — first-time sign-up", () => {
  it("creates a passwordless candidate account for a verified identity", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      storedUser({ password: null, provider: "google", externalId: "google-sub-1", emailVerified: true })
    );

    const result = await googleLogin({ idToken: "tok" });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "candidate@example.com",
          password: null,
          role: "candidate",
          provider: "google",
          externalId: "google-sub-1",
          emailVerified: true,
        }),
      })
    );
    expect(result.accessToken).toBeTruthy();
  });

  it("refuses to create an account for an unverified address", async () => {
    verifyIdentityToken.mockResolvedValue(identity({ emailVerified: false }));
    onLookup({});

    await expect(googleLogin({ idToken: "tok" })).rejects.toMatchObject({ statusCode: 401 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // Every lookup filters d_status, so a soft-deleted row is invisible to them
  // while still holding the address under a unique constraint. Without this
  // check the create below fails on the constraint with an opaque 500.
  it("reports a deactivated account instead of failing on the unique constraint", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({});
    prisma.user.findUnique.mockResolvedValue(storedUser({ d_status: "deleted" }));

    await expect(googleLogin({ idToken: "tok" })).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("socialLogin — provider routing", () => {
  it("passes the caller's provider and token through to the verifier", async () => {
    verifyIdentityToken.mockResolvedValue(identity({ provider: "microsoft", externalId: "entra-oid-1" }));
    onLookup({ byIdentity: storedUser({ provider: "microsoft", externalId: "entra-oid-1" }) });

    await microsoftLogin({ idToken: "ms-token" });

    expect(verifyIdentityToken).toHaveBeenCalledWith("microsoft", "ms-token");
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ provider: "microsoft" }) })
    );
  });

  // Google Identity Services names the field `credential`; MSAL names it
  // `idToken`. The route accepts either, so both have to reach the verifier.
  it("accepts Google Identity Services' `credential` field as well as `idToken`", async () => {
    verifyIdentityToken.mockResolvedValue(identity());
    onLookup({ byIdentity: storedUser({ provider: "google", externalId: "google-sub-1" }) });

    await googleLogin({ credential: "gis-credential" });

    expect(verifyIdentityToken).toHaveBeenCalledWith("google", "gis-credential");
  });
});
