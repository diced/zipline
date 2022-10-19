-- CreateTable
CREATE TABLE "Limit" (
    "id" SERIAL NOT NULL,
    "type_time" TEXT NOT NULL DEFAULT 'daily',
    "limit_by" TEXT NOT NULL DEFAULT 'count',
    "limit" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Limit_userId_key" ON "Limit"("userId");

-- AddForeignKey
ALTER TABLE "Limit" ADD CONSTRAINT "Limit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
