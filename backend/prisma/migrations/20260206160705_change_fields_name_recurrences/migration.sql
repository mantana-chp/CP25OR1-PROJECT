/*
  Warnings:

  - You are about to drop the column `dayOfMonth` on the `recurrences` table. All the data in the column will be lost.
  - You are about to drop the column `daysOfWeek` on the `recurrences` table. All the data in the column will be lost.
  - You are about to drop the column `endAfterOccurrences` on the `recurrences` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `recurrences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "recurrences" DROP COLUMN "dayOfMonth",
DROP COLUMN "daysOfWeek",
DROP COLUMN "endAfterOccurrences",
DROP COLUMN "endDate",
ADD COLUMN     "day_of_month" INTEGER,
ADD COLUMN     "days_of_week" INTEGER,
ADD COLUMN     "end_after_occurrences" INTEGER,
ADD COLUMN     "end_date" DATE;
