/*
  Warnings:

  - You are about to drop the column `format` on the `File` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "format";

-- DropEnum
DROP TYPE "FileNameFormat";
