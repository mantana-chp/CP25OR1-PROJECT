-- CreateEnum
CREATE TYPE "pet_status" AS ENUM ('ACTIVE', 'DECEASED', 'DELETED');

-- CreateEnum
CREATE TYPE "deletion_reason" AS ENUM ('JUST_DELETE', 'DECEASED');

-- AlterEnum
ALTER TYPE "reminder_status" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "pets" ADD COLUMN     "deceased_date" DATE,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deletion_reason" "deletion_reason",
ADD COLUMN     "status" "pet_status" NOT NULL DEFAULT 'ACTIVE';
