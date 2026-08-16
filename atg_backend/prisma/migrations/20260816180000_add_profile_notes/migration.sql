-- An operator's private working notes about a candidate's profile.
--
-- A separate table rather than a column on ProfileValue: candidate facts and
-- staff opinion must not share a row, so that an operator cannot overwrite what
-- the candidate said, and so a note is never mistaken for a candidate answer
-- when the profile is read back.

CREATE TABLE "ProfileNote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "fieldCode" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "d_status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "ProfileNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileNote_userId_createdAt_idx" ON "ProfileNote"("userId", "createdAt");
CREATE INDEX "ProfileNote_authorId_idx" ON "ProfileNote"("authorId");
