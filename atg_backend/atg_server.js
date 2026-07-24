// Local development entrypoint. Not used on Vercel — see api/index.js.
const app = require("./app");
const { prisma } = require("./config/db");
const { systemLogger } = require("./config/atg_logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    systemLogger.info("Database connected (Postgres/Supabase)");
  } catch (err) {
    systemLogger.error("Database NOT connected at startup — server will still run, but DB-backed routes will fail", {
      error: err.message,
    });
  }

  app.listen(PORT, () => {
    systemLogger.info(`Server running on port ${PORT}`);
  });
};

startServer();
