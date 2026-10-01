-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('SEMINAR', 'WORKSHOP', 'WEBINAR', 'FORUM', 'CONFERENCE');

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TrainingType" NOT NULL DEFAULT 'SEMINAR',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "venue" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "targetParticipants" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainings_isPublished_startDate_idx" ON "trainings"("isPublished", "startDate");

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
