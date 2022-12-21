/*
  Warnings:

  - You are about to drop the column `embedColor` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `embedSiteName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `embedTitle` on the `User` table. All the data in the column will be lost.

*/

-- CreateTable
CREATE TABLE "UserEmbed" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2f3136',
    "siteName" TEXT DEFAULT '{image.file} • {user.username}',
    "description" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserEmbed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmbed_userId_key" ON "UserEmbed"("userId");

-- AddForeignKey
ALTER TABLE "UserEmbed" ADD CONSTRAINT "UserEmbed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move Data
INSERT INTO "UserEmbed" ("title", "color", "siteName", "userId")
SELECT "embedTitle", "embedColor", "embedSiteName", "id"
FROM "User";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "embedColor",
DROP COLUMN "embedSiteName",
DROP COLUMN "embedTitle";
