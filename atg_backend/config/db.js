const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// Supabase Postgres. Use the pooled connection string (port 6543, pgbouncer) for
// DATABASE_URL in serverless/Vercel deployments to avoid exhausting Postgres'
// connection limit across concurrently invoked function instances.
const connectionString = process.env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis;

// Reuse a single PrismaClient across invocations in serverless environments
// (module scope is cached between warm invocations on Vercel).
const prisma = globalForPrisma.__atgPrisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__atgPrisma = prisma;
}

module.exports = { prisma };
