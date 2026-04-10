-- CreateTable
CREATE TABLE "resource_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "folderId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_folders_parentId_idx" ON "resource_folders"("parentId");

-- CreateIndex
CREATE INDEX "resource_files_folderId_idx" ON "resource_files"("folderId");

-- AddForeignKey
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "resource_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "resource_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
