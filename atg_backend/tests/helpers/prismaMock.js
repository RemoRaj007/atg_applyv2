import { vi } from "vitest";

// A stand-in for the Prisma client. Every model/method pair is a vi.fn() with a
// harmless default, so a test only has to program the calls it actually cares
// about — including the fire-and-forget logEntry writes the Winston transport
// makes on every request.
const READ_ONE = ["findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow"];
const READ_MANY = ["findMany"];
const COUNTS = ["count"];
const WRITE_MANY = ["createMany", "updateMany", "deleteMany"];
const WRITE_ONE = ["create", "update", "upsert", "delete"];
const METHODS = [...READ_ONE, ...READ_MANY, ...COUNTS, ...WRITE_MANY, ...WRITE_ONE, "aggregate", "groupBy"];

const defaultFor = (method) => {
  if (READ_ONE.includes(method)) return null;
  if (READ_MANY.includes(method) || method === "groupBy") return [];
  if (COUNTS.includes(method)) return 0;
  if (WRITE_MANY.includes(method)) return { count: 0 };
  if (method === "aggregate") return {};
  return {};
};

const buildModel = () => {
  const model = {};
  for (const method of METHODS) {
    model[method] = vi.fn(async () => defaultFor(method));
  }
  // Prisma field references — `prisma.user.fields.appsTotal` — let a where clause
  // compare two columns of the same row, which is how the quota claim stays a
  // single atomic UPDATE. The real client exposes a descriptor object here; a
  // test only needs it to be a stable, inspectable value.
  model.fields = new Proxy(
    {},
    { get: (_t, name) => (typeof name === "string" ? { _fieldRef: name } : undefined) }
  );
  return model;
};

// Suites share one worker process, and config/db.js caches the client it is
// handed on globalThis. Anchoring the mock's state there too means every suite's
// import and the app's cached client are the same object — otherwise the second
// suite to run programs a mock the app is not using.
const state =
  globalThis.__atgPrismaMockState ||
  (globalThis.__atgPrismaMockState = {
    models: new Map(),
    client: {
      $queryRaw: vi.fn(async () => [{ ok: 1 }]),
      $executeRaw: vi.fn(async () => 0),
      $transaction: vi.fn(async (arg) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg))),
      $connect: vi.fn(async () => undefined),
      $disconnect: vi.fn(async () => undefined),
    },
  });

// Proxy so a model referenced by a service that no test has touched yet still
// resolves, instead of blowing up with "cannot read property of undefined".
export const prisma =
  globalThis.__atgPrismaMock ||
  (globalThis.__atgPrismaMock = new Proxy(state.client, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== "string" || prop.startsWith("$") || prop === "then") return undefined;
      if (!state.models.has(prop)) state.models.set(prop, buildModel());
      return state.models.get(prop);
    },
  }));

// Restores every programmed implementation to its default. Call in beforeEach.
export const resetPrismaMock = () => {
  for (const model of state.models.values()) {
    for (const method of METHODS) {
      model[method].mockReset();
      model[method].mockImplementation(async () => defaultFor(method));
    }
  }
  state.client.$queryRaw.mockReset().mockImplementation(async () => [{ ok: 1 }]);
  state.client.$transaction
    .mockReset()
    .mockImplementation(async (arg) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg)));
};

export default { prisma, resetPrismaMock };
