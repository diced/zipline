/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- PRISMA GENERATED BELOW
-- -- DropForeignKey
-- ALTER TABLE "OAuth" DROP CONSTRAINT "OAuth_userId_fkey";
--
-- -- AlterTable
-- ALTER TABLE "OAuth" ALTER COLUMN "userId" SET DATA TYPE TEXT;
--
-- -- AlterTable
-- ALTER TABLE "User" ADD COLUMN     "uuid" UUID NOT NULL DEFAULT gen_random_uuid();
--
-- -- CreateIndex
-- CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");
--
-- -- AddForeignKey
-- ALTER TABLE "OAuth" ADD CONSTRAINT "OAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- User made changes below

-- Rename old foreign key
ALTER TABLE "OAuth" RENAME CONSTRAINT "OAuth_userId_fkey" TO "OAuth_userId_old_fkey";

-- Rename old column
ALTER TABLE "OAuth" RENAME COLUMN "userId" TO "userId_old";

-- Add new column
ALTER TABLE "OAuth" ADD COLUMN "userId" UUID;

-- Add user uuid
ALTER TABLE "User" ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid();

-- Update table "OAuth" with uuid
UPDATE "OAuth" SET "userId" = "User"."uuid" FROM "User" WHERE "OAuth"."userId_old" = "User"."id";

-- Alter table "OAuth" to make "userId" required
ALTER TABLE "OAuth" ALTER COLUMN "userId" SET NOT NULL;

-- Create index
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- Add new foreign key
ALTER TABLE "OAuth" ADD CONSTRAINT "OAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old foreign key
ALTER TABLE "OAuth" DROP CONSTRAINT "OAuth_userId_old_fkey";

-- Drop old column
ALTER TABLE "OAuth" DROP COLUMN "userId_old";