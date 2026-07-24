const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

// Discrete connection settings, mirroring the reference backend's app/config/db.config.js
// convention, instead of a single opaque DATABASE_URL connection string.
const dbConfig = {
  HOST: process.env.DB_HOST,
  PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
};

// PrismaMariaDb expects a plain connection-config object (it builds and manages its own
// internal pool from it) — NOT a pre-built `mariadb.createPool()` instance. Passing a Pool
// here is silently misinterpreted and the adapter falls back to its own pool defaults.
const adapter = new PrismaMariaDb({
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  connectionLimit: 5,
  // MySQL 8's default caching_sha2_password auth plugin needs the server's RSA
  // public key to exchange the password over a non-SSL connection; without this,
  // the driver hangs until the pool-acquire timeout instead of failing fast.
  allowPublicKeyRetrieval: true,
  connectTimeout: 10000,
});

const prisma = new PrismaClient({ adapter });

module.exports = { prisma, dbConfig };
