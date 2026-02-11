/*
  Warnings:

  - You are about to drop the column `reminder_id` on the `recurrences` table. All the data in the column will be lost.
  - You are about to drop the column `recurring_template_id` on the `reminders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RecurrenceStatusEnum" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "recurrences" DROP CONSTRAINT "recurrences_reminder_id_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_recurring_template_id_fkey";

-- DropIndex
DROP INDEX "recurrences_reminder_id_key";

-- AlterTable
ALTER TABLE "recurrences" DROP COLUMN "reminder_id",
ADD COLUMN     "category_name" "category_name",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "recurrence_status" "RecurrenceStatusEnum" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "reminder_name" VARCHAR;

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "recurring_template_id",
ADD COLUMN     "recurrence_id" UUID;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "recurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
