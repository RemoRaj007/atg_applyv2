-- Replaces User.refreshTokenId with a per-device session table.
--
-- The single-column design (added earlier the same day) held one jti per user
-- and overwrote it on every login, so signing in on a second device silently
-- invalidated the first at its next refresh. Sessions are per-device, so the
-- store has to be too.
--
-- Rows are kept after rotation rather than deleted: a rotated token being
-- presented again is how token theft is detected.

CREATE TABLE "RefreshSession" (
  "id"        TEXT         NOT NULL,
  "userId"    INTEGER      NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "rotatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "userAgent" TEXT,

  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefreshSession_userId_idx"    ON "RefreshSession" ("userId");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession" ("expiresAt");

ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Dropping this ends every session issued against it. That is the correct
-- outcome: those tokens were minted under the single-session rule and there is
-- no honest way to migrate them into per-device rows. Affected users sign in
-- again once. The column is hours old and holds no durable data.
ALTER TABLE "User" DROP COLUMN "refreshTokenId";
