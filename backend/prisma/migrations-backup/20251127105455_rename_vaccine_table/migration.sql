/*
  Warnings:

  - You are about to drop the `Vaccine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "pet_health_dev"."Vaccine" DROP CONSTRAINT "Vaccine_species_id_fkey";

-- DropTable
DROP TABLE "pet_health_dev"."Vaccine";

-- CreateTable
CREATE TABLE "vaccine" (
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

    CONSTRAINT "vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_species_id_vaccine_name_key" ON "vaccine"("species_id", "vaccine_name");

-- AddForeignKey
ALTER TABLE "vaccine" ADD CONSTRAINT "vaccine_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
