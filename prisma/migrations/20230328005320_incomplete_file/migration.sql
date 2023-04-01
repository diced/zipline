-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE');

-- CreateTable
CREATE TABLE "IncompleteFile" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ProcessingStatus" NOT NULL,
    "chunks" INTEGER NOT NULL,
    "chunksComplete" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "IncompleteFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IncompleteFile" ADD CONSTRAINT "IncompleteFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
