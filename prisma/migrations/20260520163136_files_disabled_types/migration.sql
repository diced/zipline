-- AlterTable
ALTER TABLE "public"."Zipline" ADD COLUMN     "filesDisabledTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "filesDisabledTypesDefault" TEXT;
