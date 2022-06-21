/*
  Warnings:

  - You are about to drop the column `ratelimited` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "ratelimited",
ADD COLUMN     "ratelimit" TIMESTAMP(3);
