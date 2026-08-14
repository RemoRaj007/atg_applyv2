const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const authService = require("./auth.service");
const parseDurationToMs = require("../../utils/parseDuration");
const readCookie = require("../../utils/readCookie");

const REFRESH_COOKIE_NAME = "refreshToken";
// In production the frontend (Cloudflare Pages) and this API (Vercel) are on
// different sites, so the refresh cookie is sent cross-site. SameSite=Lax would
// make the browser withhold it, breaking session restore on reload and every
// token refresh. SameSite=None permits that, and requires Secure.
// Keyed off VERCEL as well as NODE_ENV: the deployed API always runs on Vercel,
// so the cookie stays correct even if NODE_ENV is not set there.
const isCrossSite = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: isCrossSite,
  sameSite: isCrossSite ? "none" : "lax",
  maxAge: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
});

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { statusCode: 201, message: "Account created", data: { user, accessToken } });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { message: "Logged in", data: { user, accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken } = await authService.refresh(readCookie(req, REFRESH_COOKIE_NAME));
  sendSuccess(res, { message: "Token refreshed", data: { user, accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  sendSuccess(res, { message: "Logged out" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: "If an account with that email exists, a password reset link has been sent." });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, { message: "Password has been successfully reset." });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { alreadyVerified } = await authService.verifyEmail(req.body.token);
  sendSuccess(res, {
    message: alreadyVerified ? "Email already verified." : "Email verified successfully.",
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  sendSuccess(res, { message: "If that account needs verifying, a new link has been sent." });
});

const googleLogin = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.googleLogin(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { message: "Authenticated with Google", data: { user, accessToken } });
});

const microsoftLogin = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.microsoftLogin(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { message: "Authenticated with Microsoft", data: { user, accessToken } });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  microsoftLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
