-- Create enums
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'MAXIMUM');
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS');
CREATE TYPE "WorkPackageStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ON_HOLD');

CREATE TABLE "Department" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "EmployeeProfile" (
  "employeeId" TEXT PRIMARY KEY,
  "employeeName" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "hourlyCost" DOUBLE PRECISION NOT NULL,
  "weeklyCapacityHours" INTEGER NOT NULL,
  "workLocationCountryCode" TEXT NOT NULL,
  "workLocationSubdivisionCode" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
);

CREATE TABLE "EmployeeAbsence" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "reason" TEXT NOT NULL,
  FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("employeeId")
);

CREATE TABLE "Project" (
  "id" TEXT PRIMARY KEY,
  "projectName" TEXT NOT NULL,
  "projectCode" TEXT NOT NULL UNIQUE,
  "colorHex" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "WorkPackage" (
  "id" TEXT PRIMARY KEY,
  "departmentId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "earliestStartDate" TIMESTAMP NOT NULL,
  "deadlineDate" TIMESTAMP NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "scheduledStartDate" TIMESTAMP NOT NULL,
  "scheduledEndDateExclusive" TIMESTAMP NOT NULL,
  "priority" "Priority" NOT NULL,
  "projectId" TEXT NOT NULL,
  "status" "WorkPackageStatus" NOT NULL,
  "workLocationCountryCode" TEXT,
  "workLocationSubdivisionCode" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id"),
  FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("employeeId"),
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
);

CREATE TABLE "TaskDependency" (
  "id" TEXT PRIMARY KEY,
  "predecessorTaskId" TEXT NOT NULL,
  "successorTaskId" TEXT NOT NULL,
  "type" "DependencyType" NOT NULL,
  FOREIGN KEY ("predecessorTaskId") REFERENCES "WorkPackage"("id"),
  FOREIGN KEY ("successorTaskId") REFERENCES "WorkPackage"("id")
);

CREATE TABLE "SchedulingEvent" (
  "id" TEXT PRIMARY KEY,
  "workPackageId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id")
);
