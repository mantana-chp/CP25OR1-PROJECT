-- CreateTable
CREATE TABLE "health_logs" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DECIMAL,
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_logs_pet_id_idx" ON "health_logs"("pet_id");

-- CreateIndex
CREATE INDEX "health_logs_created_by_user_id_idx" ON "health_logs"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
