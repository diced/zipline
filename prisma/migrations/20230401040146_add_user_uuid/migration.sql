/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "OAuth" DROP CONSTRAINT "OAuth_userId_fkey";

-- AlterTable
ALTER TABLE "OAuth" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("cuid");

-- AddForeignKey
ALTER TABLE "OAuth" ADD CONSTRAINT "OAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("cuid") ON DELETE CASCADE ON UPDATE CASCADE;
