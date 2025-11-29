/*
  Warnings:

  - You are about to drop the column `provider` on the `push_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `revoked_at` on the `push_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `push_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the `reminder_categories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name_th]` on the table `species` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name_th` to the `breeds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_th` to the `species` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "category_name" AS ENUM ('ทั่วไป', 'วัคซีน', 'ตรวจสุขภาพ', 'ยา/อาหารเสริม', 'พยาธิ/เห็บหมัด', 'ความสะอาดและกรูมมิ่ง', 'ให้อาหาร');

-- CreateEnum
CREATE TYPE "VaccineLogicType" AS ENUM ('UNTIL_AGE', 'FIXED_COUNT');

-- CreateEnum
CREATE TYPE "VaccineCategory" AS ENUM ('core', 'non_core');

-- DropForeignKey
ALTER TABLE "pet_health_dev"."reminders" DROP CONSTRAINT "reminders_category_id_fkey";

-- AlterTable
ALTER TABLE "breeds" ADD COLUMN     "description_th" TEXT,
ADD COLUMN     "name_th" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "push_tokens" DROP COLUMN "provider",
DROP COLUMN "revoked_at",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "category_id",
ADD COLUMN     "category_name" "category_name" NOT NULL DEFAULT 'ทั่วไป',
ADD COLUMN     "is_health" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_id" UUID;

-- AlterTable
ALTER TABLE "species" ADD COLUMN     "description_th" TEXT,
ADD COLUMN     "name_th" VARCHAR NOT NULL;

-- DropTable
DROP TABLE "pet_health_dev"."reminder_categories";

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" SERIAL NOT NULL,
    "species_id" UUID NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "vaccine_name_th" TEXT,
    "vaccine_type" "VaccineCategory" NOT NULL,
    "min_age_days" INTEGER NOT NULL DEFAULT 0,
    "primary_series_logic" "VaccineLogicType" NOT NULL,
    "primary_interval_days" INTEGER NOT NULL DEFAULT 0,
    "primary_target_value" INTEGER NOT NULL,
    "adult_primary_dose_count" INTEGER NOT NULL DEFAULT 1,
    "booster_1_interval_days" INTEGER NOT NULL,
    "booster_repeat_interval_days" INTEGER NOT NULL,
    "reference_source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_species_id_vaccine_name_key" ON "Vaccine"("species_id", "vaccine_name");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_th_key" ON "species"("name_th");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccine" ADD CONSTRAINT "Vaccine_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
