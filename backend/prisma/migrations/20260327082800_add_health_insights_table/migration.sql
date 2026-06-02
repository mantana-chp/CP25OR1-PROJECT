-- CreateEnum
CREATE TYPE "HealthInsightType" AS ENUM ('RECURRING_SYMPTOM', 'ABNORMAL_SYMPTOM', 'RAPID_WEIGHT_LOSS', 'RAPID_WEIGHT_GAIN', 'RECURRING_BEHAVIOR', 'NO_RECENT_LOGS', 'FOLLOW_UP_REMINDER');

-- CreateEnum
CREATE TYPE "HealthInsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "health_insight_id" UUID;

-- CreateTable
CREATE TABLE "health_insights" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "insight_type" "HealthInsightType" NOT NULL,
    "severity" "HealthInsightSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context_data" JSONB NOT NULL,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "health_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_insights_pet_id_idx" ON "health_insights"("pet_id");

-- CreateIndex
CREATE INDEX "health_insights_detected_at_idx" ON "health_insights"("detected_at");

-- CreateIndex
CREATE INDEX "health_insights_insight_type_idx" ON "health_insights"("insight_type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_health_insight_id_fkey" FOREIGN KEY ("health_insight_id") REFERENCES "health_insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_insights" ADD CONSTRAINT "health_insights_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
