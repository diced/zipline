/*
  Warnings:

  - A unique constraint covering the columns `[provider,oauthId]` on the table `OAuth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `oauthId` to the `OAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OAuth" ADD COLUMN     "oauthId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OAuth_provider_oauthId_key" ON "OAuth"("provider", "oauthId");
