-- AlterTable
ALTER TABLE "Zipline" ADD COLUMN     "filesEnforcedExpirationBypassAdmins" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "filesEnforcedExpirationBypassUsers" TEXT[];
