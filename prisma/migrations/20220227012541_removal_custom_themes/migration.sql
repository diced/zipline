/*
  Warnings:
  - You are about to drop the `Theme` table. If the table is not empty, all the data it contains will be lost.
*/
-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_userId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "systemTheme" SET DEFAULT E'system';

-- DropTable
DROP TABLE "Theme";