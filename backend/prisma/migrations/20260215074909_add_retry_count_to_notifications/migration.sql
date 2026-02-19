-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;
