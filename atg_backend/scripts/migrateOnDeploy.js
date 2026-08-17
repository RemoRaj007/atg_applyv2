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

  return null;
};

const NOT_CONFIGURED = [
  "No session-mode connection string for migrations, so none were applied.",
  `Set one of: ${CANDIDATES.join(", ")} in the BUILD environment.`,
  "On Vercel with the Supabase integration, POSTGRES_URL_NON_POOLING is usually present —",
  "check it is exposed to builds, not only to runtime.",
  "DATABASE_URL is intentionally not used: it is the pooled runtime connection.",
  "",
  "The deploy continues. If this release added a migration, the database is now behind",
  "the code and queries touching new columns will fail — apply it by hand:",
  "  DATABASE_URL='<session-pooler-string>' npx prisma migrate deploy",
].join("\n");

/** Prints a banner that survives a wall of build output. */
const warn = (message) => {
  console.warn(`\n${"!".repeat(72)}\n${message}\n${"!".repeat(72)}\n`);
};

const PREFLIGHT_TIMEOUT_MS = 10000;

/**
 * Can we reach the database at all?
 *
 * Separating this from the migration is what lets an unreachable database warn
 * while a genuinely failing migration stops the build. It matters here because
 * the non-pooling string Supabase hands out is often the direct host, which is
 * IPv6-only unless the IPv4 add-on is on — unreachable from many build runners,
 * and a network problem is not a reason to take the deployment down.
 */
const canConnect = async (url) => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: url, connectionTimeoutMillis: PREFLIGHT_TIMEOUT_MS });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  } finally {
    await client.end().catch(() => {});
  }
};

const main = async () => {
  // A configuration gap must not take the deployment down: failing here blocks
  // every deploy, including ones that add no migration at all, which is a worse
  // outage than the drift it guards against. Config problems warn; only a
  // migration that actually fails to apply stops the build, because shipping
  // half an applied migration is not recoverable by redeploying.
  let resolved;
  try {
    resolved = resolveMigrationUrl();
  } catch (error) {
    warn(`${error.message}\n\nThe deploy continues; no migrations were applied.`);
    return;
  }

  if (!resolved) {
    warn(NOT_CONFIGURED);
    return;
  }

  const { name, url } = resolved;
  console.log(`Applying migrations using ${name} (${redact(url)})`);

  const reachable = await canConnect(url);
  if (!reachable.ok) {
    warn(
      [
        `${name} is set but the database could not be reached: ${reachable.reason}`,
        "",
        "If this is the direct host (db.<ref>.supabase.co), Supabase serves it over IPv6 only",
        "unless the IPv4 add-on is enabled, which many build runners cannot use. Set",
        "MIGRATE_DATABASE_URL to the IPv4-reachable session pooler string (port 5432) —",
        "it is checked first and wins.",
        "",
        "The deploy continues; no migrations were applied.",
      ].join("\n")
    );
    return;
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    // Only this child sees the session connection; the app's own DATABASE_URL
    // is left exactly as the platform set it.
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("Migrations applied.");
};

if (require.main === module) {
  main().catch((error) => {
    // Reached only when `prisma migrate deploy` itself failed against a
    // database we had already connected to — a broken migration, which must
    // stop the build rather than ship half-applied.
    console.error(`\nMigration step failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { resolveMigrationUrl, isTransactionPooler, redact, canConnect, CANDIDATES };
