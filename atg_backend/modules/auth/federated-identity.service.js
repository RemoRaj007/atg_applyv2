const ApiError = require("../../utils/ApiError");
const { securityLogger } = require("../../config/atg_logger");

// Verifies ID tokens from the supported identity providers and normalises them
// into a single shape:
//   { provider, externalId, email, emailVerified, name, picture }
//
// Every provider here must do three things before a token is trusted:
//   1. verify the signature against the provider's published keys,
//   2. check the audience is *our* client id — otherwise a token minted for any
//      other app registered with the same IdP can be replayed against us,
//   3. report whether the IdP considers the email address verified, so the
//      caller can decide whether auto-linking to an existing account is safe.

const requireEnv = (name, provider) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    // Fail closed. The previous Google implementation fell back to an
    // unauthenticated tokeninfo lookup when its client id was missing, which
    // skipped the audience check entirely.
    throw ApiError.badRequest(`${provider} sign-in is not configured on this server`);
  }
  return value.trim();
};

const verifyGoogle = async (token) => {
  const clientId = requireEnv("GOOGLE_CLIENT_ID", "Google");

  const { OAuth2Client } = require("google-auth-library");
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: token, audience: clientId });
  const payload = ticket.getPayload();

  return {
    provider: "google",
    externalId: payload.sub,
    email: payload.email,
    // Google sends this as a real boolean or the string "true" depending on flow.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name,
    picture: payload.picture,
  };
};

// Entra ID has no tokeninfo-style endpoint, so the token is verified against the
// tenant's published JWKS. The deployment accepts work/school *and* personal
// accounts, so the issuer is not a single fixed string: each tenant issues under
// its own id. We therefore verify that the issuer matches the token's own `tid`
// claim, which is the documented multi-tenant validation rule.
const MICROSOFT_ISSUER = (tid) => `https://login.microsoftonline.com/${tid}/v2.0`;

// Well-known tenant id that every personal (consumer) Microsoft account signs in under.
const MICROSOFT_CONSUMERS_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

let jwksCache = null;
const getMicrosoftJwks = () => {
  if (!jwksCache) {
    const { createRemoteJWKSet } = require("jose");
    // The common endpoint publishes the signing keys for every tenant.
    jwksCache = createRemoteJWKSet(
      new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
    );
  }
  return jwksCache;
};

const verifyMicrosoft = async (token) => {
  const clientId = requireEnv("MICROSOFT_CLIENT_ID", "Microsoft");
  const { jwtVerify } = require("jose");

  const { payload } = await jwtVerify(token, getMicrosoftJwks(), {
    audience: clientId,
  });

  if (!payload.tid) {
    throw new Error("Microsoft token is missing the tid claim");
  }
  if (payload.iss !== MICROSOFT_ISSUER(payload.tid)) {
    throw new Error(`Microsoft token issuer ${payload.iss} does not match its tenant`);
  }

  // A tenant may be pinned by setting MICROSOFT_TENANT_ID; left unset, any
  // work/school or personal account is accepted.
  const allowedTenant = process.env.MICROSOFT_TENANT_ID?.trim();
  if (allowedTenant && allowedTenant !== "common" && payload.tid !== allowedTenant) {
    throw new Error(`Microsoft tenant ${payload.tid} is not permitted`);
  }

  // Entra puts the address in preferred_username for most account types; `email`
  // is only present when the profile carries one.
  const email = payload.email || payload.preferred_username;

  return {
    provider: "microsoft",
    // `oid` is stable per user per tenant; `sub` is per-application, so oid is
    // the right durable identifier to store.
    externalId: payload.oid || payload.sub,
    email,
    // Entra does not emit email_verified. Addresses in a managed (work/school)
    // tenant are controlled by that tenant's directory and are treated as
    // verified; personal accounts are not, since a consumer account's address
    // is self-asserted and must not silently link to an existing account.
    emailVerified: payload.tid !== MICROSOFT_CONSUMERS_TENANT,
    name: payload.name,
    picture: null,
  };
};

const VERIFIERS = { google: verifyGoogle, microsoft: verifyMicrosoft };

const verifyIdentityToken = async (provider, token) => {
  if (!token) {
    throw ApiError.badRequest(`${provider} ID token is required`);
  }

  // hasOwn, not a plain lookup: `VERIFIERS["constructor"]` resolves up the
  // prototype chain to Object, which is callable and would be invoked as a
  // verifier. It happens to fail harmlessly a few lines down when the result has
  // no email, but only by accident — this makes the intent the actual rule.
  const verifier = Object.hasOwn(VERIFIERS, provider) ? VERIFIERS[provider] : null;
  if (!verifier) {
    throw ApiError.badRequest(`Unsupported sign-in provider: ${provider}`);
  }

  let identity;
  try {
    identity = await verifier(token);
  } catch (err) {
    // ApiError means a configuration problem we already described; anything else
    // is a bad token and must stay opaque to the caller.
    if (err instanceof ApiError) throw err;
    securityLogger.security(`${provider} login failed: token verification failed`, {
      error: err.message,
    });
    throw ApiError.unauthorized(`${provider} authentication failed. Invalid token.`);
  }

  if (!identity.email) {
    throw ApiError.badRequest(`${provider} account must have an email address`);
  }
  if (!identity.externalId) {
    throw ApiError.badRequest(`${provider} account is missing a stable identifier`);
  }

  return identity;
};

module.exports = { verifyIdentityToken, MICROSOFT_CONSUMERS_TENANT };
