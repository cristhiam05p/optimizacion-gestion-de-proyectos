ALTER TYPE "DependencyType" ADD VALUE IF NOT EXISTS 'FF';
ALTER TYPE "DependencyType" ADD VALUE IF NOT EXISTS 'SF';

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "estimatedEndDate" TIMESTAMP(3);

UPDATE "Project" p
SET "startDate" = COALESCE(wp."minStart", NOW()),
    "estimatedEndDate" = COALESCE(wp."maxEnd", NOW() + INTERVAL '30 days')
FROM (
  SELECT "projectId", MIN("scheduledStartDate") AS "minStart", MAX("scheduledEndDateExclusive") - INTERVAL '1 day' AS "maxEnd"
  FROM "WorkPackage"
  GROUP BY "projectId"
) wp
WHERE p.id = wp."projectId"
  AND (p."startDate" IS NULL OR p."estimatedEndDate" IS NULL);

UPDATE "Project"
SET "startDate" = COALESCE("startDate", NOW()),
    "estimatedEndDate" = COALESCE("estimatedEndDate", NOW() + INTERVAL '30 days');

ALTER TABLE "Project" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "estimatedEndDate" SET NOT NULL;

ALTER TABLE "TaskDependency" ADD COLUMN IF NOT EXISTS "offsetDays" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "TaskDependency_predecessorTaskId_successorTaskId_type_key" ON "TaskDependency"("predecessorTaskId", "successorTaskId", "type");
