-- CreateEnum
CREATE TYPE "transfer_token_status" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "pet_transfer_tokens" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "status" "transfer_token_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_by" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_transfer_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_transfer_token_pets" (
    "transfer_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,

    CONSTRAINT "pet_transfer_token_pets_pkey" PRIMARY KEY ("transfer_id","pet_id")
);

-- CreateTable
CREATE TABLE "pet_transfer_audit_logs" (
    "id" UUID NOT NULL,
    "transfer_token_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_transfer_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pet_transfer_tokens_created_by_idx" ON "pet_transfer_tokens"("created_by");

-- CreateIndex
CREATE INDEX "pet_transfer_tokens_status_idx" ON "pet_transfer_tokens"("status");

-- CreateIndex
CREATE INDEX "pet_transfer_audit_logs_pet_id_idx" ON "pet_transfer_audit_logs"("pet_id");

-- CreateIndex
CREATE INDEX "pet_transfer_audit_logs_transfer_token_id_idx" ON "pet_transfer_audit_logs"("transfer_token_id");

-- AddForeignKey
ALTER TABLE "pet_transfer_tokens" ADD CONSTRAINT "pet_transfer_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_transfer_tokens" ADD CONSTRAINT "pet_transfer_tokens_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_transfer_token_pets" ADD CONSTRAINT "pet_transfer_token_pets_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "pet_transfer_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_transfer_token_pets" ADD CONSTRAINT "pet_transfer_token_pets_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_transfer_audit_logs" ADD CONSTRAINT "pet_transfer_audit_logs_transfer_token_id_fkey" FOREIGN KEY ("transfer_token_id") REFERENCES "pet_transfer_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
