/*
  Warnings:

  - Added the required column `template_start_date` to the `recurrences` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recurrences" ADD COLUMN     "template_start_date" DATE NOT NULL;
