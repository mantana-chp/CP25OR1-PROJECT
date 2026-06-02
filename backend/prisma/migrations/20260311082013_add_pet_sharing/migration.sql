-- CreateEnum
CREATE TYPE "invite_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "owner_caregiver_contacts" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "caregiver_user_id" UUID NOT NULL,
    "alias" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_caregiver_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_share_invites" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "caregiver_alias" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "invite_status" NOT NULL DEFAULT 'PENDING',
    "claimed_by" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_share_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_user_access" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'CAREGIVER',
    "contact_id" UUID NOT NULL,
    "granted_by" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "invite_id" UUID,
    "installation_id" VARCHAR,

    CONSTRAINT "pet_user_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_caregiver_contacts_owner_user_id_caregiver_user_id_key" ON "owner_caregiver_contacts"("owner_user_id", "caregiver_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pet_user_access_pet_id_user_id_key" ON "pet_user_access"("pet_id", "user_id");

-- AddForeignKey
ALTER TABLE "owner_caregiver_contacts" ADD CONSTRAINT "owner_caregiver_contacts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_caregiver_contacts" ADD CONSTRAINT "owner_caregiver_contacts_caregiver_user_id_fkey" FOREIGN KEY ("caregiver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_share_invites" ADD CONSTRAINT "pet_share_invites_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_share_invites" ADD CONSTRAINT "pet_share_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_share_invites" ADD CONSTRAINT "pet_share_invites_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_user_access" ADD CONSTRAINT "pet_user_access_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_user_access" ADD CONSTRAINT "pet_user_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_user_access" ADD CONSTRAINT "pet_user_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_user_access" ADD CONSTRAINT "pet_user_access_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "owner_caregiver_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_user_access" ADD CONSTRAINT "pet_user_access_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "pet_share_invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
