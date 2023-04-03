/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- Rename old foreign key
ALTER TABLE "OAuth" RENAME CONSTRAINT "OAuth_userId_fkey" TO "OAuth_userId_old_fkey";

-- Rename old column
ALTER TABLE "OAuth" RENAME COLUMN "userId" TO "userId_old";

-- Add new column
ALTER TABLE "OAuth" ADD COLUMN "userId" TEXT;

-- Add user cuid
ALTER TABLE "User" ADD COLUMN "cuid" UNIQUE TEXT;

-- Update table "User" with a uuid
UPDATE "User" SET "cuid" = gen_random_uuid() WHERE "cuid" IS NULL;

-- Alter table "user" to make "cuid" required
ALTER TABLE "User" ALTER COLUMN "cuid" SET NOT NULL;

-- Update table "OAuth" with cuid
UPDATE "OAuth" SET "userId" = "User"."cuid" FROM "User" WHERE "OAuth"."userId_old" = "User"."id";

-- Create index
CREATE UNIQUE INDEX "User_cuid_key" ON "User"("cuid");

-- Add new foreign key
ALTER TABLE "OAuth" ADD CONSTRAINT "OAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("cuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old foreign key
ALTER TABLE "OAuth" DROP CONSTRAINT "OAuth_userId_old_fkey";

-- Drop old column
ALTER TABLE "OAuth" DROP COLUMN "userId_old";