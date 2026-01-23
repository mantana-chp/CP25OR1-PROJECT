-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "pet_id" UUID;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
