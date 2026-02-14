/*
  Warnings:

  - You are about to drop the `user_farms` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `company_id` to the `farms` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_farms" DROP CONSTRAINT "user_farms_farm_id_fkey";

-- DropForeignKey
ALTER TABLE "user_farms" DROP CONSTRAINT "user_farms_user_id_fkey";

-- CreateTable (create companies table first)
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Insert default company for existing data
INSERT INTO "companies" ("id", "name", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000099', 'Naturisa', CURRENT_TIMESTAMP);

-- AlterTable (add company_id columns with default value temporarily)
ALTER TABLE "farms" ADD COLUMN "company_id" TEXT;
ALTER TABLE "users" ADD COLUMN "company_id" TEXT;

-- Update existing records to reference the default company
UPDATE "farms" SET "company_id" = '00000000-0000-0000-0000-000000000099';
UPDATE "users" SET "company_id" = '00000000-0000-0000-0000-000000000099';

-- Make company_id NOT NULL for farms
ALTER TABLE "farms" ALTER COLUMN "company_id" SET NOT NULL;

-- DropTable
DROP TABLE "user_farms";

-- CreateIndex
CREATE INDEX "farms_company_id_idx" ON "farms"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
