-- CreateTable
CREATE TABLE "reminder_attachments" (
    "id" UUID NOT NULL,
    "reminder_id" UUID NOT NULL,
    "object_key" VARCHAR NOT NULL,
    "file_name" VARCHAR NOT NULL,
    "file_type" VARCHAR NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reminder_attachments" ADD CONSTRAINT "reminder_attachments_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
