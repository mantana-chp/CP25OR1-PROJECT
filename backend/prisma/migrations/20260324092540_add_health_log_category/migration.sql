/*
  Warnings:

  - Added the required column `category` to the `health_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HealthLogCategory" AS ENUM ('WEIGHT', 'SYMPTOMS', 'BEHAVIOR');

-- AlterTable
ALTER TABLE "health_logs" ADD COLUMN     "category" "HealthLogCategory" NOT NULL;
