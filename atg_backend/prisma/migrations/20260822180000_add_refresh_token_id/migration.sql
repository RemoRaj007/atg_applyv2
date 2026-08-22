-- Enables refresh-token rotation and server-side revocation. Previously a
-- refresh token, once issued, stayed valid for its full 7-day life no matter
-- what — logout only cleared the browser's cookie, and there was no way to
-- reject a stolen token before it expired on its own. Storing the jti of the
-- single currently-valid refresh token per user lets /refresh reject replay
-- of an already-rotated token, and lets logout/password-reset revoke a
-- session immediately.
ALTER TABLE "User" ADD COLUMN "refreshTokenId" TEXT;
