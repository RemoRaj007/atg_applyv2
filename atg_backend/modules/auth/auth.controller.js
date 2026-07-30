const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const authService = require("./auth.service");
const parseDurationToMs = require("../../utils/parseDuration");

const REFRESH_COOKIE_NAME = "refreshToken";
// In production the frontend (Cloudflare Pages) and this API (Vercel) are on
// different sites, so the refresh cookie is sent cross-site. SameSite=Lax would
// make the browser withhold it, breaking session restore on reload and every
// token refresh. SameSite=None permits that, and requires Secure.
const isCrossSite = process.env.NODE_ENV === "production";
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
  const { user, accessToken } = await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
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

const googleLogin = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.googleLogin(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { message: "Authenticated with Google", data: { user, accessToken } });
});

module.exports = { register, login, refresh, logout, googleLogin, forgotPassword, resetPassword };
