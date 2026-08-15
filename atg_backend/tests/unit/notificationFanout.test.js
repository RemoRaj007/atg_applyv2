import { describe, it, expect, beforeEach } from "vitest";

import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
globalThis.__atgPrisma = prisma;

// The email side is not asserted here: these services `require` email.service
// through the CommonJS graph that vi.mock cannot reach (see tests/helpers/app.js),
// and tests/setup.js deletes EMAIL_HOST so the real sender no-ops. What is
// checked below is the database access pattern, which is what the fan-out fix
// actually changed.

const notificationService = await import("../../modules/notifications/notification.service.js");
const requestService = await import("../../modules/requests/request.service.js");

const users = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));

describe("notification fan-out", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  // Previously each recipient cost three awaited round trips — insert, re-read
  // the user for their address, send — so a broadcast was 3N sequential calls
  // inside the request, which is what risks the serverless timeout.
  it("inserts every notification in a single createMany", async () => {
    prisma.user.findMany.mockResolvedValue(users(25));

    await notificationService.notifyRoles({
      roles: ["candidate"],
      type: "job_created",
      title: "New job",
      body: "A new job was posted.",
    });

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.notification.createMany.mock.calls[0][0].data).toHaveLength(25);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("does not re-query each recipient to find their address", async () => {
    prisma.user.findMany.mockResolvedValue(users(25));

    await notificationService.notifyRoles({
      roles: ["candidate"],
      type: "job_created",
      title: "New job",
      body: "A new job was posted.",
    });

    // One query selects the recipients, addresses included, instead of a
    // findUnique per notification just to look up an address.
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.findMany.mock.calls[0][0].select).toMatchObject({
      id: true,
      name: true,
      email: true,
    });
  });

  it("writes nothing when there are no recipients", async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await notificationService.notifyCompanyUsers({
      companyId: 3,
      type: "job_approved",
      title: "Approved",
      body: "body",
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe("change request list", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  // Was a findFirst per request row.
  it("loads every target user in one batched query", async () => {
    prisma.changeRequest.findMany.mockResolvedValue([
      { id: 1, targetId: 10, createdBy: { id: 2 } },
      { id: 2, targetId: 11, createdBy: { id: 2 } },
      { id: 3, targetId: 10, createdBy: { id: 3 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 10, name: "Ada", email: "ada@example.com" },
      { id: 11, name: "Grace", email: "grace@example.com" },
    ]);

    const result = await requestService.list();

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    // The repeated targetId is asked for once.
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ id: { in: [10, 11] } });
    expect(result.map((r) => r.targetUser?.name)).toEqual(["Ada", "Grace", "Ada"]);
  });

  it("still reports a missing target as null", async () => {
    prisma.changeRequest.findMany.mockResolvedValue([
      { id: 1, targetId: 99, createdBy: { id: 2 } },
    ]);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await requestService.list();

    expect(result[0].targetUser).toBeNull();
  });

  it("skips the user query entirely when there are no requests", async () => {
    prisma.changeRequest.findMany.mockResolvedValue([]);

    expect(await requestService.list()).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
