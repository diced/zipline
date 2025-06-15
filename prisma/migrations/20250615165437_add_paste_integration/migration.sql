-- AlterTable
ALTER TABLE "File" ADD COLUMN     "pasteCreatedAt" TIMESTAMP(3),
ADD COLUMN     "pasteId" TEXT,
ADD COLUMN     "pasteUrl" TEXT;
