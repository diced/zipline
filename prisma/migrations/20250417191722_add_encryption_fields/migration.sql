-- AlterTable
ALTER TABLE "File" ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalSize" BIGINT;
