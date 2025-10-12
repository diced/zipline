-- AlterTable
ALTER TABLE "Zipline" ADD COLUMN     "filesMountDomain" TEXT,
ADD COLUMN     "filesMountEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "filesMountHost" TEXT,
ADD COLUMN     "filesMountPassword" TEXT,
ADD COLUMN     "filesMountPath" TEXT,
ADD COLUMN     "filesMountPort" INTEGER,
ADD COLUMN     "filesMountType" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "filesMountUsername" TEXT;
