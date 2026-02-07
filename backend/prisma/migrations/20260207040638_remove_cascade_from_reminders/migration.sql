-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_recurring_template_id_fkey";

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES "reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
