-- CreateTable
CREATE TABLE "pet_medical_documents" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "object_key" VARCHAR NOT NULL,
    "file_name" VARCHAR NOT NULL,
    "file_type" VARCHAR NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pet_medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pet_medical_documents_object_key_key" ON "pet_medical_documents"("object_key");

-- CreateIndex
CREATE INDEX "pet_medical_documents_pet_id_idx" ON "pet_medical_documents"("pet_id");

-- AddForeignKey
ALTER TABLE "pet_medical_documents" ADD CONSTRAINT "pet_medical_documents_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
