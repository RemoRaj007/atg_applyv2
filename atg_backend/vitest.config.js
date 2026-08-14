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
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    restoreMocks: true,
  },
});
