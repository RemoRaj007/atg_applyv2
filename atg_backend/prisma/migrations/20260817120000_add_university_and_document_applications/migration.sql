-- The university/scholarship and visa/document features shipped with routers,
-- controllers and services mounted in app.js, but the tables and the User
-- columns they read never existed. Every one of the twelve endpoints answered
-- 500 ("Cannot read properties of undefined (reading 'findMany')") because
-- `prisma.universityApplication` / `prisma.documentApplication` were undefined.

-- Package entitlements. Both flows are gated on their own flag, and the
-- university flow keeps its own counter: `appsUsed` only ever counts job
-- applications, so reusing it would have made a university application consume
-- a job-application credit.
ALTER TABLE "User" ADD COLUMN "hasUniversityPackage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "universityAppsUsed"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "hasDocumentPackage"   BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UniversityApplication" (
  "id"                SERIAL       NOT NULL,
  "userId"            INTEGER      NOT NULL,
  "universityName"    TEXT         NOT NULL,
  "programName"       TEXT         NOT NULL,
  "applicationStatus" TEXT         NOT NULL DEFAULT 'pending',
  "submissionDate"    TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "d_status"          TEXT         NOT NULL DEFAULT 'active',

  CONSTRAINT "UniversityApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UniversityApplication_userId_d_status_idx"
  ON "UniversityApplication" ("userId", "d_status");
CREATE INDEX "UniversityApplication_d_status_createdAt_idx"
  ON "UniversityApplication" ("d_status", "createdAt");

CREATE TABLE "DocumentApplication" (
  "id"             SERIAL       NOT NULL,
  "userId"         INTEGER      NOT NULL,
  "documentType"   TEXT         NOT NULL,
  "status"         TEXT         NOT NULL DEFAULT 'pending',
  "submissionDate" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "d_status"       TEXT         NOT NULL DEFAULT 'active',

  CONSTRAINT "DocumentApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentApplication_userId_d_status_idx"
  ON "DocumentApplication" ("userId", "d_status");
CREATE INDEX "DocumentApplication_d_status_createdAt_idx"
  ON "DocumentApplication" ("d_status", "createdAt");

-- Cascade: both rows are wholly owned by the applicant and carry no operator
-- state worth keeping once the account is gone.
ALTER TABLE "UniversityApplication"
  ADD CONSTRAINT "UniversityApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentApplication"
  ADD CONSTRAINT "DocumentApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drift repair. 20260814140000 created the job dedupe index with a WHERE
-- clause, which Prisma's schema language cannot express, so the schema declared
-- a plain @@index instead and `migrate diff` reported a pending change on every
-- run — the database and the schema could never agree.
--
-- The predicate was redundant: it excluded exactly the rows (NULL source or
-- NULL id) that a unique index already ignores, because Postgres treats every
-- NULL as distinct. Replacing it with an unconditional unique index therefore
-- constrains the same rows as before, and the schema can now describe it.
DROP INDEX IF EXISTS "Job_externalSource_externalId_key";
DROP INDEX IF EXISTS "Job_externalSource_externalId_idx";
CREATE UNIQUE INDEX "Job_externalSource_externalId_key"
  ON "Job" ("externalSource", "externalId");
