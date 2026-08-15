import { describe, it, expect, beforeEach, afterEach } from "vitest";

// config/db.js reuses globalThis.__atgPrisma when set; seeding it before the
// service is required is how this suite hands a mock client to the CommonJS
// require graph (see tests/helpers/app.js).
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
globalThis.__atgPrisma = prisma;

const service = await import("../../modules/anonymous-discovery/anonymous-discovery.service.js");

const PROFILE = {
  id: 7,
  targetRole: "Software Engineer",
  industry: "Technology",
  skillsKeywords: "react,node",
  remotePreference: "any",
  experienceYears: 3,
  operators: [],
};

describe("runJobDiscovery — simulated market gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPrismaMock();
    prisma.anonymousDiscoveryProfile.findUnique.mockResolvedValue(PROFILE);
    prisma.anonymousJobMatch.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    delete process.env.APIFY_API_KEY;
    delete process.env.ALLOW_MOCK_JOB_DISCOVERY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // The bug this guards: with no Apify key, discovery used to invent listings at
  // https://mock-market-jobs.atgapply.com and the UI linked them as real, so a
  // candidate could "apply" to a job that does not exist.
  it("returns no matches, and writes none, when the key is absent and mocks are off", async () => {
    const result = await service.runJobDiscovery(7);

    expect(result.marketSearchUnavailable).toBe(true);
    expect(result.matches).toEqual([]);
    expect(prisma.anonymousJobMatch.create).not.toHaveBeenCalled();
    // Existing matches must survive a run that searched nothing.
    expect(prisma.anonymousJobMatch.deleteMany).not.toHaveBeenCalled();
  });

  it("treats a mock placeholder key the same as no key", async () => {
    process.env.APIFY_API_KEY = "mock";
    const result = await service.runJobDiscovery(7);
    expect(result.marketSearchUnavailable).toBe(true);
    expect(result.matches).toEqual([]);
  });

  it("serves simulated jobs only when ALLOW_MOCK_JOB_DISCOVERY is explicitly true", async () => {
    process.env.ALLOW_MOCK_JOB_DISCOVERY = "true";
    const result = await service.runJobDiscovery(7);

    expect(result.marketSearchUnavailable).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(prisma.anonymousJobMatch.deleteMany).toHaveBeenCalled();
  });

  it("does not accept a non-'true' value as an opt-in", async () => {
    for (const value of ["1", "yes", "on", ""]) {
      process.env.ALLOW_MOCK_JOB_DISCOVERY = value;
      const result = await service.runJobDiscovery(7);
      expect(result.marketSearchUnavailable).toBe(true);
    }
  });
});
