const crypto = require("crypto");
const express = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { securityLogger } = require("../../config/atg_logger");
const jobFeedSync = require("../jobs/jobFeedSync.service");

// Endpoints Vercel Cron calls on the schedule in vercel.json. Vercel sends
// `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project.
//
// Fails closed: with no CRON_SECRET configured, these refuse every caller.
// Otherwise the URL alone would let anyone trigger third-party API calls and
// a burst of database writes on our account.

const router = express.Router();

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

router.use((req, res, next) => {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.get("authorization") || "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    securityLogger.security("Cron endpoint refused", { path: req.originalUrl, configured: Boolean(secret) });
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
  return next();
});

router.get(
  "/job-sync",
  asyncHandler(async (req, res) => {
    sendSuccess(res, { message: "Job feeds synced", data: await jobFeedSync.syncFeeds({ trigger: "cron" }) });
  })
);

module.exports = router;
