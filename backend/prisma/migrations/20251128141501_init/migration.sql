-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('phone', 'tablet', 'other');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('sent', 'pending', 'failed');

-- CreateEnum
CREATE TYPE "pet_gender" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "platform" AS ENUM ('ios', 'android', 'other');

-- CreateEnum
CREATE TYPE "platform_id_source" AS ENUM ('ios_keychain', 'android_ssaid', 'unknown');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('to_do', 'done', 'overdue');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "category_name" AS ENUM ('ทั่วไป', 'วัคซีน', 'ตรวจสุขภาพ', 'ยา/อาหารเสริม', 'พยาธิ/เห็บหมัด', 'ความสะอาดและกรูมมิ่ง', 'ให้อาหาร');

-- CreateEnum
CREATE TYPE "VaccineLogicType" AS ENUM ('UNTIL_AGE', 'FIXED_COUNT');

-- CreateEnum
CREATE TYPE "VaccineCategory" AS ENUM ('core', 'non_core');

-- CreateTable
CREATE TABLE "breeds" (
    "id" UUID NOT NULL,
    "species_id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "name_th" VARCHAR NOT NULL,
    "description_th" TEXT,

    CONSTRAINT "breeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reminder_id" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "status" "notification_status" NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "species_id" UUID NOT NULL,
    "breed_id" UUID,
    "pet_name" VARCHAR NOT NULL,
    "gender" "pet_gender" NOT NULL DEFAULT 'unknown',
    "birth_date" DATE,
    "weight" DECIMAL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "reminder_name" VARCHAR NOT NULL,
    "description" TEXT,
    "reminder_date" DATE NOT NULL,
    "reminder_time" TIME(6),
    "reminder_status" "reminder_status" NOT NULL DEFAULT 'to_do',
    "status_done_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "status_before_done" "reminder_status",
    "category_name" "category_name" NOT NULL DEFAULT 'ทั่วไป',
    "is_health" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" UUID,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "jti" TEXT NOT NULL,
    "device_installation_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "replaced_by" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "name_th" VARCHAR NOT NULL,
    "description_th" TEXT,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "current_installation_id" TEXT NOT NULL,
    "current_platform" "platform" NOT NULL,
    "current_platform_device_id" TEXT NOT NULL,
    "current_platform_id_source" "platform_id_source" NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_jti_key" ON "sessions"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_th_key" ON "species"("name_th");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_species_id_vaccine_name_key" ON "vaccine"("species_id", "vaccine_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_current_installation_id_key" ON "users"("current_installation_id");

-- AddForeignKey
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_breed_id_fkey" FOREIGN KEY ("breed_id") REFERENCES "breeds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccine" ADD CONSTRAINT "vaccine_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
