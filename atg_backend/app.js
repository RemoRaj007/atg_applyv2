require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");

const { prisma } = require("./config/db");
const { systemLogger } = require("./config/atg_logger");
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
// Set FRONTEND_URL (comma-separated) to add further origins. The defaults below
// are what production actually runs on, so the API answers the frontend even when
// FRONTEND_URL is unset or incomplete.
//
// The custom domain must be listed explicitly: it matches neither Cloudflare
// pattern, so before it was added here sign-up and sign-in were dead in
// production. Those requests send Content-Type: application/json, which triggers
// a CORS preflight; the preflight came back without CORS headers and the browser
// dropped the real request, so nothing ever reached this server. (Token refresh
// kept working and masked the breakage — it is a simple request, so it needs no
// preflight.) Keep this list in sync with the domains bound in Cloudflare.
const PRODUCTION_ORIGINS = ["https://atgapply.atgconcordia.com"];

// The generated Cloudflare hostnames differ by deploy target:
//   Workers: <worker>.<account-subdomain>.workers.dev
//   Pages:   [<deploy-hash>.]<project>.pages.dev
const CLOUDFLARE_PROJECT = "atgapplyv2";
const CLOUDFLARE_ORIGIN_PATTERNS = [
  new RegExp(`^https://(?:[a-z0-9-]+\\.)?${CLOUDFLARE_PROJECT}\\.pages\\.dev$`),
  new RegExp(`^https://${CLOUDFLARE_PROJECT}\\.[a-z0-9-]+\\.workers\\.dev$`),
];

const stripTrailingSlash = (value) => value.replace(/\/$/, "");

const allowedOrigins = new Set(
  [
    ...PRODUCTION_ORIGINS,
    ...(process.env.FRONTEND_URL || "").split(","),
  ]
    .map((o) => o.trim())
    .filter(Boolean)
    .map(stripTrailingSlash)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = origin.startsWith("http://localhost:") ||
                          origin.startsWith("https://localhost:") ||
                          origin.startsWith("http://127.0.0.1:");
      const isCloudflare = CLOUDFLARE_ORIGIN_PATTERNS.some((re) => re.test(origin));
      if (isLocalhost || isCloudflare || allowedOrigins.has(stripTrailingSlash(origin))) {
        return callback(null, true);
      }
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
app.use("/uploads", express.static(path.join(__dirname, "uploads"), uploadStaticOptions));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), uploadStaticOptions));

app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send("ATG Apply Backend API (Postgres/Supabase via Prisma) is running");
  } catch (err) {
    systemLogger.error("Database health check failed", { stack: err.stack });
    res.status(500).send("Database connection error");
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
