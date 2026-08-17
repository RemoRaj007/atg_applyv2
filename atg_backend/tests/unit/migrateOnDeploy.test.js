import { describe, it, expect } from "vitest";

const { resolveMigrationUrl, isTransactionPooler, redact } = await import(
  "../../scripts/migrateOnDeploy.js"
);

const SESSION = "postgresql://postgres:pw@db.jlfyewnowimoetemzhlt.supabase.co:5432/postgres";
const POOLER = "postgresql://postgres:pw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres";
const POOLER_FLAGGED =
  "postgresql://postgres:pw@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?pgbouncer=true";

describe("isTransactionPooler", () => {
  it("recognises the pooler by port", () => {
    expect(isTransactionPooler(POOLER)).toBe(true);
  });

  // Vercel's POSTGRES_PRISMA_URL uses port 5432 but still routes through
  // pgbouncer, so the port alone is not enough to clear a connection string.
  it("recognises the pooler by its query flags", () => {
    expect(isTransactionPooler(POOLER_FLAGGED)).toBe(true);
    expect(isTransactionPooler(`${SESSION}?pool_timeout=0`)).toBe(true);
  });

  it("accepts a direct session connection", () => {
    expect(isTransactionPooler(SESSION)).toBe(false);
  });

  it("does not treat an unparseable string as a pooler", () => {
    expect(isTransactionPooler("not-a-url")).toBe(false);
  });
});

describe("resolveMigrationUrl", () => {
  it("prefers the explicit override", () => {
    expect(
      resolveMigrationUrl({
        MIGRATE_DATABASE_URL: SESSION,
        POSTGRES_URL_NON_POOLING: "postgresql://other@host:5432/db",
      })
    ).toEqual({ name: "MIGRATE_DATABASE_URL", url: SESSION });
  });

  it("falls back to the Supabase integration's non-pooling string", () => {
    expect(resolveMigrationUrl({ POSTGRES_URL_NON_POOLING: SESSION })).toMatchObject({
      name: "POSTGRES_URL_NON_POOLING",
    });
  });

  // DATABASE_URL is the pooled runtime connection. Using it here is the mistake
  // this whole script exists to prevent, so it is not a candidate at all.
  it("never falls back to DATABASE_URL", () => {
    expect(resolveMigrationUrl({ DATABASE_URL: SESSION })).toBeNull();
  });

  it("refuses a transaction pooler rather than migrating through it", () => {
    expect(() => resolveMigrationUrl({ POSTGRES_URL_NON_POOLING: POOLER })).toThrow(
      /transaction pooler/
    );
  });

  // Null rather than a throw: an unconfigured build warns and carries on, so a
  // missing variable cannot take down deploys that add no migration at all.
  it("reports nothing configured without throwing", () => {
    expect(resolveMigrationUrl({})).toBeNull();
    expect(resolveMigrationUrl({ POSTGRES_URL_NON_POOLING: "   " })).toBeNull();
  });
});

describe("redact", () => {
  it("keeps the password out of the build log", () => {
    const printed = redact(SESSION);
    expect(printed).not.toContain("pw");
    expect(printed).toContain("db.jlfyewnowimoetemzhlt.supabase.co");
  });
});
