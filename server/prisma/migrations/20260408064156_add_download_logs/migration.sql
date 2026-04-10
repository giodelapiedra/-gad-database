-- CreateTable
CREATE TABLE "download_logs" (
    "id" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "download_logs_fileType_idx" ON "download_logs"("fileType");

-- CreateIndex
CREATE INDEX "download_logs_createdAt_idx" ON "download_logs"("createdAt");

-- CreateIndex
CREATE INDEX "download_logs_fileId_idx" ON "download_logs"("fileId");
