-- The candidate profile grows from eight hard-coded steps into the 20-chapter
-- ATG Apply question catalogue. Chapters become rows rather than a frontend
-- constant, so the catalogue can be re-seeded without a deploy, and each
-- question carries the handling rules the catalogue assigns it.

CREATE TABLE "ProfileSection" (
  "id"        SERIAL       NOT NULL,
  "code"      TEXT         NOT NULL,
  "title"     TEXT         NOT NULL,
  "sortOrder" INTEGER      NOT NULL DEFAULT 0,
  "active"    BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProfileSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileSection_code_key" ON "ProfileSection" ("code");
CREATE INDEX "ProfileSection_sortOrder_idx" ON "ProfileSection" ("sortOrder");

-- Catalogue metadata. Every column is nullable or defaulted: the admin-managed
-- ProfileColumn rows that predate the catalogue have no field code and stay
-- valid, so this migration does not rewrite existing data.
ALTER TABLE "ProfileColumn" ADD COLUMN "code" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sectionId" INTEGER;
ALTER TABLE "ProfileColumn" ADD COLUMN "helpText" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "purpose" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sensitivity" TEXT NOT NULL DEFAULT 'CAREER';
ALTER TABLE "ProfileColumn" ADD COLUMN "externalAiPolicy" TEXT NOT NULL DEFAULT 'NO';
ALTER TABLE "ProfileColumn" ADD COLUMN "defaultApplicationUse" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "validation" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "repeatableGroup" TEXT;
ALTER TABLE "ProfileColumn" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProfileColumn" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "ProfileColumn_code_key" ON "ProfileColumn" ("code");
CREATE INDEX "ProfileColumn_sectionId_sortOrder_idx" ON "ProfileColumn" ("sectionId", "sortOrder");
CREATE INDEX "ProfileColumn_repeatableGroup_idx" ON "ProfileColumn" ("repeatableGroup");

ALTER TABLE "ProfileColumn"
  ADD CONSTRAINT "ProfileColumn_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "ProfileSection" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Education, employment, project and reference questions are asked once per
-- entry. The schema stores one copy of each question and repeatIndex separates
-- the entries, so a candidate is not capped at the catalogue's three education
-- and four employment slots.
ALTER TABLE "ProfileValue" ADD COLUMN "repeatIndex" INTEGER NOT NULL DEFAULT 0;

-- Existing answers all become entry 0, so widening the key cannot collide.
DROP INDEX IF EXISTS "ProfileValue_userId_columnId_key";
CREATE UNIQUE INDEX "ProfileValue_userId_columnId_repeatIndex_key"
  ON "ProfileValue" ("userId", "columnId", "repeatIndex");
