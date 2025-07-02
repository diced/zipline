-- AlterTable
ALTER TABLE "Zipline" ADD COLUMN     "domains" TEXT[] DEFAULT ARRAY[]::TEXT[];
