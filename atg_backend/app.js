require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");

const { prisma } = require("./config/db");
const { systemLogger } = require("./config/atg_logger");
const { isAllowedOrigin } = require("./config/origins");
const notFound = require("./middlewares/notFound.middleware");
const rateLimit = require("./middlewares/rateLimit.middleware");
const errorHandler = require("./middlewares/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/atg_user.routes");
const jobRoutes = require("./modules/jobs/job.routes");
const applicationRoutes = require("./modules/applications/application.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const scholarshipRoutes = require("./modules/scholarships/scholarship.routes");
const teamRoutes = require("./modules/team/team.routes");
const companyRoutes = require("./modules/companies/company.routes");
const requestRoutes = require("./modules/requests/request.routes");
const profileColumnRoutes = require("./modules/profile-columns/profile-column.routes");
const profileValueRoutes = require("./modules/profile-values/profile-value.routes");
const jobFormRoutes = require("./modules/job-forms/job-form.routes");
const skillRoutes = require("./modules/skills/skill.routes");
const userProfileRoutes = require("./modules/user-profile/user-profile.routes");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cookieParser());
// Bounded so a single request cannot force the process to buffer an arbitrary
// payload. The largest legitimate JSON body is a job description plus its
// requirements, which is well inside this; file uploads go through multer.
app.use(express.json({ limit: "256kb" }));
// The allowlist itself lives in config/origins.js, shared with the CSRF origin
// check so the two cannot drift apart.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      // Signal "no CORS headers" rather than throwing: throwing reaches the error
      // handler and returns a 500, which masks the real reason in the browser.
      // Note the preflight still returns 2xx — it just carries no CORS headers, so
      // the browser drops the follow-up request without ever sending it.
      return callback(null, false);
    },
    credentials: true,
  })
);

// NOTE: local disk storage does not persist across Vercel invocations/deploys.
// Kept for local development; production uploads should go through Supabase
// Storage instead (see atg_backend/middlewares/upload.middleware.js).
//
// These files are user-supplied, so they are served as downloads and never
// rendered inline on this origin: an uploaded document that the browser decided
// to treat as HTML would otherwise run as script with the API's origin.
const uploadStaticOptions = {
  index: false,
  dotfiles: "deny",
  setHeaders: (res) => {
    res.setHeader("Content-Disposition", "attachment");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  },
};
// Serving files off disk, unauthenticated, and /uploads sits outside the
// API-wide ceiling further down — so without this it is the one route that will
// read from the filesystem as fast as it is asked to.
const uploadsLimiter = rateLimit({ name: "uploads", windowMs: 15 * 60 * 1000, max: 300 });

app.use("/uploads", uploadsLimiter, express.static(path.join(__dirname, "uploads"), uploadStaticOptions));
app.use("/api/uploads", uploadsLimiter, express.static(path.join(__dirname, "uploads"), uploadStaticOptions));

// Limited for the same reason as /api/health: unauthenticated, and it opens a
// database connection per request. It sits outside /api, so the API-wide
// ceiling below does not cover it.
app.get("/", rateLimit({ name: "root", windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send("ATG Apply Backend API (Postgres/Supabase via Prisma) is running");
  } catch (err) {
    systemLogger.error("Database health check failed", { stack: err.stack });
    res.status(500).send("Database connection error");
  }
});

// A ceiling for the whole API. Until now only the auth endpoints and the
// contact form were limited, so every other router — applications, payments,
// users, profile values — could be called as fast as the network allowed by
// anyone holding a token. This is deliberately generous: it is a backstop
// against scraping and hammering, not a per-feature quota. The tighter, purpose
// -built budgets below and in the routers still apply on top of it.
app.use("/api", rateLimit({ name: "api", windowMs: 15 * 60 * 1000, max: 1000 }));

// Machine-readable health for uptime probes. `/` returns prose and is easy to
// mistake for healthy when only the database is down, so probes should watch
// this: it answers 503 when the database is unreachable, which is the condition
// worth paging on.
// Limited because it is unauthenticated and touches the database: without a cap
// it is a free way to make the API open a Supabase connection per request.
// Generous enough for a probe on a 30s interval, plus room for several probes.
app.use("/api/health", rateLimit({ name: "health", windowMs: 60 * 1000, max: 60 }));

app.get("/api/health", async (req, res) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      checks: { database: { status: "ok", latencyMs: Date.now() - startedAt } },
    });
  } catch (err) {
    systemLogger.error("Health check failed", { stack: err.stack });
    res.status(503).json({
      status: "degraded",
      uptime: Math.round(process.uptime()),
      checks: { database: { status: "error" } },
    });
  }
});

// Without this the contact form is an open relay into the team's inbox: no
// account needed, one email sent per request. Per-endpoint auth limits live in
// modules/auth/auth.routes.js.
app.use("/api/contact", rateLimit({ name: "contact", windowMs: 60 * 60 * 1000, max: 10 }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-options", require("./modules/payment-options/payment-option.routes"));
app.use("/api/notifications", notificationRoutes);
app.use("/api/scholarships", scholarshipRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/profile-columns", profileColumnRoutes);
app.use("/api/profile-values", profileValueRoutes);
app.use("/api/job-forms", jobFormRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/job-roles", require("./modules/jobRoles/jobRole.routes"));
app.use("/api/user-profile", userProfileRoutes);
app.use("/api/anonymous-discovery", require("./modules/anonymous-discovery/anonymous-discovery.routes"));
app.use("/api/contact", require("./modules/contact/contact.routes"));
app.use("/api/logs", require("./modules/logs/log.routes"));
app.use("/api/content", require("./modules/content/content.routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
