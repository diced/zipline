/*
  Warnings:

  - You are about to drop the column `oauth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `oauthAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `oauthProvider` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "oauthProviders" AS ENUM ('DISCORD', 'GITHUB');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "oauth",
DROP COLUMN "oauthAccessToken",
DROP COLUMN "oauthProvider";

-- CreateTable
CREATE TABLE "oauth" (
    "id" SERIAL NOT NULL,
    "provider" "oauthProviders" NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "oauth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_key" ON "oauth"("provider");

-- AddForeignKey
ALTER TABLE "oauth" ADD CONSTRAINT "oauth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
