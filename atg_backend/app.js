require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");

const { prisma } = require("./config/db");
const { systemLogger } = require("./config/atg_logger");
const notFound = require("./middlewares/notFound.middleware");
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
const logRoutes = require("./modules/logs/log.routes");
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
app.use(express.json());
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = origin.startsWith("http://localhost:") ||
                          origin.startsWith("https://localhost:") ||
                          origin.startsWith("http://127.0.0.1:");
      if (isLocalhost || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  })
);

// NOTE: local disk storage does not persist across Vercel invocations/deploys.
// Kept for local development; production uploads should go through Supabase
// Storage instead (see atg_backend/middlewares/upload.middleware.js).
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send("ATG Apply Backend API (Postgres/Supabase via Prisma) is running");
  } catch (err) {
    systemLogger.error("Database health check failed", { stack: err.stack });
    res.status(500).send("Database connection error");
  }
});

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
app.use("/api/logs", logRoutes);
app.use("/api/profile-columns", profileColumnRoutes);
app.use("/api/profile-values", profileValueRoutes);
app.use("/api/job-forms", jobFormRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/job-roles", require("./modules/jobRoles/jobRole.routes"));
app.use("/api/user-profile", userProfileRoutes);
app.use("/api/anonymous-discovery", require("./modules/anonymous-discovery/anonymous-discovery.routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
