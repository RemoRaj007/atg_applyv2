-- Turns the generic ProfileColumn/ProfileValue pair into the schema that drives
-- the 20-chapter master profile, so administrator-defined fields and the
-- candidate builder stop being two disconnected systems.
--
-- Deliberately additive. Every new column is nullable or carries a default, no
-- existing column is dropped or retyped, and existing ProfileValue rows keep
-- their meaning because repeatIndex defaults to 0. The one destructive-looking
-- step is the unique constraint on ProfileValue, which is widened rather than
-- narrowed: (userId, columnId) becomes (userId, columnId, repeatIndex). Every
-- current row has repeatIndex 0, so no pair that was unique before stops being
-- unique now.

-- CreateTable
CREATE TABLE "ProfileSection" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "d_status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "ProfileSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileSection_code_key" ON "ProfileSection"("code");
CREATE INDEX "ProfileSection_sortOrder_idx" ON "ProfileSection"("sortOrder");

-- AlterTable: schema metadata for each question.
ALTER TABLE "ProfileColumn" ADD COLUMN "code" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sectionId" INTEGER;
ALTER TABLE "ProfileColumn" ADD COLUMN "helpText" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sensitivity" TEXT NOT NULL DEFAULT 'CAREER';
ALTER TABLE "ProfileColumn" ADD COLUMN "externalAiPolicy" TEXT NOT NULL DEFAULT 'NO';
ALTER TABLE "ProfileColumn" ADD COLUMN "defaultApplicationUse" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "purpose" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "repeatableGroup" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProfileColumn" ADD COLUMN "validation" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- externalAiPolicy defaults to 'NO' for safety on a new column, but fields that
-- already existed were administrator-created career fields; leaving them all at
-- 'NO' would silently make them unusable by any approved tooling. They are set
-- to the catalogue's ordinary career default instead, and the seeded canonical
-- fields overwrite this with their real policy.
UPDATE "ProfileColumn" SET "externalAiPolicy" = 'LIMITED' WHERE "code" IS NULL;

CREATE UNIQUE INDEX "ProfileColumn_code_key" ON "ProfileColumn"("code");
CREATE INDEX "ProfileColumn_sectionId_sortOrder_idx" ON "ProfileColumn"("sectionId", "sortOrder");
CREATE INDEX "ProfileColumn_repeatableGroup_idx" ON "ProfileColumn"("repeatableGroup");

ALTER TABLE "ProfileColumn" ADD CONSTRAINT "ProfileColumn_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "ProfileSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: repeatable entries, provenance and verification.
ALTER TABLE "ProfileValue" ADD COLUMN "repeatIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProfileValue" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'candidate';
ALTER TABLE "ProfileValue" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProfileValue" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "ProfileValue" ADD COLUMN "updatedById" INTEGER;

DROP INDEX IF EXISTS "ProfileValue_userId_columnId_key";
CREATE UNIQUE INDEX "ProfileValue_userId_columnId_repeatIndex_key"
  ON "ProfileValue"("userId", "columnId", "repeatIndex");
