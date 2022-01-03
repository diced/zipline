-- CreateTable
CREATE TABLE "Stats" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("id")
);
