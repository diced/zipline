-- AlterTable
ALTER TABLE "Image" RENAME COLUMN "created_at" TO "createdAt";

-- AlterTable
ALTER TABLE "Image" RENAME COLUMN "expires_at" TO "expiresAt";

-- AlterTable
ALTER TABLE "Image" RENAME COLUMN "file" TO "name";