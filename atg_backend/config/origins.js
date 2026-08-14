// The single source of truth for "is this origin ours?".
//
// Two things need the answer and must not drift apart: the CORS policy, which
// decides whether a browser may read a response, and the CSRF origin check,
// which decides whether a cookie-authenticated request may be acted on at all.

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

// Keyed off VERCEL as well as NODE_ENV, matching modules/auth/auth.controller.js:
// the deployed API always runs on Vercel, so this stays correct even where
// NODE_ENV is not set.
const isProduction = () => process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

const stripTrailingSlash = (value) => value.replace(/\/$/, "");

// Read per call rather than at module load: the test suite sets FRONTEND_URL
// before importing the app, but a deployment may also change it between boots.
const configuredOrigins = () =>
  new Set(
    [...PRODUCTION_ORIGINS, ...(process.env.FRONTEND_URL || "").split(",")]
      .map((o) => o.trim())
      .filter(Boolean)
      .map(stripTrailingSlash)
  );

const isAllowedOrigin = (origin) => {
  if (!origin) return false;

  // Only outside production. With credentials, allowing any localhost origin in
  // production means a page served from a developer's — or a victim's — own
  // machine can make authenticated calls against live data.
  const isLocalhost =
    !isProduction() &&
    (origin.startsWith("http://localhost:") ||
      origin.startsWith("https://localhost:") ||
      origin.startsWith("http://127.0.0.1:"));

  if (isLocalhost) return true;
  if (CLOUDFLARE_ORIGIN_PATTERNS.some((re) => re.test(origin))) return true;
  return configuredOrigins().has(stripTrailingSlash(origin));
};

module.exports = { isAllowedOrigin, isProduction };
