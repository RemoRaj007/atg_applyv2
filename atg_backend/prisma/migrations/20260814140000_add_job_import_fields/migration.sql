-- Fields carried by an aggregated job posting that the Job table had nowhere to
-- put, so importing dropped them: the source's own identifier, the pay range,
-- whether the role is remote, and when it was posted at the source (distinct
-- from createdAt, which is when we imported it).
--
-- externalSource + externalId is the dedupe key for re-running an import: the
-- pair is stable per posting at the origin, while jobUrl is not (tracking
-- parameters, redirects, and mirrored postings all vary it).
ALTER TABLE "Job" ADD COLUMN "externalSource" TEXT;
ALTER TABLE "Job" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Job" ADD COLUMN "isRemote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "datePosted" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "salaryMin" DECIMAL(12,2);
ALTER TABLE "Job" ADD COLUMN "salaryMax" DECIMAL(12,2);
ALTER TABLE "Job" ADD COLUMN "salaryCurrency" TEXT;
ALTER TABLE "Job" ADD COLUMN "salaryInterval" TEXT;

-- Partial: rows created by hand have both columns NULL, and Postgres treats
-- every NULL as distinct anyway — the index only needs to constrain imports.
CREATE UNIQUE INDEX "Job_externalSource_externalId_key"
  ON "Job" ("externalSource", "externalId")
  WHERE "externalSource" IS NOT NULL AND "externalId" IS NOT NULL;
