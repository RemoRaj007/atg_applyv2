import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
    // The app and its services are CommonJS singletons that read process.env at
    // require time. A single fork keeps that deterministic and lets each suite
    // reset the shared Prisma mock between tests.
    //
    // Vitest 4 removed poolOptions; `maxWorkers: 1` is the replacement for the
    // old `poolOptions.forks.singleFork`. Left as poolOptions it is silently
    // ignored and suites run in parallel processes — which happened to pass,
    // but is not the setup these tests were written against.
    pool: "forks",
    maxWorkers: 1,
    restoreMocks: true,
  },
});
