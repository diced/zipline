-- AlterTable
ALTER TABLE "Zipline" ADD COLUMN     "filesEnforcedExpiration" TEXT,
ADD COLUMN     "filesEnforcedExpirationEnabled" BOOLEAN NOT NULL DEFAULT false;
