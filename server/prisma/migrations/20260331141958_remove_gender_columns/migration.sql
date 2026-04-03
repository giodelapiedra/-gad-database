/*
  Warnings:

  - You are about to drop the column `address` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `age` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "records" DROP COLUMN "address",
DROP COLUMN "age",
DROP COLUMN "gender";

-- DropEnum
DROP TYPE "Gender";
