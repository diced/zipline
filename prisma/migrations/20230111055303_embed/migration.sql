/*
  Warnings:

  - You are about to drop the column `embedColor` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `embedSiteName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `embedTitle` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "embedColor",
DROP COLUMN "embedSiteName",
DROP COLUMN "embedTitle",
ADD COLUMN     "embed" JSONB NOT NULL DEFAULT '{}';
