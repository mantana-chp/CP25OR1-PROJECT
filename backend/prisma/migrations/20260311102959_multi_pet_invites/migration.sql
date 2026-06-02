/*
  Warnings:

  - You are about to drop the column `pet_id` on the `pet_share_invites` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "pet_share_invites" DROP CONSTRAINT "pet_share_invites_pet_id_fkey";

-- AlterTable
ALTER TABLE "pet_share_invites" DROP COLUMN "pet_id";

-- CreateTable
CREATE TABLE "pet_share_invite_pets" (
    "invite_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,

    CONSTRAINT "pet_share_invite_pets_pkey" PRIMARY KEY ("invite_id","pet_id")
);

-- AddForeignKey
ALTER TABLE "pet_share_invite_pets" ADD CONSTRAINT "pet_share_invite_pets_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "pet_share_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_share_invite_pets" ADD CONSTRAINT "pet_share_invite_pets_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
