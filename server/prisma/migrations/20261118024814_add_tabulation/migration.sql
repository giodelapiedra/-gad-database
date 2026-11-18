-- CreateEnum
CREATE TYPE "TabulationRankingMethod" AS ENUM ('AVERAGE', 'RANK_SUM');

-- CreateEnum
CREATE TYPE "TabulationContestStatus" AS ENUM ('SETUP', 'SCORING', 'FINALIZED');

-- CreateTable
CREATE TABLE "tabulation_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "eventDate" DATE NOT NULL,
    "venue" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabulation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabulation_contests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contestantLabel" TEXT NOT NULL DEFAULT 'Contestant',
    "rankingMethod" "TabulationRankingMethod" NOT NULL DEFAULT 'AVERAGE',
    "status" "TabulationContestStatus" NOT NULL DEFAULT 'SETUP',
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabulation_contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabulation_criteria" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weight" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tabulation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabulation_contestants" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tabulation_contestants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabulation_judges" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "judgeNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tabulation_judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabulation_scores" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabulation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tabulation_events_isPublished_eventDate_idx" ON "tabulation_events"("isPublished", "eventDate");

-- CreateIndex
CREATE INDEX "tabulation_contests_eventId_sortOrder_idx" ON "tabulation_contests"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "tabulation_criteria_contestId_sortOrder_idx" ON "tabulation_criteria"("contestId", "sortOrder");

-- CreateIndex
CREATE INDEX "tabulation_contestants_contestId_number_idx" ON "tabulation_contestants"("contestId", "number");

-- CreateIndex
CREATE INDEX "tabulation_judges_contestId_judgeNo_idx" ON "tabulation_judges"("contestId", "judgeNo");

-- CreateIndex
CREATE INDEX "tabulation_scores_contestId_idx" ON "tabulation_scores"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "tabulation_scores_judgeId_contestantId_criterionId_key" ON "tabulation_scores"("judgeId", "contestantId", "criterionId");

-- AddForeignKey
ALTER TABLE "tabulation_events" ADD CONSTRAINT "tabulation_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_contests" ADD CONSTRAINT "tabulation_contests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "tabulation_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_criteria" ADD CONSTRAINT "tabulation_criteria_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "tabulation_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_contestants" ADD CONSTRAINT "tabulation_contestants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "tabulation_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_judges" ADD CONSTRAINT "tabulation_judges_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "tabulation_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_scores" ADD CONSTRAINT "tabulation_scores_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "tabulation_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_scores" ADD CONSTRAINT "tabulation_scores_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "tabulation_judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_scores" ADD CONSTRAINT "tabulation_scores_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "tabulation_contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabulation_scores" ADD CONSTRAINT "tabulation_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "tabulation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
