-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "recurring_template_id" UUID;

-- CreateTable
CREATE TABLE "recurrences" (
    "id" UUID NOT NULL,
    "reminder_id" UUID NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "endDate" DATE,
    "endAfterOccurrences" INTEGER,

    CONSTRAINT "recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurrences_reminder_id_key" ON "recurrences"("reminder_id");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
