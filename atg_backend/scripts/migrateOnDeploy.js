/**
 * Applies pending migrations during the Vercel build.
 *
 * Merging a migration used to ship code that expected columns the database did
 * not have — `prisma generate` regenerates the client but never touches the
 * database — so every query touching the new table or column answered 500 while
 * the deployment itself looked healthy.
 *
 * The connection matters. Prisma takes an advisory lock for the duration of a
 * migration, and Supabase's transaction pooler (port 6543) cannot hold one:
 * it hands each statement to a different backend, so the lock is taken and
 * dropped and two concurrent builds can interleave. Migrations therefore run
 * over the session/direct connection, which is what POSTGRES_URL_NON_POOLING is.
 * The pooled DATABASE_URL stays untouched — it is what the app uses at runtime.
 *
 * Run: node scripts/migrateOnDeploy.js
 */

require("dotenv").config();

const { execFileSync } = require("child_process");

// In preference order. MIGRATE_DATABASE_URL is the explicit override and wins,
// so a deploy can be pointed at a different database without touching the
// integration-managed variables.
const CANDIDATES = ["MIGRATE_DATABASE_URL", "POSTGRES_URL_NON_POOLING", "DIRECT_URL"];

/** True for a connection string that routes through a transaction pooler. */
const isTransactionPooler = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.port === "6543") return true;
    // Supabase and Neon both signal the pooler in the query string rather than
    // only in the port, and Vercel's POSTGRES_PRISMA_URL carries it.
    const params = parsed.searchParams;
    return params.get("pgbouncer") === "true" || params.has("pool_timeout");
  } catch {
    return false;
  }
};

const redact = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "(unparseable connection string)";
  }
};

const resolveMigrationUrl = (env = process.env) => {
  for (const name of CANDIDATES) {
    const value = (env[name] || "").trim();
    if (!value) continue;
    if (isTransactionPooler(value)) {
      throw new Error(
        `${name} points at a transaction pooler (${redact(value)}).\n` +
          "Migrations need a session/direct connection — Prisma's advisory lock cannot be held\n" +
          "through a transaction pooler. Use the non-pooling string (port 5432)."
      );
    }
    return { name, url: value };
  }

  // Failing is deliberate. A build that skips migrations succeeds and then
  // serves 500s, which is the failure this script exists to prevent — better a
  // red build with this message than a green one that half-works.
  throw new Error(
    "No session-mode connection string for migrations.\n" +
      `Set one of: ${CANDIDATES.join(", ")}.\n` +
      "On Vercel with the Supabase integration, POSTGRES_URL_NON_POOLING is already provided —\n" +
      "make sure it is exposed to this project's build environment.\n" +
      "DATABASE_URL is intentionally not used: it is the pooled runtime connection."
  );
};

const main = () => {
  const { name, url } = resolveMigrationUrl();
  console.log(`Applying migrations using ${name} (${redact(url)})`);

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    // Only this child sees the session connection; the app's own DATABASE_URL
    // is left exactly as the platform set it.
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("Migrations applied.");
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\nMigration step failed.\n${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { resolveMigrationUrl, isTransactionPooler, redact, CANDIDATES };
