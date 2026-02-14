-- CreateTable
CREATE TABLE "user_farms" (
    "user_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_farms_pkey" PRIMARY KEY ("user_id","farm_id")
);

-- CreateIndex
CREATE INDEX "user_farms_user_id_idx" ON "user_farms"("user_id");

-- CreateIndex
CREATE INDEX "user_farms_farm_id_idx" ON "user_farms"("farm_id");

-- AddForeignKey
ALTER TABLE "user_farms" ADD CONSTRAINT "user_farms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_farms" ADD CONSTRAINT "user_farms_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
