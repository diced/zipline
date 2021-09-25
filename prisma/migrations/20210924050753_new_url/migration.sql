-- CreateTable
CREATE TABLE "Url" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Url_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvisibleUrl" (
    "id" SERIAL NOT NULL,
    "invis" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,

    CONSTRAINT "InvisibleUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Url_id_key" ON "Url"("id");

-- CreateIndex
CREATE UNIQUE INDEX "InvisibleUrl_invis_key" ON "InvisibleUrl"("invis");

-- CreateIndex
CREATE UNIQUE INDEX "InvisibleUrl_urlId_unique" ON "InvisibleUrl"("urlId");

-- AddForeignKey
ALTER TABLE "Url" ADD CONSTRAINT "Url_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvisibleUrl" ADD CONSTRAINT "InvisibleUrl_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
