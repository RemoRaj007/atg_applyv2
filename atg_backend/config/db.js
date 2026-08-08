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

// Cache in every environment, production included. Serverless is where reuse
// matters most: module scope survives between warm invocations, so skipping the
// cache in production meant each cold module init built a fresh client and its
// own connection — the opposite of what the pooled connection string is for.
globalForPrisma.__atgPrisma = prisma;

module.exports = { prisma };
