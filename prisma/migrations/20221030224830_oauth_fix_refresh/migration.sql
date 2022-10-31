-- DropIndex
DROP INDEX "OAuth_provider_key";

-- AlterTable
ALTER TABLE "OAuth" ADD COLUMN     "refresh" TEXT;
