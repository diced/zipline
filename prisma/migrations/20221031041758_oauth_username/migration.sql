/*
  Warnings:

  - Added the required column `username` to the `OAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OAuth" ADD COLUMN     "username" TEXT NOT NULL;
