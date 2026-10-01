-- AlterTable
ALTER TABLE "submission_comments" ADD COLUMN "section" TEXT,
ADD COLUMN "rowNumber" INTEGER,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedById" TEXT;

-- AddForeignKey
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
