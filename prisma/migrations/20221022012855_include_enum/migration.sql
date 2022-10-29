/*
  Warnings:

  - The `type_time` column on the `Limit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `limit_by` column on the `Limit` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LimitBy" AS ENUM ('COUNT', 'SIZE');

-- AlterTable
ALTER TABLE "Limit" DROP COLUMN "type_time",
ADD COLUMN     "type_time" "LimitType" NOT NULL DEFAULT 'DAILY',
DROP COLUMN "limit_by",
ADD COLUMN     "limit_by" "LimitBy" NOT NULL DEFAULT 'COUNT';
