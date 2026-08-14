-- Local-signup email verification. `emailVerified` already existed for the
-- SSO path (set by the identity provider); these two columns let the same flag
-- be earned by a local password account too, using the same
-- token+expiry pattern as resetPasswordToken/resetPasswordExpires.
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);
