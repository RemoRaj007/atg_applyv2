const express = require("express");
const authController = require("./auth.controller");
const validate = require("../../middlewares/validations/validate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");
const requireTrustedOrigin = require("../../middlewares/csrf.middleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, googleSchema, microsoftSchema } = require("./auth.schema");

const router = express.Router();

// These are the only endpoints reachable without a token, and each one is worth
// hammering: login for credential stuffing, register for bulk account
// creation, and the reset pair for mail flooding and token guessing. Budgets are
// generous enough for a person mistyping their password and far too small for a
// script. See middlewares/rateLimit.middleware.js for the serverless caveat.
const loginLimiter = rateLimit({ name: "auth:login", windowMs: 15 * 60 * 1000, max: 10 });
const registerLimiter = rateLimit({ name: "auth:register", windowMs: 60 * 60 * 1000, max: 10 });
const resetLimiter = rateLimit({ name: "auth:reset", windowMs: 60 * 60 * 1000, max: 10 });
const socialLimiter = rateLimit({ name: "auth:social", windowMs: 15 * 60 * 1000, max: 30 });
const refreshLimiter = rateLimit({ name: "auth:refresh", windowMs: 15 * 60 * 1000, max: 120 });

router.post("/register", registerLimiter, validate(registerSchema), authController.register);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/google", socialLimiter, validate(googleSchema), authController.googleLogin);
router.post("/microsoft", socialLimiter, validate(microsoftSchema), authController.microsoftLogin);
// These two are the only routes that act on the refresh cookie alone, with no
// Authorization header — so they are the only ones a cross-site page could drive
// using credentials the browser attaches by itself. Everything else on this API
// authenticates with a Bearer token, which no browser sends on an attacker's
// behalf. See middlewares/csrf.middleware.js.
router.post("/refresh", refreshLimiter, requireTrustedOrigin, authController.refresh);
router.post("/logout", requireTrustedOrigin, authController.logout);
router.post("/forgot-password", resetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", resetLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
