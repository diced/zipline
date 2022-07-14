-- AlterTable
ALTER TABLE "Invite" ALTER COLUMN "expires_at" DROP NOT NULL,
ALTER COLUMN "expires_at" DROP DEFAULT;
