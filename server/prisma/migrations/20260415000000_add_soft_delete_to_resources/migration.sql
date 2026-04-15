-- AlterTable: add soft-delete column to resource_folders
ALTER TABLE "resource_folders" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: add soft-delete column to resource_files
ALTER TABLE "resource_files" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "resource_folders_deletedAt_idx" ON "resource_folders"("deletedAt");

-- CreateIndex
CREATE INDEX "resource_files_deletedAt_idx" ON "resource_files"("deletedAt");
